"use client";

import { useState } from "react";
import { Check, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { themes } from "@/lib/themes";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

export function ThemeSelector({ variant = "default", size = "default" }) {
    const { currentTheme, changeTheme } = useTheme();
    const [open, setOpen] = useState(false);

    const themeEntries = Object.entries(themes);

    const handleThemeSelect = (themeKey) => {
        changeTheme(themeKey);
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant={variant}
                    size={size}
                    className={cn(
                        "gap-2",
                        variant === "outline" && "rounded-full font-semibold tracking-wide px-6"
                    )}
                >
                    <Palette className="w-4 h-4" />
                    Theme
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-w-[95vw] p-0 gap-0 max-h-[80vh] flex flex-col">
                {/* Header */}
                <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 space-y-1.5">
                    <DialogTitle className="text-lg sm:text-xl font-bold">Choose Theme</DialogTitle>
                    <DialogDescription className="text-xs sm:text-sm">
                        Personalize your Jammify experience
                    </DialogDescription>
                </DialogHeader>

                {/* Themes List */}
                <ScrollArea className="flex-1 px-4 sm:px-6 overflow-y-auto">
                    <div className="space-y-2 pr-2 pb-2 py-1">
                        {themeEntries.map(([key, theme]) => {
                            const isSelected = currentTheme === key;
                            return (
                                <button
                                    key={key}
                                    onClick={() => handleThemeSelect(key)}
                                    className={cn(
                                        "w-full flex items-center gap-3 p-3 rounded-lg transition-all",
                                        "hover:scale-[1.02] active:scale-[0.98]",
                                        isSelected
                                            ? "bg-primary/10 border-2 border-primary shadow-sm"
                                            : "bg-card border-2 border-border hover:border-primary/50 hover:bg-accent/50"
                                    )}
                                >
                                    {/* Color Preview */}
                                    <div className="flex gap-1 shrink-0">
                                        {theme.preview.map((color, idx) => (
                                            <div
                                                key={idx}
                                                className="w-5 h-5 rounded-md shadow-sm border border-black/10"
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>

                                    {/* Theme Name */}
                                    <div className="flex-1 text-left">
                                        <h3 className="font-semibold text-sm text-foreground">
                                            {theme.name}
                                        </h3>
                                    </div>

                                    {/* Selected Indicator */}
                                    {isSelected && (
                                        <div className="shrink-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                            <Check className="w-3 h-3 text-primary-foreground" strokeWidth={3} />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </ScrollArea>

                {/* Footer */}
                <div className="px-4 sm:px-6 py-2.5 sm:py-3 border-t bg-muted/30 shrink-0">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{themeEntries.length} {themeEntries.length === 1 ? "theme" : "themes"}</span>
                        <span>Saved locally</span>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
