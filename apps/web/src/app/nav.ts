import type { JSX } from 'react';
import { BellIcon, ChartIcon, GearIcon, HomeIcon, ListIcon } from '@/components/icons';

export interface NavItem {
  to: string;
  labelKey: string;
  icon: (props: { className?: string }) => JSX.Element;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', labelKey: 'nav.dashboard', icon: HomeIcon },
  { to: '/transactions', labelKey: 'nav.transactions', icon: ListIcon },
  { to: '/prices', labelKey: 'nav.prices', icon: ChartIcon },
  { to: '/alerts', labelKey: 'nav.alerts', icon: BellIcon },
  { to: '/settings', labelKey: 'nav.settings', icon: GearIcon },
];
