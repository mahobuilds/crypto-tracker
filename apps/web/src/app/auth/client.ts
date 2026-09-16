import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { queryClient } from '@/lib/query';
import { supabase } from '@/lib/supabase';
import { isMockEnabled, mockUser } from '@/dev/mock';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  image: string | null;
}

export interface Session {
  user: SessionUser;
}

export interface UseSessionResult {
  data: Session | null;
  isPending: boolean;
}

function readMetadataString(metadata: Record<string, unknown>, key: string): string | null {
  const value = metadata[key];
  return typeof value === 'string' ? value : null;
}

function toSessionUser(user: User): SessionUser {
  const metadata = user.user_metadata;
  const email = user.email ?? '';
  const name =
    readMetadataString(metadata, 'full_name') ?? readMetadataString(metadata, 'name') ?? email;
  const image =
    readMetadataString(metadata, 'avatar_url') ?? readMetadataString(metadata, 'picture');
  return { id: user.id, email, name, image };
}

export function useSession(): UseSessionResult {
  const mock = import.meta.env.DEV && isMockEnabled();
  const [data, setData] = useState<Session | null>(mock ? { user: mockUser } : null);
  const [isPending, setIsPending] = useState(!mock);

  useEffect(() => {
    if (mock) return;
    let active = true;

    void supabase.auth.getSession().then(({ data: sessionData }) => {
      if (!active) return;
      const user = sessionData.session?.user;
      setData(user ? { user: toSessionUser(user) } : null);
      setIsPending(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setData(session?.user ? { user: toSessionUser(session.user) } : null);
      setIsPending(false);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [mock]);

  return { data, isPending };
}

export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  });
  if (error) {
    throw error;
  }
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
  queryClient.clear();
}
