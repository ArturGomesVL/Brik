const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

export const SearchIcon = (props) => (
  <svg {...base} strokeWidth={2.2} {...props}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
)

export const PhoneIcon = (props) => (
  <svg {...base} {...props}>
    <rect x="7" y="2.5" width="10" height="19" rx="2.2" />
    <path d="M10.5 5h3M11 18.5h2" />
  </svg>
)

export const GamepadIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M7 7h10a4.5 4.5 0 0 1 4.4 5.4l-.7 3.4a2.6 2.6 0 0 1-4.4 1.3L14.5 15h-5l-1.8 2.1a2.6 2.6 0 0 1-4.4-1.3l-.7-3.4A4.5 4.5 0 0 1 7 7Z" />
    <path d="M8 9.5v3M6.5 11h3" />
    <circle cx="15.5" cy="10" r=".6" fill="currentColor" />
    <circle cx="17.5" cy="12" r=".6" fill="currentColor" />
  </svg>
)

export const PinIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" />
    <circle cx="12" cy="10" r="2.4" />
  </svg>
)

export const WarningIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M12 3.5 2.8 19.5a1.2 1.2 0 0 0 1 1.8h16.4a1.2 1.2 0 0 0 1-1.8L12 3.5Z" />
    <path d="M12 10v4.2M12 17.4v.1" />
  </svg>
)

export const StarIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9L12 2.5Z" />
  </svg>
)

export const HomeIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M12 2.8 2.6 11.2a.9.9 0 0 0 .6 1.6H5V20a1.2 1.2 0 0 0 1.2 1.2H9.5v-5.4h5v5.4h3.3A1.2 1.2 0 0 0 19 20v-7.2h1.8a.9.9 0 0 0 .6-1.6L12 2.8Z" />
  </svg>
)

export const ChartIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <rect x="3" y="14" width="3.6" height="7" rx=".6" />
    <rect x="8.4" y="10.5" width="3.6" height="10.5" rx=".6" />
    <rect x="13.8" y="7.5" width="3.6" height="13.5" rx=".6" />
    <path d="m3.5 10.5 6-5 3.5 2.5 6-5.2M15.6 2.9h3.9v3.9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const CalculatorIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path fillRule="evenodd" d="M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm.5 2.5v3.5h9V4.5h-9ZM8 10.5a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2Zm4 0a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2Zm4 0a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2ZM8 14.5a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2Zm4 0a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2Zm4 0a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2ZM8 18a1.1 1.1 0 1 0 0 2.2A1.1 1.1 0 0 0 8 18Zm4 0a1.1 1.1 0 1 0 0 2.2A1.1 1.1 0 0 0 12 18Zm4 0a1.1 1.1 0 1 0 0 2.2A1.1 1.1 0 0 0 16 18Z" />
  </svg>
)

export const UserIcon = (props) => (
  <svg {...base} strokeWidth={1.6} {...props}>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="9.5" r="3.4" fill="currentColor" stroke="none" />
    <path d="M5.5 18.6c1.4-2.6 3.7-3.8 6.5-3.8s5.1 1.2 6.5 3.8" fill="currentColor" stroke="none" />
  </svg>
)

export const CameraIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.2l1.2-2h6.2l1.2 2h2.2A1.5 1.5 0 0 1 19 8.5v8A1.5 1.5 0 0 1 17.5 18h-13A1.5 1.5 0 0 1 3 16.5v-8Z" />
    <circle cx="11" cy="12" r="3.2" />
    <path d="M19 13.5h3M20.5 12v3" />
  </svg>
)

export const ChevronRightIcon = (props) => (
  <svg {...base} strokeWidth={2.6} {...props}>
    <path d="m9 5 7 7-7 7" />
  </svg>
)

export const TrophyIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
    <path d="M7 6H4.5v1.5A3.5 3.5 0 0 0 8 11M17 6h2.5v1.5A3.5 3.5 0 0 1 16 11" />
    <path d="M12 14v3M9 20h6M10 17h4" />
  </svg>
)

export const LockIcon = (props) => (
  <svg {...base} {...props}>
    <rect x="4.5" y="10" width="15" height="10" rx="2.5" />
    <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
  </svg>
)

export const BellIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 13 6 9Z" />
    <path d="M10 18a2 2 0 0 0 4 0" />
  </svg>
)

export const GearIcon = (props) => (
  <svg {...base} {...props}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 3.2v2M12 18.8v2M3.2 12h2M18.8 12h2M5.8 5.8l1.4 1.4M16.8 16.8l1.4 1.4M18.2 5.8l-1.4 1.4M7.2 16.8l-1.4 1.4" />
  </svg>
)

