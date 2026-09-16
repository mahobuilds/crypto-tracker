import type { JSX, SVGProps } from 'react';

export interface IconProps {
  className?: string;
}

type SvgProps = SVGProps<SVGSVGElement> & { children: React.ReactNode };

function Svg({ children, className, ...rest }: SvgProps): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className ?? 'size-6'}
      {...rest}
    >
      {children}
    </svg>
  );
}

export function HomeIcon({ className }: IconProps): JSX.Element {
  return (
    <Svg className={className}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10v10h14V10" />
      <path d="M10 20v-6h4v6" />
    </Svg>
  );
}

export function ListIcon({ className }: IconProps): JSX.Element {
  return (
    <Svg className={className}>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <path d="M3 6h.01M3 12h.01M3 18h.01" />
    </Svg>
  );
}

export function ChartIcon({ className }: IconProps): JSX.Element {
  return (
    <Svg className={className}>
      <path d="M3 3v18h18" />
      <path d="m7 15 4-5 4 3 5-7" />
    </Svg>
  );
}

export function BellIcon({ className }: IconProps): JSX.Element {
  return (
    <Svg className={className}>
      <path d="M6 9a6 6 0 0 1 12 0v4l2 3H4l2-3z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </Svg>
  );
}

export function GearIcon({ className }: IconProps): JSX.Element {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </Svg>
  );
}

export function UploadIcon({ className }: IconProps): JSX.Element {
  return (
    <Svg className={className}>
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M4 20h16" />
    </Svg>
  );
}

export function PlusIcon({ className }: IconProps): JSX.Element {
  return (
    <Svg className={className}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function TrashIcon({ className }: IconProps): JSX.Element {
  return (
    <Svg className={className}>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M6 6l1 14h10l1-14" />
      <path d="M10 11v6M14 11v6" />
    </Svg>
  );
}

export function PencilIcon({ className }: IconProps): JSX.Element {
  return (
    <Svg className={className}>
      <path d="M17 3a2.8 2.8 0 0 1 4 4L8 20l-5 1 1-5z" />
      <path d="m15 5 4 4" />
    </Svg>
  );
}

export function SearchIcon({ className }: IconProps): JSX.Element {
  return (
    <Svg className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </Svg>
  );
}

export function CloseIcon({ className }: IconProps): JSX.Element {
  return (
    <Svg className={className}>
      <path d="M18 6 6 18M6 6l12 12" />
    </Svg>
  );
}

export function ChevronIcon({ className }: IconProps): JSX.Element {
  return (
    <Svg className={className}>
      <path d="m9 6 6 6-6 6" />
    </Svg>
  );
}

export function LogoutIcon({ className }: IconProps): JSX.Element {
  return (
    <Svg className={className}>
      <path d="M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h5" />
      <path d="M14 8l4 4-4 4" />
      <path d="M8 12h10" />
    </Svg>
  );
}

export function GoogleIcon({ className }: IconProps): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={className ?? 'size-6'}
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

export function CoinIcon({ className }: IconProps): JSX.Element {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 14 3-3 2 2 4-5" />
      <path d="M14 8h3v3" />
    </Svg>
  );
}
