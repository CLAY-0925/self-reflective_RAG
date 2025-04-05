import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppSettings, ModelType } from '../types';

interface AppSettingsContextType {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  toggleMedicalAgent: () => void;
  toggleIntentPrediction: () => void;
  toggleCaseSummary: () => void;
  toggleWebSearch: () => void;
  setModel: (model: ModelType) => void;
}

const defaultSettings: AppSettings = {
  theme: 'light',
  model: 'deepseek',
  enableMedicalAgent: true,
  enableIntentPrediction: false,
  enableCaseSummary: false,
  enableWebSearch: false,
};

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

export const AppSettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(() => {
    // 从本地存储中获取设置，如果没有则使用默认设置
    const savedSettings = localStorage.getItem('appSettings');
    return savedSettings ? JSON.parse(savedSettings) : defaultSettings;
  });

  useEffect(() => {
    // 保存设置到本地存储
    localStorage.setItem('appSettings', JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prevSettings => ({
      ...prevSettings,
      ...newSettings,
    }));
  };

  const toggleMedicalAgent = () => {
    setSettings(prevSettings => ({
      ...prevSettings,
      enableMedicalAgent: !prevSettings.enableMedicalAgent,
    }));
  };

  const toggleIntentPrediction = () => {
    setSettings(prevSettings => ({
      ...prevSettings,
      enableIntentPrediction: !prevSettings.enableIntentPrediction,
    }));
  };

  const toggleCaseSummary = () => {
    setSettings(prevSettings => ({
      ...prevSettings,
      enableCaseSummary: !prevSettings.enableCaseSummary,
    }));
  };

  const toggleWebSearch = () => {
    setSettings(prevSettings => ({
      ...prevSettings,
      enableWebSearch: !prevSettings.enableWebSearch,
    }));
  };

  const setModel = (model: ModelType) => {
    setSettings(prevSettings => ({
      ...prevSettings,
      model,
    }));
  };

  return (
    <AppSettingsContext.Provider
      value={{
        settings,
        updateSettings,
        toggleMedicalAgent,
        toggleIntentPrediction,
        toggleCaseSummary,
        toggleWebSearch,
        setModel,
      }}
    >
      {children}
    </AppSettingsContext.Provider>
  );
};

export const useAppSettings = (): AppSettingsContextType => {
  const context = useContext(AppSettingsContext);
  if (context === undefined) {
    throw new Error('useAppSettings must be used within an AppSettingsProvider');
  }
  return context;
}; 