import { createAuthClient } from 'better-auth/react';
import { queryClient } from '@/lib/query';

export const authClient = createAuthClient({
  baseURL: window.location.origin,
  basePath: '/api/auth',
});

export const useSession = authClient.useSession;

export function signInWithGoogle() {
  return authClient.signIn.social({ provider: 'google', callbackURL: '/' });
}

export async function signOut(): Promise<void> {
  await authClient.signOut();
  queryClient.clear();
}
