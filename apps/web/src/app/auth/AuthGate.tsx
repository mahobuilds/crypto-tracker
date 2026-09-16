import type { ReactNode } from 'react';
import { Icon } from '@/components/icons';
import { useSession } from './client';
import { SignInPage } from './SignInPage';

export interface AuthGateProps {
  children: ReactNode;
}

/** Full-screen app mark with a gentle pulse while the session is resolved. */
export function AuthPending() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg">
      <span className="animate-mark-pulse flex size-16 items-center justify-center rounded-[20px] bg-accent text-accent-ink">
        <Icon.ChartLineUp weight="fill" size={32} />
      </span>
    </div>
  );
}

export function AuthGate({ children }: AuthGateProps) {
  const { data: session, isPending } = useSession();

  if (isPending) return <AuthPending />;
  if (!session) return <SignInPage />;
  return <>{children}</>;
}
