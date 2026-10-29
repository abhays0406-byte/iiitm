import type { SVGProps } from 'react';

type IconSize = number | string;

const ICONS: Record<string, (props: { size?: IconSize } & SVGProps<SVGSVGElement>) => React.ReactElement> = {
  home: ({ size = 16, ...rest }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  person: ({ size = 16, ...rest }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  calendar: ({ size = 16, ...rest }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  phone: ({ size = 16, ...rest }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.8 19.8 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 0 7h-3a2 2 0 0 1-2-2 2 2 0 0 1 2-2v3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 0 7h-3a2 2 0 0 1-2-2v-3" />
    </svg>
  ),
  chevronRight: ({ size = 16, ...rest }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  lock: ({ size = 16, ...rest }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  alertCircle: ({ size = 16, ...rest }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  infoCircle: ({ size = 16, ...rest }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
  wifiOff: ({ size = 16, ...rest }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <path d="M5 13H1a10 10 0 0 1 17.56-2.04L19.7 4.16A10 10 0 0 1 22 21" />
      <line x1="1" y1="13" x2="7" y2="19" />
      <line x1="7" y1="19" x2="7" y2="13" />
      <line x1="14" y1="4" x2="20" y2="10" />
      <line x1="14" y1="4" x2="14" y2="10" />
      <line x1="14" y1="4" x2="20" y2="4" />
    </svg>
  ),
  wifi: ({ size = 16, ...rest }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <path d="M5 13H1a10 10 0 0 1 17.56-2.04L19.7 4.16A10 10 0 0 1 22 21" />
      <path d="M1 13h4a8 8 0 0 1 7.41 3" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="5" y1="17" x2="5" y2="21" />
      <line x1="19" y1="17" x2="19" y2="21" />
    </svg>
  ),
  logOut: ({ size = 16, ...rest }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
};

export function Icon({ name, size = 16, ...rest }: { name: string; size?: IconSize } & SVGProps<SVGSVGElement>): React.ReactElement | null {
  const Comp = ICONS[name];
  if (!Comp) return null;
  return <Comp size={size} {...rest} />;
}
