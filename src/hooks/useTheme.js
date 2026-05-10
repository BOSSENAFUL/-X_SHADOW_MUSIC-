"use client";

import { useState, useEffect } from "react";
import { applyTheme, getSavedTheme } from "@/lib/themes";

export function useTheme() {
    const [currentTheme, setCurrentTheme] = useState("default");
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Load saved theme on mount
        const savedTheme = getSavedTheme();
        setCurrentTheme(savedTheme);
        applyTheme(savedTheme);
        setIsLoading(false);
    }, []);

    const changeTheme = (themeName) => {
        setCurrentTheme(themeName);
        applyTheme(themeName);
    };

    return {
        currentTheme,
        changeTheme,
        isLoading,
    };
}
