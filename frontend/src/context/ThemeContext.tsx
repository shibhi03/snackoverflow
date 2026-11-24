"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from "react"

export type Theme = "light" | "dark" | "system"
export type ResolvedTheme = "light" | "dark"

interface ThemeContextType {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const THEME_STORAGE_KEY = "snack_overflow_theme"

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light")
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light")

  const getSystemTheme = useCallback((): ResolvedTheme => {
    if (typeof window === "undefined") return "light"
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  }, [])

  const applyTheme = useCallback(
    (targetTheme: Theme) => {
      const root = document.documentElement
      const isDark =
        targetTheme === "dark" ||
        (targetTheme === "system" && getSystemTheme() === "dark")

      if (isDark) {
        root.classList.add("dark")
        setResolvedTheme("dark")
      } else {
        root.classList.remove("dark")
        setResolvedTheme("light")
      }
    },
    [getSystemTheme],
  )

  useEffect(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null
    const initialTheme: Theme =
      saved === "light" || saved === "dark" || saved === "system" ? saved : "light"
    setThemeState(initialTheme)
    applyTheme(initialTheme)

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const handleMediaChange = () => {
      const current = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null
      if (current === "system") {
        applyTheme("system")
      }
    }

    mediaQuery.addEventListener("change", handleMediaChange)
    return () => mediaQuery.removeEventListener("change", handleMediaChange)
  }, [applyTheme])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem(THEME_STORAGE_KEY, newTheme)
    applyTheme(newTheme)
  }

  const toggleTheme = () => {
    if (theme === "light") setTheme("dark")
    else if (theme === "dark") setTheme("system")
    else setTheme("light")
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
