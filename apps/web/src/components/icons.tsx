import type { JSX } from 'react';
import type { Icon as PhosphorIcon, IconWeight } from '@phosphor-icons/react';
import {
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  ArrowsClockwiseIcon,
  BellIcon as PhBell,
  BellRingingIcon,
  CaretDownIcon,
  CaretRightIcon,
  ChartLineIcon,
  ChartLineUpIcon,
  CheckCircleIcon,
  CheckIcon,
  ClockIcon,
  CoinsIcon,
  DotsThreeIcon,
  FileCsvIcon,
  FunnelIcon,
  GearIcon as PhGear,
  HouseIcon,
  InfoIcon,
  ListBulletsIcon,
  MagnifyingGlassIcon,
  MoonIcon,
  PencilSimpleIcon,
  PlusIcon as PhPlus,
  SignOutIcon,
  SlidersHorizontalIcon,
  SparkleIcon,
  SunIcon,
  TextAaIcon,
  TranslateIcon,
  TrashIcon as PhTrash,
  UploadSimpleIcon,
  UsersThreeIcon,
  WalletIcon,
  WarningCircleIcon,
  WarningIcon,
  XCircleIcon,
  XIcon,
} from '@phosphor-icons/react';

/**
 * The one icon family (docs/DESIGN.md section 4): Phosphor, `regular` at 20 px for UI,
 * `bold` for 16 px inline marks, `fill` only for the active nav item.
 * Features import from this map and never from `@phosphor-icons/react` directly.
 */
export interface IconProps {
  className?: string;
  weight?: IconWeight;
  size?: number | string;
}

export type IconComponent = (props: IconProps) => JSX.Element;

function wrap(Phosphor: PhosphorIcon): IconComponent {
  return function Icon({ className, weight = 'regular', size = 20 }: IconProps) {
    return (
      <Phosphor
        className={className}
        weight={weight}
        size={size}
        aria-hidden="true"
        focusable="false"
      />
    );
  };
}

/** The Google brand mark: the one hand-written SVG allowed in the app. */
function Google({ className, size = 20 }: IconProps): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3a7.2 7.2 0 0 1-10.8-3.8H1.3v3.1A12 12 0 0 0 12 24z"
      />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1z" />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1A7.2 7.2 0 0 1 12 4.8z"
      />
    </svg>
  );
}

export const Icon = {
  Home: wrap(HouseIcon),
  List: wrap(ListBulletsIcon),
  ChartLine: wrap(ChartLineIcon),
  ChartLineUp: wrap(ChartLineUpIcon),
  Bell: wrap(PhBell),
  BellRinging: wrap(BellRingingIcon),
  Gear: wrap(PhGear),
  Upload: wrap(UploadSimpleIcon),
  Plus: wrap(PhPlus),
  Trash: wrap(PhTrash),
  Pencil: wrap(PencilSimpleIcon),
  MagnifyingGlass: wrap(MagnifyingGlassIcon),
  X: wrap(XIcon),
  CaretRight: wrap(CaretRightIcon),
  CaretDown: wrap(CaretDownIcon),
  SignOut: wrap(SignOutIcon),
  SlidersHorizontal: wrap(SlidersHorizontalIcon),
  ArrowUpRight: wrap(ArrowUpRightIcon),
  ArrowDownRight: wrap(ArrowDownRightIcon),
  Check: wrap(CheckIcon),
  CheckCircle: wrap(CheckCircleIcon),
  Warning: wrap(WarningIcon),
  WarningCircle: wrap(WarningCircleIcon),
  XCircle: wrap(XCircleIcon),
  Info: wrap(InfoIcon),
  Google,
  Coins: wrap(CoinsIcon),
  Sparkle: wrap(SparkleIcon),
  Clock: wrap(ClockIcon),
  FileCsv: wrap(FileCsvIcon),
  Moon: wrap(MoonIcon),
  Sun: wrap(SunIcon),
  TextAa: wrap(TextAaIcon),
  Translate: wrap(TranslateIcon),
  DotsThree: wrap(DotsThreeIcon),
  Funnel: wrap(FunnelIcon),
  ArrowsClockwise: wrap(ArrowsClockwiseIcon),
  UsersThree: wrap(UsersThreeIcon),
  Wallet: wrap(WalletIcon),
} satisfies Record<string, IconComponent>;

export type IconName = keyof typeof Icon;

/* Legacy names kept so existing feature imports compile unchanged. New code uses `Icon.*`. */
export const HomeIcon = Icon.Home;
export const ListIcon = Icon.List;
export const ChartIcon = Icon.ChartLine;
export const BellIcon = Icon.Bell;
export const GearIcon = Icon.Gear;
export const UploadIcon = Icon.Upload;
export const PlusIcon = Icon.Plus;
export const TrashIcon = Icon.Trash;
export const PencilIcon = Icon.Pencil;
export const SearchIcon = Icon.MagnifyingGlass;
export const CloseIcon = Icon.X;
export const ChevronIcon = Icon.CaretRight;
export const LogoutIcon = Icon.SignOut;
export const GoogleIcon = Icon.Google;
export const CoinIcon = Icon.Coins;
