import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  // Initialize theme from localStorage or default to dark
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('collabcode-theme');
    return savedTheme || 'dark';
  });

  // Update localStorage when theme changes
  useEffect(() => {
    localStorage.setItem('collabcode-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Toggle between dark and light
  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Theme colors
  const themeColors = {
    dark: {
      arcadeGreen: '#00ff00',
      arcadeGreenDark: '#00cc00',
      arcadeGreenLight: '#66ff66',
      arcadeBg: '#0a0a0a',
      arcadeBgLight: '#1a1a1a',
      sapGreen: '#00FF7F',
      blackColor: '#000000',
      textPrimary: '#00ff00',
      textSecondary: '#00cc00',
    },
    light: {
      arcadeGreen: '#008000',
      arcadeGreenDark: '#006400',
      arcadeGreenLight: '#32CD32',
      arcadeBg: '#f5f5f5',
      arcadeBgLight: '#ffffff',
      sapGreen: '#228B22',
      blackColor: '#333333',
      textPrimary: '#008000',
      textSecondary: '#006400',
    }
  };

  const value = {
    theme,
    toggleTheme,
    isDark: theme === 'dark',
    colors: themeColors[theme]
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;

