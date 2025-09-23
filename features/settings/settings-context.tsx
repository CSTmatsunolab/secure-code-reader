import { PropsWithChildren, createContext, useCallback, useContext, useMemo, useState } from 'react';

type SettingsState = {
  useVirusTotal: boolean;
  alwaysShowStrongWarning: boolean;
};

type SettingsContextValue = SettingsState & {
  toggleUseVirusTotal: (value: boolean) => void;
  toggleAlwaysShowStrongWarning: (value: boolean) => void;
};

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

const defaultState: SettingsState = {
  useVirusTotal: true,
  alwaysShowStrongWarning: false,
};

export function SettingsProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<SettingsState>(defaultState);

  const toggleUseVirusTotal = useCallback((value: boolean) => {
    setState((prev) => ({ ...prev, useVirusTotal: value }));
  }, []);

  const toggleAlwaysShowStrongWarning = useCallback((value: boolean) => {
    setState((prev) => ({ ...prev, alwaysShowStrongWarning: value }));
  }, []);

  const contextValue = useMemo(
    () => ({
      ...state,
      toggleUseVirusTotal,
      toggleAlwaysShowStrongWarning,
    }),
    [state, toggleUseVirusTotal, toggleAlwaysShowStrongWarning],
  );

  return <SettingsContext.Provider value={contextValue}>{children}</SettingsContext.Provider>;
}

export function useSettingsContext() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettingsContext must be used within a SettingsProvider');
  }
  return context;
}
