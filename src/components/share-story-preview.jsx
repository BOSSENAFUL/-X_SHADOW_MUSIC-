"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Download, Share, Loader2 } from "lucide-react";
import { toJpeg, toBlob } from "html-to-image";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

// Main Share Component
export function ShareStoryPreview({
  isOpen,
  onClose,
  playlist,
  getPlaylistCover,
  dominantColors,
  type = "playlist",
  shareUrl,
}) {
  const isMobile = useIsMobile();
  const captureRef = useRef(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Derive display values
  const title = playlist?.name || "Unknown";
  const subtitle = playlist?.ownerName || "Unknown Artist/User";
  const cover = playlist ? getPlaylistCover() : { type: 'default', src: '/default-playlist-image.png' };
  
  let coverUrl = '/default-playlist-image.png';
  if (cover.type === 'single') coverUrl = cover.src;
  else if (cover.type === 'collage' && cover.images?.length > 0) coverUrl = cover.images[0];

  // Proxy through Custom API with absolute URLs to grant Access-Control-Allow-Origin:*
  const proxyImage = (url) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    if (!url) return `${baseUrl}/default-playlist-image.png`;
    if (url.startsWith('/')) return `${baseUrl}${url}`;
    return `${baseUrl}/api/proxy/image?url=${encodeURIComponent(url)}`;
  };

  const corsCoverUrl = proxyImage(coverUrl);

  const [base64Cover, setBase64Cover] = useState(null);

  // Aggressively buffer the image locally as a Base64 String to completely nullify html-to-image cache ghosting
  useEffect(() => {
    let isMounted = true;
    if (!corsCoverUrl) return;

    const fetchImage = async () => {
      try {
        const res = await fetch(corsCoverUrl, {
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
        });
        const blob = await res.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          if (isMounted) setBase64Cover(reader.result);
        };
        reader.readAsDataURL(blob);
      } catch (e) {
        console.error("Failed to base64 encode cover:", e);
        if (isMounted) setBase64Cover(corsCoverUrl); // fallback
      }
    };
    fetchImage();

    return () => { isMounted = false; };
  }, [corsCoverUrl]);

  const generateBlobData = async () => {
    if (!captureRef.current || !base64Cover) return null;
    
    // Fallback wait for images and fonts to settle natively
    await new Promise(r => setTimeout(r, 200));

    try {
      const blob = await toBlob(captureRef.current, {
        pixelRatio: 4, // 4x scale so the 280px wide container outputs at ~1120px width (high res!)
        quality: 0.95,
        cacheBust: false, // Turned off to prevent random timestamp query strings from confusing the pipeline
        backgroundColor: '#000000',
      });
      return blob;
    } catch (err) {
      console.error("html-to-image generation failed:", err);
      return null;
    }
  };

  const handleDownload = async () => {
    setIsGenerating(true);
    const blob = await generateBlobData();
    if (blob) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Jammify-${title.replace(/\s+/g, '-').toLowerCase()}-story.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Story image downloaded!");
    } else {
      toast.error("Failed to generate image.");
    }
    setIsGenerating(false);
  };

  const handleShareSystem = async () => {
    setIsGenerating(true);
    const blob = await generateBlobData();
    if (!blob) {
      toast.error("Failed to generate image for sharing.");
      setIsGenerating(false);
      return;
    }

    const file = new File([blob], "share-story.jpg", { type: "image/jpeg" });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `Check out ${title} on Jammify`,
          text: `Check out ${title} by ${subtitle}`,
          url: shareUrl,
        });
        toast.success("Shared successfully!");
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error("Web share failed:", err);
          toast.error("Failed to share image. Trying link fallback...");
          handleCopyLink();
        }
      }
    } else {
      // Fallback
      handleDownload();
      toast.info("Image downloaded! (Device doesn't support direct image sharing)");
    }
    setIsGenerating(false);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl || window.location.href);
      toast.success("Link copied to clipboard!");
    } catch (e) {
      toast.error("Failed to copy link");
    }
  };

  // The visual DOM template that the user sees AND we snapshot upon button press
  const previewContentJsx = (
    <div className="flex flex-col items-center gap-6 pb-2 relative">
      {/* Container to be snapped by html-to-image */}
      <div 
        key={corsCoverUrl}
        ref={captureRef}
        className="w-[280px] h-[500px] rounded-xl overflow-hidden relative flex flex-col items-center justify-center p-6 text-left"
        style={{
          background: dominantColors 
            ? `linear-gradient(135deg, ${dominantColors}, #000000)`
            : 'linear-gradient(135deg, #1D1046, #000000)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' // shadow-2xl converted
        }}
      >
        {/* Slightly blurred overlay bg */}
        {base64Cover && (
          <img 
            src={base64Cover}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: 0.35, filter: 'blur(18px)', transform: 'scale(1.15)' }}
            alt="backdrop"
            crossOrigin="anonymous"
          />
        )}
        <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} />

        {/* The White Card */}
        <div 
          className="relative z-10 w-full rounded-2xl flex flex-col items-center p-4 pb-3.5" 
          style={{ 
            backgroundColor: dominantColors ? `color-mix(in srgb, ${dominantColors} 25%, #ffffff)` : '#ffffff',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' // shadow-xl converted
          }}
        >
           <div 
             className="w-full aspect-square rounded-xl overflow-hidden mb-3 shrink-0" 
             style={{ 
               backgroundColor: '#e5e5e5',
               boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' // shadow-md
             }}
           >
             {cover.type === 'collage' && cover.images?.length > 1 ? (
                <div className="w-full h-full grid grid-cols-2 gap-0.5">
                  {cover.images.map((img, i) => (
                    <img key={i} src={proxyImage(img)} crossOrigin="anonymous" className="w-full h-full object-cover" alt="collage" />
                  ))}
                </div>
             ) : (
                base64Cover ? <img src={base64Cover} crossOrigin="anonymous" className="w-full h-full object-cover" alt="cover" /> : <div className="w-full h-full bg-neutral-200 animate-pulse" />
             )}
           </div>

           <div className="w-full flex flex-col text-left mb-1 overflow-hidden">
             <h2 className="text-[17px] font-black w-full text-left whitespace-nowrap overflow-hidden text-ellipsis pb-0.5" style={{ color: '#000000', lineHeight: '1.2' }}>
               {title}
             </h2>
             <p className="text-[12px] font-medium w-full text-left mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis pb-0.5" style={{ color: '#525252', lineHeight: '1.2' }}>
               {subtitle}
             </p>
             
             <div className="mt-3 flex items-center gap-1.5 text-left" style={{ opacity: 0.8 }}>
               <img src={proxyImage('/icon-192.png')} className="w-[18px] h-[18px] rounded-sm object-cover" crossOrigin="anonymous" alt="Jammify" />
               <span className="text-[11px] font-black tracking-tight" style={{ color: '#000000' }}>Jammify</span>
             </div>
           </div>
        </div>
      </div>

      <div className="w-full grid grid-cols-3 gap-3 relative z-10">
        <Button 
          variant="secondary" 
          className="flex flex-col items-center gap-2 h-auto py-3 bg-white/5 hover:bg-white/10 text-white border border-white/10" 
          onClick={handleCopyLink}
          disabled={isGenerating}
        >
          <Copy className="w-5 h-5" />
          <span className="text-[11px] font-bold uppercase tracking-wider">Copy</span>
        </Button>
        <Button 
          variant="secondary" 
          className="flex flex-col items-center gap-2 h-auto py-3 bg-white/5 hover:bg-white/10 text-white border border-white/10" 
          onClick={handleDownload}
          disabled={isGenerating}
        >
          {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
          <span className="text-[11px] font-bold uppercase tracking-wider">Save</span>
        </Button>
        <Button 
          className="flex flex-col items-center gap-2 h-auto py-3 bg-green-500 hover:bg-green-600 text-black shadow-lg" 
          onClick={handleShareSystem}
          disabled={isGenerating}
        >
          {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Share className="w-5 h-5" />}
          <span className="text-[11px] font-black uppercase tracking-wider">Share</span>
        </Button>
      </div>

      {isGenerating && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#181818]/80 backdrop-blur-sm rounded-xl">
           <Loader2 className="w-8 h-8 animate-spin text-white mb-3" />
           <p className="text-sm font-bold animate-pulse text-white">Packaging image...</p>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="bg-[#181818] border-none text-white outline-none focus:outline-none ring-0 focus-visible:ring-0 rounded-t-3xl">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-center text-xl font-black tracking-tight">Ready to Share</DrawerTitle>
          </DrawerHeader>
          <div className="px-6 pb-8">
            {previewContentJsx}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm bg-[#181818] border-white/10 text-white p-6 shadow-2xl rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-black tracking-tight mb-2">Ready to Share</DialogTitle>
        </DialogHeader>
        {previewContentJsx}
      </DialogContent>
    </Dialog>
  );
}
