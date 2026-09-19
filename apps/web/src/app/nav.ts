import { Icon } from '@/components/icons';
import type { IconComponent } from '@/components/icons';

export interface NavItem {
  to: string;
  labelKey: string;
  icon: IconComponent;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', labelKey: 'nav.dashboard', icon: Icon.Home },
  { to: '/transactions', labelKey: 'nav.transactions', icon: Icon.List },
  { to: '/holdings', labelKey: 'nav.holdings', icon: Icon.Coins },
  { to: '/prices', labelKey: 'nav.prices', icon: Icon.ChartLineUp },
  { to: '/alerts', labelKey: 'nav.alerts', icon: Icon.Bell },
  { to: '/settings', labelKey: 'nav.settings', icon: Icon.Gear },
];
