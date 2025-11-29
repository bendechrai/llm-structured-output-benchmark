'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export interface ApiKeys {
  openai?: string;
  anthropic?: string;
  google?: string;
  groq?: string;
  openrouter?: string;
}

interface ApiKeysContextType {
  keys: ApiKeys;
  setKey: (provider: keyof ApiKeys, key: string) => void;
  clearKeys: () => void;
  hasKey: (provider: keyof ApiKeys) => boolean;
  getHeaders: () => Record<string, string>;
}

const ApiKeysContext = createContext<ApiKeysContextType | null>(null);

export function ApiKeysProvider({ children }: { children: ReactNode }) {
  const [keys, setKeys] = useState<ApiKeys>({});

  const setKey = useCallback((provider: keyof ApiKeys, key: string) => {
    setKeys(prev => ({
      ...prev,
      [provider]: key || undefined,
    }));
  }, []);

  const clearKeys = useCallback(() => {
    setKeys({});
  }, []);

  const hasKey = useCallback((provider: keyof ApiKeys) => {
    return !!keys[provider];
  }, [keys]);

  const getHeaders = useCallback(() => {
    const headers: Record<string, string> = {};
    if (keys.openai) headers['x-openai-api-key'] = keys.openai;
    if (keys.anthropic) headers['x-anthropic-api-key'] = keys.anthropic;
    if (keys.google) headers['x-google-api-key'] = keys.google;
    if (keys.groq) headers['x-groq-api-key'] = keys.groq;
    if (keys.openrouter) headers['x-openrouter-api-key'] = keys.openrouter;
    return headers;
  }, [keys]);

  return (
    <ApiKeysContext.Provider value={{ keys, setKey, clearKeys, hasKey, getHeaders }}>
      {children}
    </ApiKeysContext.Provider>
  );
}

export function useApiKeys() {
  const context = useContext(ApiKeysContext);
  if (!context) {
    throw new Error('useApiKeys must be used within an ApiKeysProvider');
  }
  return context;
}
