import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { CurrentUser, MeResponse, Settings } from '@crypto-tracker/shared';
import { ErrorMessage } from '@/components/ui';
import { AuthPending } from '@/app/auth/AuthGate';
import { applyLanguage } from '@/i18n';
import { ApiRequestError, apiFetch } from '@/lib/api';
import { queryClient, queryKeys } from '@/lib/query';
import { SignInPage } from '@/app/auth/SignInPage';

export interface SettingsContextValue {
  user: CurrentUser;
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  isSaving: boolean;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

function fetchMe(): Promise<MeResponse> {
  return apiFetch<MeResponse>('/api/me');
}

function errorMessageKey(error: unknown): string {
  if (error instanceof ApiRequestError && error.status === 0) return 'errors.network';
  return 'errors.generic';
}

function useDocumentSettings(settings: Settings): void {
  useEffect(() => {
    applyLanguage(settings.language);
  }, [settings.language]);

  useEffect(() => {
    const root = document.documentElement;
    if (settings.largeText) {
      root.setAttribute('data-large-text', '');
    } else {
      root.removeAttribute('data-large-text');
    }
  }, [settings.largeText]);

  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme !== 'system') {
      root.classList.toggle('dark', settings.theme === 'dark');
      return;
    }
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => root.classList.toggle('dark', media.matches);
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [settings.theme]);
}

interface SettingsBoundaryProps {
  me: MeResponse;
  children: ReactNode;
}

function SettingsBoundary({ me, children }: SettingsBoundaryProps) {
  const [isSaving, setIsSaving] = useState(false);
  useDocumentSettings(me.settings);

  const updateSettings = useCallback(async (patch: Partial<Settings>) => {
    const previous = queryClient.getQueryData<MeResponse>(queryKeys.me);
    if (previous) {
      queryClient.setQueryData<MeResponse>(queryKeys.me, {
        ...previous,
        settings: { ...previous.settings, ...patch },
      });
    }
    setIsSaving(true);
    try {
      const saved = await apiFetch<Settings>('/api/settings', { method: 'PUT', json: patch });
      const current = queryClient.getQueryData<MeResponse>(queryKeys.me);
      if (current) {
        queryClient.setQueryData<MeResponse>(queryKeys.me, { ...current, settings: saved });
      }
    } catch (error) {
      if (previous) {
        queryClient.setQueryData<MeResponse>(queryKeys.me, previous);
      }
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({ user: me.user, settings: me.settings, updateSettings, isSaving }),
    [me.user, me.settings, updateSettings, isSaving],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export interface SettingsProviderProps {
  children: ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const { t } = useTranslation();
  const query = useQuery({ queryKey: queryKeys.me, queryFn: fetchMe });

  if (query.isPending) {
    return <AuthPending />;
  }

  if (query.isError) {
    if (query.error instanceof ApiRequestError && query.error.status === 401) {
      return <SignInPage />;
    }
    return (
      <div className="mx-auto flex min-h-dvh max-w-md items-center px-4">
        <ErrorMessage
          className="w-full"
          message={t(errorMessageKey(query.error))}
          onRetry={() => void query.refetch()}
        />
      </div>
    );
  }

  return <SettingsBoundary me={query.data}>{children}</SettingsBoundary>;
}

export function useSettings(): SettingsContextValue {
  const value = useContext(SettingsContext);
  if (!value) {
    throw new Error('useSettings must be used inside <SettingsProvider>');
  }
  return value;
}
