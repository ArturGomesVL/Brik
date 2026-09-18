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

export const StarIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9L12 2.5Z" />
  </svg>
)
