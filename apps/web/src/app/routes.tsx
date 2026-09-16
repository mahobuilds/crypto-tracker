import { useRoutes } from 'react-router';
import type { RouteObject } from 'react-router';
import { AppShell } from '@/app/layout/AppShell';
import { NotFoundPage } from '@/app/NotFoundPage';
import { SettingsProvider } from '@/app/settings/SettingsProvider';
import { AlertsPage } from '@/features/alerts';
import { DashboardPage } from '@/features/dashboard';
import { ImportPage } from '@/features/import';
import { PricesPage } from '@/features/prices';
import { SettingsPage } from '@/features/settings';
import { TransactionsPage } from '@/features/transactions';

/**
 * Feature pages are added here at integration, e.g.
 * `{ path: 'transactions', element: <TransactionsPage /> }`.
 * They render inside `AppShell`, so every entry is relative to `/`.
 */
export const featureRoutes: RouteObject[] = [
  { path: 'transactions', element: <TransactionsPage /> },
  { path: 'import', element: <ImportPage /> },
  { path: 'prices', element: <PricesPage /> },
  { path: 'alerts', element: <AlertsPage /> },
  { path: 'settings', element: <SettingsPage /> },
];

function ShellLayout() {
  return (
    <SettingsProvider>
      <AppShell />
    </SettingsProvider>
  );
}

export function AppRoutes() {
  return useRoutes([
    {
      path: '/',
      element: <ShellLayout />,
      children: [
        { index: true, element: <DashboardPage /> },
        ...featureRoutes,
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ]);
}
