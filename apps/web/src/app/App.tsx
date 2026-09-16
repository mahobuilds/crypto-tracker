import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router';
import { AuthGate } from '@/app/auth/AuthGate';
import { AppRoutes } from '@/app/routes';
import { ToastProvider } from '@/components/ui';
import { queryClient } from '@/lib/query';

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <AuthGate>
            <AppRoutes />
          </AuthGate>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}
