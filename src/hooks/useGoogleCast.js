import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";

const decodeHtmlEntities = (text) => {
  if (!text) return text;
  const entities = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": "\"",
    "&#039;": "'",
    "&#x27;": "'",
    "&#x2F;": "/",
    "&#32;": " ",
    "&#160;": " "
  };
  return text.replace(/&[#\w\d]+;/g, (entity) => entities[entity] || entity);
};

const getArtistNames = (song) => {
  if (!song) return "Unknown Artist";
  return decodeHtmlEntities(
    song.artists?.primary?.map((a) => a.name).join(", ") ||
    (Array.isArray(song.artists) ? song.artists.map((a) => a.name).join(", ") : null) ||
    song.primaryArtists ||
    "Unknown Artist"
  );
};

export function useGoogleCast({
  currentSong,
  isPlaying,
  volume,
  audioRef,
  setCurrentTime,
  setDuration,
  setContextCurrentTime,
  setContextDuration,
  isScrubbingRef,
  lastContextTimeRef,
  onEnded,
}) {
  const [isCasting, setIsCasting] = useState(false);
  const isCastingRef = useRef(false);
  const currentSongRef = useRef(currentSong);
  const lastLoadedUrlRef = useRef(null);
  const hasTriggeredEndedRef = useRef(false);

  const isPlayingRef = useRef(isPlaying);
  const volumeRef = useRef(volume);
  const triggerRemoteLoadRef = useRef(null);
  const lastCastingTimeRef = useRef(0);
  const isSessionInitiatingRef = useRef(false);

  const onEndedRef = useRef(onEnded);
  useEffect(() => {
    onEndedRef.current = onEnded;
  });

  useEffect(() => {
    currentSongRef.current = currentSong;
  }, [currentSong]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  // Poll Chromecast estimated position and duration when casting
  useEffect(() => {
    if (!isCasting) return;

    let intervalId = setInterval(() => {
      try {
        const castContext = window.cast.framework.CastContext.getInstance();
        const session = castContext.getCurrentSession();
        if (session) {
          const mediaSession = session.getMediaSession();
          if (mediaSession) {
            // Get current estimated playback position from TV
            const estTime = mediaSession.getEstimatedTime();
            if (estTime !== undefined && !isNaN(estTime) && estTime >= 0) {
              lastCastingTimeRef.current = estTime;
              if (isScrubbingRef && !isScrubbingRef.current) {
                setCurrentTime(estTime);
                if (lastContextTimeRef && Math.abs(estTime - lastContextTimeRef.current) >= 1.5) {
                  setContextCurrentTime(estTime);
                  lastContextTimeRef.current = estTime;
                }
              }
            }

             // Sync duration from TV
            const mediaInfo = mediaSession.media;
            let currentDuration = 0;
            if (mediaInfo && mediaInfo.duration !== undefined && !isNaN(mediaInfo.duration) && mediaInfo.duration > 0) {
              currentDuration = mediaInfo.duration;
              setDuration(mediaInfo.duration);
              setContextDuration(mediaInfo.duration);
            }

            // 1. Position progress safety check (triggers when playhead reaches the end)
            if (estTime !== undefined && currentDuration > 0 && estTime >= currentDuration - 1.5) {
              if (!hasTriggeredEndedRef.current) {
                hasTriggeredEndedRef.current = true;
                console.log("Cast: song ended via time progress check, skipping...");
                onEndedRef.current?.();
              }
            }

            // 2. Idle state event check
            if (mediaSession.playerState === window.chrome.cast.media.PlayerState.IDLE &&
                mediaSession.idleReason === window.chrome.cast.media.IdleReason.FINISHED) {
              if (!hasTriggeredEndedRef.current) {
                hasTriggeredEndedRef.current = true;
                console.log("Cast: song ended on receiver, triggering next song");
                onEndedRef.current?.();
              }
            }
          }
        }
      } catch (e) {
        console.error("Cast: error polling estimated time:", e);
      }
    }, 500);

    return () => clearInterval(intervalId);
  }, [isCasting, isPlaying, setCurrentTime, setDuration, setContextCurrentTime, setContextDuration, isScrubbingRef, lastContextTimeRef]);

  const triggerRemoteLoad = useCallback((songToLoad) => {
    const song = songToLoad || currentSongRef.current;
    if (!song) return;
    if (typeof window === "undefined") return;
    if (!window.chrome || !window.cast) return;

    try {
      const castContext = window.cast.framework.CastContext.getInstance();
      const session = castContext.getCurrentSession();
      if (!session) {
        console.warn("Cast: triggerRemoteLoad called but no active session");
        return;
      }

      let mediaUrl = song.downloadUrl?.[4]?.url || song.downloadUrl?.[song.downloadUrl.length - 1]?.url || song.url;
      if (!mediaUrl) {
        console.warn("Cast: no mediaUrl found on song, cannot load");
        return;
      }

      // Resolve relative URL to absolute URL (crucial for Chromecast to fetch the media)
      try {
        mediaUrl = new URL(mediaUrl, window.location.origin).href;
      } catch (err) {
        console.error("Cast: error formatting absolute media URL:", err);
        return;
      }

      // If this URL was already loaded in the current session, skip to avoid races
      if (lastLoadedUrlRef.current === mediaUrl) {
        console.log("Cast: media URL already loaded, skipping duplicate:", mediaUrl);
        return;
      }

      // Determine correct MIME type
      let contentType = "audio/mpeg";
      const lowerUrl = mediaUrl.toLowerCase();
      if (lowerUrl.includes(".m4a") || lowerUrl.includes("saavncdn") || lowerUrl.includes(".mp4") || lowerUrl.includes("yt-stream")) {
        contentType = "audio/mp4";
      } else if (lowerUrl.includes(".aac")) {
        contentType = "audio/aac";
      } else if (lowerUrl.includes(".wav")) {
        contentType = "audio/wav";
      } else if (lowerUrl.includes(".ogg")) {
        contentType = "audio/ogg";
      } else if (lowerUrl.includes(".mp3")) {
        contentType = "audio/mpeg";
      }

      const streamType = window.chrome.cast.media.StreamType.BUFFERED;

      console.log("Cast: loading URL:", mediaUrl, "MIME:", contentType, "streamType: BUFFERED");

      const mediaInfo = new window.chrome.cast.media.MediaInfo(mediaUrl, contentType);
      mediaInfo.streamType = streamType;
      mediaInfo.metadata = new window.chrome.cast.media.MusicTrackMediaMetadata();
      mediaInfo.metadata.title = decodeHtmlEntities(song.name || song.title || "");
      mediaInfo.metadata.artist = getArtistNames(song);
      mediaInfo.metadata.albumName = decodeHtmlEntities(song.album?.name || "");
      if (song.image?.[2]?.url) {
        mediaInfo.metadata.images = [new window.chrome.cast.Image(song.image[2].url)];
      } else if (song.image?.[1]?.url) {
        mediaInfo.metadata.images = [new window.chrome.cast.Image(song.image[1].url)];
      }

      const loadRequest = new window.chrome.cast.media.LoadRequest(mediaInfo);
      // Set autoplay to match the phone's current play/pause state
      loadRequest.autoplay = isPlayingRef.current;

      // Determine initial seek time: only hand off and resume from phone currentTime
      // if we are starting/resuming a cast session. Otherwise (new track skips), start from 0.
      const isSessionInitiating = isSessionInitiatingRef.current;
      isSessionInitiatingRef.current = false; // Reset immediately

      const currentLocalTime = (audioRef.current && isSessionInitiating) ? audioRef.current.currentTime : 0;
      loadRequest.currentTime = currentLocalTime > 0.5 ? currentLocalTime : 0;
      lastCastingTimeRef.current = loadRequest.currentTime;

      // Mark URL as loading immediately to block duplicate calls racing in
      lastLoadedUrlRef.current = mediaUrl;
      hasTriggeredEndedRef.current = false; // Reset ended trigger flag for new song

      session.loadMedia(loadRequest).then((loadedMedia) => {
        console.log("Cast: media loaded successfully");
        const ms = loadedMedia || session.getMediaSession();
        if (ms) {
          // Honour the actual play/pause state
          if (!isPlayingRef.current) {
            ms.pause(null, () => {}, () => {});
          }

          // Register update listener to detect song completion instantly
          ms.addUpdateListener((isAlive) => {
            // Check even if isAlive is false, because session transitions to dead on completion
            if (ms.playerState === window.chrome.cast.media.PlayerState.IDLE &&
                ms.idleReason === window.chrome.cast.media.IdleReason.FINISHED) {
              if (!hasTriggeredEndedRef.current) {
                hasTriggeredEndedRef.current = true;
                console.log("Cast: song ended on TV (update listener), skipping to next song");
                onEndedRef.current?.();
              }
            }
          });
        }
      }).catch(err => {
        console.error("Cast: loadMedia failed:", err);
        // Clear the URL guard so we can retry on the next song change
        lastLoadedUrlRef.current = null;
        toast.error("Cast: failed to load media on TV. " + (err?.description || err?.message || JSON.stringify(err)));
      });
    } catch (e) {
      console.error("Cast: unexpected error in triggerRemoteLoad:", e);
    }
  }, [audioRef, toast]);
  // Keep ref current so the stale event-listener closure always calls the live version
  useEffect(() => {
    triggerRemoteLoadRef.current = triggerRemoteLoad;
  });

  // Setup Google Cast session listener
  useEffect(() => {
    if (typeof window === "undefined") return;

    const initCastOptions = () => {
      if (window.cast && window.cast.framework && window.chrome && window.chrome.cast) {
        try {
          const castContext = window.cast.framework.CastContext.getInstance();
          castContext.setOptions({
            receiverApplicationId: window.chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
            autoJoinPolicy: window.chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
          });

          castContext.addEventListener(
            window.cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
            (event) => {
              const audio = audioRef.current;
              switch (event.sessionState) {
                case window.cast.framework.SessionState.SESSION_STARTED:
                  console.log("Cast session started");
                  isCastingRef.current = true;
                  setIsCasting(true);
                  if (audio) {
                    audio.muted = true;
                  }
                  isSessionInitiatingRef.current = true;
                  triggerRemoteLoadRef.current?.(currentSongRef.current);
                  // Pause local audio element to save phone battery and network data
                  if (audio) {
                    audio.pause();
                  }
                  break;
                case window.cast.framework.SessionState.SESSION_START_FAILED:
                  console.log("Cast session start failed");
                  isCastingRef.current = false;
                  setIsCasting(false);
                  lastLoadedUrlRef.current = null;
                  if (audio) {
                    audio.muted = false;
                  }
                  break;
                case window.cast.framework.SessionState.SESSION_RESUMED:
                  console.log("Cast session resumed");
                  isCastingRef.current = true;
                  setIsCasting(true);
                  if (audio) {
                    audio.muted = true;
                  }
                  // Clear the URL guard so SESSION_RESUMED always reloads the current song
                  lastLoadedUrlRef.current = null;
                  isSessionInitiatingRef.current = true;
                  triggerRemoteLoadRef.current?.(currentSongRef.current);
                  // Pause local audio element to save phone battery and network data
                  if (audio) {
                    audio.pause();
                  }
                  break;
                case window.cast.framework.SessionState.SESSION_ENDED:
                  console.log("Cast session ended");
                  isCastingRef.current = false;
                  setIsCasting(false);
                  lastLoadedUrlRef.current = null;
                  if (audio) {
                    audio.muted = false;
                    // Resume locally from the exact position the TV was at
                    if (lastCastingTimeRef.current > 0) {
                      audio.currentTime = lastCastingTimeRef.current;
                      setCurrentTime(lastCastingTimeRef.current);
                    }
                    // Use isPlayingRef so we get the live value, not the stale mount-time value
                    if (isPlayingRef.current) {
                      audio.play().catch(() => {});
                    }
                  }
                  break;
              }
            }
          );
        } catch (e) {
          console.error("Cast SDK init error in useGoogleCast:", e);
        }
      }
    };

    const handleCastApiAvailable = () => {
      initCastOptions();
    };

    if (window.chrome && window.chrome.cast && window.cast && window.cast.framework) {
      initCastOptions();
    } else {
      window.addEventListener("gcastapiavailable", handleCastApiAvailable);

      if (!document.querySelector('script[src*="cast_sender.js"]')) {
        const script = document.createElement("script");
        script.src = "https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1";
        script.async = true;
        document.head.appendChild(script);

        window.__onGCastApiAvailable = (isAvailable) => {
          if (isAvailable) {
            window.__gCastApiAvailable = true;
            window.dispatchEvent(new CustomEvent("gcastapiavailable"));
          }
        };
      } else if (window.__gCastApiAvailable) {
        // If the script is already loaded and marked available by another component
        initCastOptions();
      }
    }

    return () => {
      window.removeEventListener("gcastapiavailable", handleCastApiAvailable);
    };
  }, [audioRef, setCurrentTime]);

  // Extract complex song expressions for static lint checking
  const songId = currentSong?.id;
  const downloadUrl4 = currentSong?.downloadUrl?.[4]?.url;
  const downloadUrlLast = currentSong?.downloadUrl?.[currentSong?.downloadUrl?.length - 1]?.url;
  const songUrl = currentSong?.url;

  useEffect(() => {
    if (isCasting && currentSong) {
      triggerRemoteLoad(currentSong);
    }
  }, [
    songId,
    downloadUrl4,
    downloadUrlLast,
    songUrl,
    isCasting,
    currentSong,
    triggerRemoteLoad,
  ]);

  // Force local audio element to match casting muted state (prevents sound playing on phone/PC while casting)
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isCasting;
    }
  }, [isCasting, currentSong?.id, audioRef]);

  // Sync play/pause state to Chromecast
  useEffect(() => {
    if (!isCasting) return;
    if (typeof window === "undefined") return;
    if (!window.chrome || !window.cast) return;

    try {
      const castContext = window.cast.framework.CastContext.getInstance();
      const session = castContext.getCurrentSession();
      if (session && session.getMediaSession()) {
        const mediaSession = session.getMediaSession();
        if (isPlaying && mediaSession.playerState === window.chrome.cast.media.PlayerState.PAUSED) {
          mediaSession.play();
        } else if (!isPlaying && mediaSession.playerState === window.chrome.cast.media.PlayerState.PLAYING) {
          mediaSession.pause();
        }
      }
    } catch (e) {
      console.error("Error in play/pause Cast sync:", e);
    }
  }, [isPlaying, isCasting]);

  return { isCasting };
}