export const SupportIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M4.5 14v-2a7.5 7.5 0 0 1 15 0v2" />
    <rect x="2.8" y="13.5" width="4" height="6" rx="2" />
    <rect x="17.2" y="13.5" width="4" height="6" rx="2" />
    <path d="M19.5 19.5a3 3 0 0 1-3 3H13" />
  </svg>
)

export const DocIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M13 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9l-6-6Z" />
    <path d="M13 3v6h6M9 13h6M9 17h4" />
  </svg>
)

export const LogoutIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M14 4h3.5A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5H14" />
    <path d="M10 8l-4 4 4 4M6 12h9" />
  </svg>
)

export const ArrowLeftIcon = (props) => (
  <svg {...base} strokeWidth={2.2} {...props}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </svg>
)

export const PlusIcon = (props) => (
  <svg {...base} strokeWidth={3} {...props}>
    <path d="M12 4v16M4 12h16" />
  </svg>
)

export const EyeIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

export const EyeOffIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M3 3l18 18" />
    <path d="M10.6 5.7A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-3.2 4M6.3 6.9A16 16 0 0 0 2.5 12S6 18.5 12 18.5a9.5 9.5 0 0 0 4-.9" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </svg>
)

// Silhueta do avatar, sem o anel do UserIcon: cabeça e ombros centrados no
// viewBox (de y=4 a y=20), para ficar no meio exato de um fundo redondo.
export const AvatarIcon = (props) => (
  <svg {...base} fill="currentColor" stroke="none" {...props}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5Z" />
  </svg>
)

export const PersonIcon = (props) => (
  <svg {...base} {...props}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
  </svg>
)

export const MailIcon = (props) => (
  <svg {...base} {...props}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3.5 6.5 8.5 6.5 8.5-6.5" />
  </svg>
)

export const CallIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M5 3.5h3.2l1.6 4.2-2.2 1.4a11 11 0 0 0 5.3 5.3l1.4-2.2 4.2 1.6V17a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 3 5.7 2 2 0 0 1 5 3.5Z" />
  </svg>
)

export const CalendarIcon = (props) => (
  <svg {...base} {...props}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </svg>
)

export const PencilIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M4 20l1-4.5L15.5 5a2.1 2.1 0 0 1 3 3L8 18.5 4 20Z" />
    <path d="M13.5 7l3 3" />
  </svg>
)

export const TrashIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M4 6.5h16M9.5 6.5V4.5h5v2M6 6.5l1 13a1.5 1.5 0 0 0 1.5 1.4h7a1.5 1.5 0 0 0 1.5-1.4l1-13" />
    <path d="M10 10.5v6M14 10.5v6" />
  </svg>
)

export const ShieldUserIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.2-7.5 9.5-4.3-1.3-7.5-4.9-7.5-9.5V6L12 3Z" />
    <circle cx="12" cy="10" r="2.2" />
    <path d="M8.3 16c.8-1.5 2.1-2.3 3.7-2.3s2.9.8 3.7 2.3" />
  </svg>
)

export const ArrowRightIcon = (props) => (
  <svg {...base} strokeWidth={2.2} {...props}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)

// Logos das redes do login (traçados do Simple Icons). São preenchidos e de uma
// cor só: pegam a cor do texto, como os outros ícones.
const logo = { viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': true }

export const GoogleIcon = (props) => (
  <svg {...logo} {...props}>
    <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
  </svg>
)

export const DiscordIcon = (props) => (
  <svg {...logo} {...props}>
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.865-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
)

export const GithubIcon = (props) => (
  <svg {...logo} {...props}>
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
)

export const ChevronDownIcon = (props) => (
  <svg {...base} strokeWidth={2.4} {...props}>
    <path d="m6 9 6 6 6-6" />
  </svg>
)

export const LightbulbIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M9 18h6M10 21h4" />
    <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2v.1h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3Z" />
  </svg>
)

// Dois alfinetes: a distância entre onde a pessoa está e onde vai buscar.
export const RouteIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M7 21s-4-3.4-4-6.6a4 4 0 0 1 8 0C11 17.6 7 21 7 21Z" />
    <circle cx="7" cy="14.4" r="1.3" />
    <path d="M17 14s-4-3.4-4-6.6a4 4 0 0 1 8 0C21 10.6 17 14 17 14Z" />
    <circle cx="17" cy="7.4" r="1.3" />
  </svg>
)

export const FilterIcon = (props) => (
  <svg {...base} strokeWidth={2} {...props}>
    <path d="M4 6h16M4 10h12M4 14h8M4 18h4" />
  </svg>
)

export const WinkIcon = (props) => (
  <svg {...base} strokeWidth={2} {...props}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="9" cy="10" r="1.1" fill="currentColor" stroke="none" />
    <path d="M14 10h2.8M9.5 15.8c2.4 1 5 .2 6.5-2.3" />
  </svg>
)
