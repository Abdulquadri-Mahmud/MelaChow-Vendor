'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Capacitor, SystemBarType, SystemBars, SystemBarsStyle } from '@capacitor/core';
import { StatusBar } from '@capacitor/status-bar';

const THEME_STORAGE_KEY = 'melachow-theme';

const ThemeContext = createContext({
    theme: 'light',
    toggleTheme: () => { },
    setTheme: () => { },
});

export const useTheme = () => useContext(ThemeContext);

const applyThemeToDocument = (nextTheme) => {
    if (typeof window === 'undefined') return;

    const isDark = nextTheme === 'dark';
    const surfaceColor = isDark ? '#09090b' : '#ffffff';

    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
    document.documentElement.style.setProperty('--system-surface', surfaceColor);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', surfaceColor);

    if (!Capacitor.isNativePlatform()) return;
    const barStyle = isDark ? SystemBarsStyle.Dark : SystemBarsStyle.Light;
    Promise.all([
        SystemBars.setStyle({ bar: SystemBarType.StatusBar, style: barStyle }),
        SystemBars.setStyle({ bar: SystemBarType.NavigationBar, style: barStyle }),
        StatusBar.setBackgroundColor({ color: surfaceColor }),
    ]).catch((error) => console.warn('[Theme] Could not update native system bars:', error));
};

export const ThemeProvider = ({ children }) => {
    const [theme, setThemeState] = useState('light');

    useEffect(() => {
        try {
            const saved = localStorage.getItem(THEME_STORAGE_KEY);
            const resolved = saved === 'dark' || saved === 'light' ? saved : 'light';
            setThemeState(resolved);
            applyThemeToDocument(resolved);
        } catch {
            applyThemeToDocument('light');
        }
    }, []);

    const setTheme = useCallback((next) => {
        const resolved = next === 'dark' ? 'dark' : 'light';
        setThemeState(resolved);
        try {
            localStorage.setItem(THEME_STORAGE_KEY, resolved);
        } catch {
            // ignore storage errors in restricted WebViews
        }
        applyThemeToDocument(resolved);
    }, []);

    const toggleTheme = useCallback(() => {
        setThemeState((prev) => {
            const resolved = prev === 'dark' ? 'light' : 'dark';
            try {
                localStorage.setItem(THEME_STORAGE_KEY, resolved);
            } catch {
                // ignore storage errors in restricted WebViews
            }
            applyThemeToDocument(resolved);
            return resolved;
        });
    }, []);

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
