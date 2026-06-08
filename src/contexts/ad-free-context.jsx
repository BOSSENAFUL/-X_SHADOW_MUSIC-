"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

const AdFreeContext = createContext({
  isAdFree: false,
  unlockAdFree: () => {},
  checkAdFreeStatus: () => {},
  isAdFreeModalOpen: false,
  setIsAdFreeModalOpen: () => {},
});

export function AdFreeProvider({ children }) {
  const [isAdFree, setIsAdFree] = useState(false);
  const [isAdFreeModalOpen, setIsAdFreeModalOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const checkAdFreeStatus = useCallback(() => {
    if (typeof window === "undefined") return false;
    const adFreeUntil = localStorage.getItem("jammify_ad_free_until");
    let active = false;
    if (adFreeUntil) {
      const timestamp = parseInt(adFreeUntil, 10);
      if (timestamp > Date.now()) {
        active = true;
      }
    }
    setIsAdFree((prev) => (prev !== active ? active : prev));
    return active;
  }, []);

  const unlockAdFree = useCallback(() => {
    if (typeof window === "undefined") return;
    const unlockTime = Date.now() + 12 * 60 * 60 * 1000; // 12 hours
    localStorage.setItem("jammify_ad_free_until", String(unlockTime));
    setIsAdFree(true);
  }, []);

  useEffect(() => {
    // Initial check (defer to prevent synchronous setState warning)
    const timeout = setTimeout(() => {
      checkAdFreeStatus();
      setIsLoaded(true);
    }, 0);

    // Check periodically (e.g. if the 12 hours expire while user is using the app)
    const interval = setInterval(checkAdFreeStatus, 30000);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [checkAdFreeStatus]);

  return (
    <AdFreeContext.Provider
      value={{
        isAdFree,
        unlockAdFree,
        checkAdFreeStatus,
        isAdFreeModalOpen,
        setIsAdFreeModalOpen,
        isLoaded,
      }}
    >
      {children}
    </AdFreeContext.Provider>
  );
}

export function useAdFree() {
  return useContext(AdFreeContext);
}
