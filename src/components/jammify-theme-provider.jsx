"use client";

import { useEffect } from "react";
import { applyTheme, getSavedTheme } from "@/lib/themes";

export function JammifyThemeProvider({ children }) {
  useEffect(() => {
    // Apply saved theme on app load
    const savedTheme = getSavedTheme();
    applyTheme(savedTheme);
  }, []);

  return <>{children}</>;
}
