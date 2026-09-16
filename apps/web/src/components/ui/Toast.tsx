import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/icons';

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastOptions {
  tone?: ToastTone;
  /** Milliseconds before auto-dismiss. Default 4000. */
  duration?: number;
}

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastApi {
  show: (message: string, options?: ToastOptions) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const TONE_ICON: Record<ToastTone, ReactNode> = {
  success: <Icon.CheckCircle weight="fill" size={18} className="text-gain" />,
  error: <Icon.WarningCircle weight="fill" size={18} className="text-loss" />,
  info: <Icon.Info weight="fill" size={18} className="text-accent" />,
};

/** Mount once near the root. Toasts sit above the phone tab bar, bottom-end on desktop. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
    const timer = timers.current.get(id);
    if (timer) window.clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const show = useCallback(
    (message: string, options?: ToastOptions) => {
      const id = nextId.current++;
      setItems((current) => [...current.slice(-2), { id, message, tone: options?.tone ?? 'info' }]);
      timers.current.set(
        id,
        window.setTimeout(() => dismiss(id), options?.duration ?? 4000),
      );
    },
    [dismiss],
  );

  useEffect(() => {
    const active = timers.current;
    return () => {
      active.forEach((timer) => window.clearTimeout(timer));
      active.clear();
    };
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (message) => show(message, { tone: 'success' }),
      error: (message) => show(message, { tone: 'error', duration: 6000 }),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-relevant="additions"
        className="pointer-events-none fixed inset-x-4 bottom-[calc(var(--tab-bar-height)+env(safe-area-inset-bottom)+1rem)] z-40 flex flex-col items-center gap-2 md:inset-x-auto md:end-8 md:bottom-8 md:items-end"
      >
        {items.map((item) => (
          <div
            key={item.id}
            role="status"
            className={cn(
              'animate-rise pointer-events-auto flex max-w-[calc(100vw-2rem)] items-center gap-2.5 rounded-full bg-ink px-4 py-2.5 text-[0.9375rem] font-medium text-bg shadow-panel',
            )}
          >
            {TONE_ICON[item.tone]}
            <span className="truncate">{item.message}</span>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              className="-me-1 ms-1 inline-flex size-7 items-center justify-center rounded-full text-bg/70 hover:bg-bg/10 hover:text-bg"
              aria-label="Dismiss"
            >
              <Icon.X size={14} weight="bold" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast must be used inside <ToastProvider>');
  return api;
}
