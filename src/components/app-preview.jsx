"use client";

import { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, Play } from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

const screenImages = [
  { src: "/screens/1.jpg", alt: "Jammify Home Screen" },
  { src: "/screens/2.jpg", alt: "Music Playlist Interface" },
  { src: "/screens/3.jpg", alt: "Fullscreen Music Player" },
  { src: "/screens/4.jpg", alt: "Lyrics Page" },
  { src: "/screens/5.jpg", alt: "PC Screen" },
];

export function AppPreview() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [previewIndex, setPreviewIndex] = useState(0);

  // Auto-rotate preview images
  useEffect(() => {
    const interval = setInterval(() => {
      setPreviewIndex((prev) => (prev + 1) % screenImages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % screenImages.length);
  };

  const prevImage = () => {
    setCurrentIndex(
      (prev) => (prev - 1 + screenImages.length) % screenImages.length
    );
  };

  const goToImage = (index) => {
    setCurrentIndex(index);
  };

  const openGallery = () => {
    setCurrentIndex(previewIndex);
    setIsOpen(true);
  };

  return (
    <>
      {/* Preview Box - Responsive positioning with fade-in animation */}
      <motion.div
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-20"
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
      >
        <motion.div
          onClick={openGallery}
          className="group relative bg-card dark:bg-card rounded-xl sm:rounded-2xl shadow-2xl border border-border p-3 sm:p-4 cursor-pointer"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          layoutId="preview-container"
        >
          {/* Preview Image Container - Responsive sizing */}
          <div className="relative w-24 h-44 sm:w-28 sm:h-48 rounded-lg sm:rounded-xl overflow-hidden bg-muted">
            <Image
              src={screenImages[previewIndex].src}
              alt={screenImages[previewIndex].alt}
              fill
              className="object-cover transition-opacity duration-500"
              sizes="(max-width: 640px) 96px, 112px"
            />

            {/* Play Overlay */}
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="bg-card/90 backdrop-blur-sm rounded-full p-2 sm:p-2.5 border border-border/50">
                <Play className="w-4 h-4 sm:w-5 sm:h-5 text-primary fill-current" />
              </div>
            </div>

            {/* Image Counter Dots */}
            <div className="absolute bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2 flex space-x-1 sm:space-x-1.5">
              {screenImages.map((_, index) => (
                <div
                  key={index}
                  className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-all duration-300 ${
                    index === previewIndex
                      ? "bg-primary shadow-lg shadow-primary/50 scale-110"
                      : "bg-muted-foreground/50"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Preview Text - Responsive sizing */}
          <div className="mt-2 sm:mt-3 text-center">
            <p className="text-xs sm:text-sm font-semibold text-card-foreground">
              App Preview
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 sm:mt-1">
              Click to explore
            </p>
          </div>
        </motion.div>
      </motion.div>

      {/* Full Gallery Modal - Responsive */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-200 bg-black/90 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsOpen(false);
              }
            }}
          >
            <motion.div
              className="relative w-full max-w-sm sm:max-w-5xl mx-auto"
              layoutId="preview-container"
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              {/* Close Button - Responsive positioning */}
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10 bg-white/10 hover:bg-white/20 text-white p-2 sm:p-3 rounded-full transition-colors duration-200"
                aria-label="Close preview"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              {/* Navigation Buttons - Hidden on mobile, visible on desktop */}
              <button
                onClick={prevImage}
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10 bg-white/10 hover:bg-white/20 text-white p-2 sm:p-3 rounded-full transition-colors duration-200 hidden md:block"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              <button
                onClick={nextImage}
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10 bg-white/10 hover:bg-white/20 text-white p-2 sm:p-3 rounded-full transition-colors duration-200 hidden md:block"
                aria-label="Next image"
              >
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              {/* Main Image Container - Responsive sizing */}
              <div className="flex items-center justify-center min-h-[60vh] sm:min-h-[70vh]">
                <div className="relative max-w-xs sm:max-w-md mx-auto">
                  <Image
                    src={screenImages[currentIndex].src}
                    alt={screenImages[currentIndex].alt}
                    width={400}
                    height={800}
                    className="rounded-2xl sm:rounded-3xl shadow-2xl object-cover max-h-[60vh] sm:max-h-[70vh] w-auto"
                    priority
                  />

                  {/* Image Counter - Responsive positioning */}
                  <div className="absolute top-3 left-3 sm:top-6 sm:left-6 bg-black/60 text-white px-2 py-1 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium">
                    {currentIndex + 1} / {screenImages.length}
                  </div>
                </div>
              </div>

              {/* Thumbnail Navigation - Responsive sizing and spacing */}
              <div className="flex justify-center mt-4 sm:mt-8 space-x-2 sm:space-x-3 px-2">
                {screenImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToImage(index)}
                    className={`w-12 h-20 sm:w-16 sm:h-28 rounded-lg sm:rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                      index === currentIndex
                        ? "border-white shadow-lg scale-105"
                        : "border-white/30 hover:border-white/60"
                    }`}
                  >
                    <Image
                      src={screenImages[index].src}
                      alt={`Thumbnail ${index + 1}`}
                      width={64}
                      height={112}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>

              {/* Image Title - Responsive text sizing */}
              <div className="text-center mt-4 sm:mt-6 px-4">
                <h3 className="text-lg sm:text-xl font-semibold text-white">
                  {screenImages[currentIndex].alt}
                </h3>
                <p className="text-white/70 text-xs sm:text-sm mt-1">
                  Jammify Mobile App and PC web-app Interface
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
