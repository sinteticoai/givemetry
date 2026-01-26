// T256: Toast notifications for success/error feedback
"use client";

import { Toaster as SonnerToaster } from "sonner";
import { useEffect, useState } from "react";

export function Toaster() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Sync with the same theme logic used in theme-toggle
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = savedTheme || (systemPrefersDark ? "dark" : "light");
    setTheme(initialTheme);

    // Listen for theme changes
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains("dark");
      setTheme(isDark ? "dark" : "light");
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => observer.disconnect();
  }, []);

  return (
    <SonnerToaster
      theme={theme}
      position="bottom-right"
      toastOptions={{
        duration: 4000,
        classNames: {
          toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          error: "group-[.toaster]:bg-destructive group-[.toaster]:text-destructive-foreground group-[.toaster]:border-destructive",
          success: "group-[.toaster]:bg-emerald-500 group-[.toaster]:text-white group-[.toaster]:border-emerald-500",
          warning: "group-[.toaster]:bg-amber-500 group-[.toaster]:text-white group-[.toaster]:border-amber-500",
          info: "group-[.toaster]:bg-blue-500 group-[.toaster]:text-white group-[.toaster]:border-blue-500",
        },
      }}
      closeButton
      richColors
    />
  );
}

// Re-export toast functions for convenience
export { toast } from "sonner";
