import React, { createContext, useContext, useState, useEffect } from 'react';

export type UIStyle = 'apple' | 'classic';

interface DesignModeContextType {
  uiStyle: UIStyle;
  setUiStyle: (style: UIStyle) => void;
  toggleUiStyle: () => void;
  isApple: boolean;
}

const DesignModeContext = createContext<DesignModeContextType | undefined>(undefined);

const STORAGE_KEY = 'houz_ui_style';

export const DesignModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [uiStyle, setUiStyleState] = useState<UIStyle>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'classic' || saved === 'apple') {
        return saved;
      }
    } catch (e) {
      console.error('Failed to read uiStyle from localStorage:', e);
    }
    return 'apple'; // Default to new Apple design
  });

  const setUiStyle = (style: UIStyle) => {
    setUiStyleState(style);
    try {
      localStorage.setItem(STORAGE_KEY, style);
    } catch (e) {
      console.error('Failed to save uiStyle to localStorage:', e);
    }
  };

  const toggleUiStyle = () => {
    setUiStyle(uiStyle === 'apple' ? 'classic' : 'apple');
  };

  useEffect(() => {
    const root = document.documentElement;
    if (uiStyle === 'apple') {
      root.classList.add('ui-apple');
      root.classList.remove('ui-classic');
    } else {
      root.classList.add('ui-classic');
      root.classList.remove('ui-apple');
    }
  }, [uiStyle]);

  return (
    <DesignModeContext.Provider
      value={{
        uiStyle,
        setUiStyle,
        toggleUiStyle,
        isApple: uiStyle === 'apple',
      }}
    >
      {children}
    </DesignModeContext.Provider>
  );
};

export const useDesignMode = (): DesignModeContextType => {
  const context = useContext(DesignModeContext);
  if (!context) {
    throw new Error('useDesignMode must be used within a DesignModeProvider');
  }
  return context;
};
