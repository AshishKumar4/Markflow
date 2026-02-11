import React from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
interface ThemeToggleProps {
  className?: string;
}
export function ThemeToggle({ className = "absolute top-4 right-4" }: ThemeToggleProps) {
  const { isDark, toggleTheme } = useTheme();
  return (
    <Button
      onClick={(e) => {
        e.preventDefault();
        toggleTheme();
      }}
      variant="ghost"
      size="icon"
      className={`${className} hover:scale-110 hover:rotate-12 transition-all duration-200 active:scale-90 z-50 rounded-full h-10 w-10`}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {isDark ? (
        <Sun className="h-[1.2rem] w-[1.2rem] text-yellow-500 transition-all" />
      ) : (
        <Moon className="h-[1.2rem] w-[1.2rem] text-slate-700 transition-all" />
      )}
    </Button>
  );
}