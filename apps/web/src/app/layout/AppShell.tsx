import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet } from 'react-router';
import { AlertBanner } from '@/features/alerts';
import { Icon } from '@/components/icons';
import { Avatar, Button, panelCoreClasses, panelShellClasses } from '@/components/ui';
import { cn } from '@/lib/cn';
import { signOut } from '@/app/auth/client';
import { NAV_ITEMS } from '@/app/nav';
import { useSettings } from '@/app/settings/SettingsProvider';

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
    <div className="mt-auto flex flex-col gap-2 border-t border-line pt-4">
      <div className="flex items-center gap-3 px-2 py-1">
        <Avatar label={user.name} src={user.image} />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[0.9375rem] font-semibold">{user.name}</p>
          <p className="text-caption truncate text-ink-3">{user.email}</p>
        </div>
      </div>
      <Button
        variant="ghost"
        fullWidth
        loading={signingOut}
        onClick={() => void handleSignOut()}
        className="justify-start px-3 text-ink-2"
      >
        <Icon.SignOut className="rtl:-scale-x-100" />
        {t('auth.signOut')}
      </Button>
    </div>
  );
}

export function AppShell() {
  const { t } = useTranslation();

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[17rem_1fr]">
      {/* Floating sidebar panel (laptop) */}
      <aside
        className="sticky top-0 hidden h-dvh p-6 pe-0 md:block"
        aria-label={t('nav.mainNavigation')}
      >
        <div
          className={cn(
            panelShellClasses,
            'flex h-full flex-col bg-surface-2 ring-black/5 dark:ring-white/8',
          )}
        >
          <div className={cn(panelCoreClasses, 'flex flex-1 flex-col p-4')}>
            <div className="flex items-center gap-3 px-2 pt-1 pb-5">
              <span className="flex size-10 items-center justify-center rounded-[12px] bg-accent text-accent-ink">
                <Icon.ChartLineUp weight="fill" size={22} />
              </span>
              <span className="text-[1.0625rem] font-semibold tracking-tight">
                {t('common.appName')}
              </span>
            </div>
            <nav className="flex flex-col gap-1">
              {NAV_ITEMS.map(({ to, labelKey, icon: NavIcon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    cn(
                      'flex h-12 items-center gap-3 rounded-full px-3.5 text-[0.9375rem] font-medium transition-[background-color,color] duration-150 ease-out',
                      isActive
                        ? 'bg-accent-soft text-accent'
                        : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <NavIcon weight={isActive ? 'fill' : 'regular'} size={22} />
                      {t(labelKey)}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
            <SidebarFooter />
          </div>
        </div>
      </aside>

      <main className="pb-tab-bar mx-auto w-full max-w-5xl px-4 pt-5 md:px-8 md:pt-8 md:pb-10">
        <div className="flex flex-col gap-6">
          <AlertBanner />
          <Outlet />
        </div>
      </main>

      {/* Bottom tab bar (phone) */}
      <nav
        aria-label={t('nav.mainNavigation')}
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      >
        <ul className="flex h-[var(--tab-bar-height)] items-stretch">
          {NAV_ITEMS.map(({ to, labelKey, icon: NavIcon }) => (
            <li key={to} className="min-w-0 flex-1">
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(
                    'relative flex h-full flex-col items-center justify-center gap-1 px-1 text-[0.6875rem] font-medium transition-colors duration-150',
                    isActive ? 'text-accent' : 'text-ink-3',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      aria-hidden="true"
                      className={cn(
                        'absolute top-0 h-1 w-7 rounded-full bg-accent transition-transform duration-200 ease-[var(--ease-out)]',
                        isActive ? 'scale-x-100' : 'scale-x-0',
                      )}
                    />
                    <NavIcon weight={isActive ? 'fill' : 'regular'} size={24} />
                    <span className="max-w-full truncate">{t(labelKey)}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
