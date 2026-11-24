import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DARK_COLORS, LIGHT_COLORS, ThemePalette } from './tokens';

const THEME_STORAGE_KEY = '@fittrack70/theme_mode_v1';

interface ThemeContextValue {
  mode: 'dark' | 'light';
  colors: ThemePalette;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'dark',
  colors: DARK_COLORS,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((saved) => {
        if (saved === 'light' || saved === 'dark') {
          setMode(saved);
        }
      })
      .catch(() => {});
  }, []);

  const colors = useMemo(() => (mode === 'light' ? LIGHT_COLORS : DARK_COLORS), [mode]);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.style.backgroundColor = colors.bg;
      document.body.style.backgroundColor = colors.bg;
      const rootEl = document.getElementById('root');
      if (rootEl) rootEl.style.backgroundColor = colors.bg;
      const metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme) metaTheme.setAttribute('content', colors.bg);
    }
  }, [colors]);

  const toggleTheme = useCallback(() => {
    setMode((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      AsyncStorage.setItem(THEME_STORAGE_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo(() => ({ mode, colors, toggleTheme }), [mode, colors, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
