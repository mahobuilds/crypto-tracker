import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet } from 'react-router';
import { AlertBanner } from '@/features/alerts';
import { LogoutIcon } from '@/components/icons';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import { signOut } from '@/app/auth/client';
import { NAV_ITEMS } from '@/app/nav';
import { useSettings } from '@/app/settings/SettingsProvider';

function UserAvatar({ name, image }: { name: string; image: string | null }) {
  if (image) {
    return (
      <img
        src={image}
        alt=""
        referrerPolicy="no-referrer"
        className="size-10 shrink-0 rounded-full bg-slate-200 object-cover dark:bg-slate-800"
      />
    );
  }
  const initial = name.trim().charAt(0).toUpperCase();
  return (
    <span
      aria-hidden="true"
      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-lg font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
    >
      {initial}
    </span>
  );
}

function SidebarFooter() {
  const { t } = useTranslation();
  const { user } = useSettings();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
      <div className="flex items-center gap-3">
        <UserAvatar name={user.name} image={user.image} />
        <div className="min-w-0">
          <p className="truncate text-base font-semibold">{user.name}</p>
          <p className="truncate text-sm text-slate-600 dark:text-slate-400">{user.email}</p>
        </div>
      </div>
      <Button
        variant="ghost"
        fullWidth
        loading={signingOut}
        onClick={() => void handleSignOut()}
        className="justify-start"
      >
        <LogoutIcon className="size-5 rtl:-scale-x-100" />
        {t('auth.signOut')}
      </Button>
    </div>
  );
}

const SIDEBAR_LINK_ACTIVE = 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300';
const SIDEBAR_LINK_IDLE =
  'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800';
const TAB_LINK_ACTIVE = 'text-indigo-700 dark:text-indigo-300';
const TAB_LINK_IDLE = 'text-slate-600 dark:text-slate-400';

export function AppShell() {
  const { t } = useTranslation();

  return (
    <div className="min-h-dvh">
      <aside
        className="fixed inset-y-0 start-0 z-20 hidden w-64 flex-col gap-6 border-e border-slate-200 bg-white p-5 md:flex dark:border-slate-800 dark:bg-slate-900"
        aria-label={t('nav.mainNavigation')}
      >
        <div className="flex items-center gap-3">
          <img src="/icons/icon.svg" alt="" width={40} height={40} className="size-10 rounded-xl" />
          <span className="text-lg font-bold tracking-tight">{t('common.appName')}</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map(({ to, labelKey, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'touch-target flex items-center gap-3 rounded-xl px-3 py-2.5 text-base font-medium transition-colors',
                  isActive ? SIDEBAR_LINK_ACTIVE : SIDEBAR_LINK_IDLE,
                )
              }
            >
              <Icon className="size-6 shrink-0" />
              {t(labelKey)}
            </NavLink>
          ))}
        </nav>
        <SidebarFooter />
      </aside>

      <main className="mx-auto w-full max-w-5xl px-4 pt-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:ps-[calc(16rem+2rem)] md:pe-8 md:pt-8 md:pb-8">
        <AlertBanner />
        <Outlet />
      </main>

      <nav
        aria-label={t('nav.mainNavigation')}
        className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden dark:border-slate-800 dark:bg-slate-900"
      >
        <ul className="flex items-stretch justify-around">
          {NAV_ITEMS.map(({ to, labelKey, icon: Icon }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(
                    'touch-target flex flex-col items-center justify-center gap-0.5 px-1 py-2 text-xs font-medium',
                    isActive ? TAB_LINK_ACTIVE : TAB_LINK_IDLE,
                  )
                }
              >
                <Icon className="size-6" />
                <span className="truncate">{t(labelKey)}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
