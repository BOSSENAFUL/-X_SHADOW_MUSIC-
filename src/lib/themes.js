// Theme definitions for Jammify
// Each theme contains CSS variable values for customization

export const themes = {
    default: {
        name: "Default",
        colors: {
            background: "#121212",
            foreground: "#e2e8f0",
            card: "#171717",
            "card-foreground": "#e2e8f0",
            popover: "#242424",
            "popover-foreground": "#a9a9a9",
            primary: "#006239",
            "primary-foreground": "#dde8e3",
            secondary: "#242424",
            "secondary-foreground": "#fafafa",
            muted: "#1f1f1f",
            "muted-foreground": "#a2a2a2",
            accent: "#313131",
            "accent-foreground": "#fafafa",
            destructive: "#541c15",
            "destructive-foreground": "#ede9e8",
            border: "#292929",
            input: "#242424",
            ring: "#4ade80",
        },
        preview: ["#121212", "#006239", "#4ade80", "#292929"],
    }
};

export const getTheme = (themeName) => {
    return themes[themeName] || themes.default;
};

export const applyTheme = (themeName) => {
    const theme = getTheme(themeName);
    const root = document.documentElement;

    Object.entries(theme.colors).forEach(([key, value]) => {
        root.style.setProperty(`--${key}`, value);
    });

    if (typeof window !== "undefined") {
        localStorage.setItem("jammify-theme", themeName);
    }
};

export const getSavedTheme = () => {
    if (typeof window !== "undefined") {
        return localStorage.getItem("jammify-theme") || "default";
    }
    return "default";
};
