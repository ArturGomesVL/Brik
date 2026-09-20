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
