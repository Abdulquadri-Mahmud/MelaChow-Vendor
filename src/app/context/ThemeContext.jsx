'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { Capacitor, SystemBarType, SystemBars, SystemBarsStyle } from '@capacitor/core';
import { StatusBar } from '@capacitor/status-bar';

const ThemeContext = createContext({
    theme: 'light',
    toggleTheme: () => { },
    setTheme: () => { },
});

export const useTheme = () => useContext(ThemeContext);

const applyLightTheme = () => {
    if (typeof window === 'undefined') return;

    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = 'light';
    document.documentElement.style.setProperty('--system-surface', '#ffffff');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#ffffff');

    if (!Capacitor.isNativePlatform()) return;
    Promise.all([
        SystemBars.setStyle({ bar: SystemBarType.StatusBar, style: SystemBarsStyle.Light }),
        SystemBars.setStyle({ bar: SystemBarType.NavigationBar, style: SystemBarsStyle.Light }),
        StatusBar.setBackgroundColor({ color: '#ffffff' }),
    ]).catch((error) => console.warn('[Theme] Could not update native system bars:', error));
};

export const ThemeProvider = ({ children }) => {
    useEffect(() => {
        localStorage.setItem('melachow-theme', 'light');
        applyLightTheme();
    }, []);

    const keepLightTheme = () => applyLightTheme();

    return (
        <ThemeContext.Provider value={{ theme: 'light', toggleTheme: keepLightTheme, setTheme: keepLightTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

