import type { SVGProps } from 'react'

type IconProps = {
  size?: number
  strokeWidth?: number
  className?: string
  title?: string
}

function Svg({
  size = 20,
  strokeWidth = 2,
  className,
  title,
  children,
  ...rest
}: IconProps & SVGProps<SVGSVGElement> & { children: React.ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={title ? undefined : true}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  )
}

export const Home = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 9.5 12 3l9 6.5" />
    <path d="M5 10v10h14V10" />
    <path d="M9 20v-6h6v6" />
  </Svg>
)
export const Sprout = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 20h10" />
    <path d="M12 20v-8" />
    <path d="M12 12C12 8 9 6 5 6c0 4 3 6 7 6Z" />
    <path d="M12 12c0-3 2.5-5 6-5 0 3-2.5 5-6 5Z" />
  </Svg>
)
export const Wallet = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 7a2 2 0 0 1 2-2h13v4" />
    <path d="M3 7v10a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2Z" />
    <circle cx="16.5" cy="14" r="1.2" />
  </Svg>
)
export const Boxes = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 8 7 5.5 2 8l5 2.5L12 8Z" />
    <path d="M22 8l-5-2.5L12 8l5 2.5L22 8Z" />
    <path d="M17 15.5 12 18l-5-2.5" />
    <path d="M2 8v5l5 2.5M22 8v5l-5 2.5M12 8v5" />
  </Svg>
)
export const ShoppingCart = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9" cy="20" r="1.4" />
    <circle cx="18" cy="20" r="1.4" />
    <path d="M2 3h2l2.4 12.4a1.5 1.5 0 0 0 1.5 1.2h8.7a1.5 1.5 0 0 0 1.5-1.2L21 7H5.2" />
  </Svg>
)
export const ShieldCheck = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-3Z" />
    <path d="m9 12 2 2 4-4" />
  </Svg>
)
export const Moon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 14a8 8 0 1 1-9-9 6 6 0 0 0 9 9Z" />
  </Svg>
)
export const Languages = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 5h9" />
    <path d="M8 3v2c0 4-2 7-5 8" />
    <path d="M6 9c0 3 3 5 7 6" />
    <path d="m12 20 4-9 4 9" />
    <path d="M13.5 17h5" />
  </Svg>
)
export const Bell = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
    <path d="M10 19a2 2 0 0 0 4 0" />
  </Svg>
)
export const ChevronRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="m9 6 6 6-6 6" />
  </Svg>
)
export const ChevronLeft = (p: IconProps) => (
  <Svg {...p}>
    <path d="m15 6-6 6 6 6" />
  </Svg>
)
export const ChevronsLeft = (p: IconProps) => (
  <Svg {...p}>
    <path d="m11 6-6 6 6 6" />
    <path d="m18 6-6 6 6 6" />
  </Svg>
)
export const ChevronsRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="m6 6 6 6-6 6" />
    <path d="m13 6 6 6-6 6" />
  </Svg>
)
export const ChevronDown = (p: IconProps) => (
  <Svg {...p}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
)
export const Check = (p: IconProps) => (
  <Svg {...p}>
    <path d="m5 12 5 5L20 6" />
  </Svg>
)
export const X = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
)
export const FileText = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 2h8l4 4v16H6Z" />
    <path d="M14 2v4h4" />
    <path d="M9 12h6M9 16h6" />
  </Svg>
)
export const Send = (p: IconProps) => (
  <Svg {...p}>
    <path d="M21 3 3 10.5 10 13l2.5 7L21 3Z" />
    <path d="M10 13 21 3" />
  </Svg>
)
export const History = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 4v4h4" />
    <path d="M12 8v4l3 2" />
  </Svg>
)
export const Search = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Svg>
)
export const AlertTriangle = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3 2 20h20L12 3Z" />
    <path d="M12 9v5M12 17h.01" />
  </Svg>
)
export const Undo2 = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 7 4 12l5 5" />
    <path d="M4 12h11a5 5 0 0 1 0 10h-3" />
  </Svg>
)
export const Info = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </Svg>
)
export const CalendarDays = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 9h18M8 3v4M16 3v4" />
    <path d="M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01" />
  </Svg>
)
export const Pencil = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
    <path d="m14 6 4 4" />
  </Svg>
)
export const Plus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
)
export const Save = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 3h12l4 4v14H5Z" />
    <path d="M8 3v5h8V3" />
    <path d="M8 21v-6h8v6" />
  </Svg>
)
export const Trash2 = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
    <path d="M10 11v6M14 11v6" />
  </Svg>
)
export const SlidersHorizontal = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 8h9M17 8h3M4 16h3M11 16h9" />
    <circle cx="15" cy="8" r="2" />
    <circle cx="9" cy="16" r="2" />
  </Svg>
)
export const Settings2 = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 7h11M19 7h1M4 17h1M9 17h11" />
    <circle cx="17" cy="7" r="2" />
    <circle cx="7" cy="17" r="2" />
  </Svg>
)
export const MapPin = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 21s-7-6.4-7-11a7 7 0 0 1 14 0c0 4.6-7 11-7 11Z" />
    <circle cx="12" cy="10" r="2.5" />
  </Svg>
)
export const Route = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="6" cy="19" r="2.5" />
    <circle cx="18" cy="5" r="2.5" />
    <path d="M8.5 19H14a3.5 3.5 0 0 0 0-7H10a3.5 3.5 0 0 1 0-7h5.5" />
  </Svg>
)
export const ExternalLink = (p: IconProps) => (
  <Svg {...p}>
    <path d="M15 3h6v6" />
    <path d="M10 14 21 3" />
    <path d="M18 13v8H3V6h8" />
  </Svg>
)
export const Eye = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
)
export const GripVertical = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9" cy="6" r="1" />
    <circle cx="9" cy="12" r="1" />
    <circle cx="9" cy="18" r="1" />
    <circle cx="15" cy="6" r="1" />
    <circle cx="15" cy="12" r="1" />
    <circle cx="15" cy="18" r="1" />
  </Svg>
)
export const Clock = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Svg>
)
export const Coins = (p: IconProps) => (
  <Svg {...p}>
    <ellipse cx="8" cy="6" rx="6" ry="3" />
    <path d="M2 6v6c0 1.7 2.7 3 6 3s6-1.3 6-3V6" />
    <path d="M2 12c0 1.7 2.7 3 6 3" />
    <ellipse cx="16" cy="14" rx="6" ry="3" />
    <path d="M10 14v4c0 1.7 2.7 3 6 3s6-1.3 6-3v-4" />
  </Svg>
)

export const Play = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 4.5v15l12-7.5-12-7.5Z" />
  </Svg>
)

export const RotateCcw = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 4v4h4" />
  </Svg>
)

export const Receipt = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 3v18l2-1.2L9 21l2-1.2L13 21l2-1.2L17 21l2-1.2V3l-2 1.2L15 3l-2 1.2L11 3 9 4.2 7 3Z" />
    <path d="M8 8h8" />
    <path d="M8 12h8" />
    <path d="M8 16h5" />
  </Svg>
)
export const Lock = (p: IconProps) => (
  <Svg {...p}>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </Svg>
)
export const Link2 = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 17H7A5 5 0 0 1 7 7h2" />
    <path d="M15 7h2a5 5 0 0 1 0 10h-2" />
    <path d="M8 12h8" />
  </Svg>
)
export const Copy = (p: IconProps) => (
  <Svg {...p}>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h10" />
  </Svg>
)

export const Truck = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 6.5h11v9H3z" />
    <path d="M14 9.5h3.5l3 3v3H14" />
    <circle cx="7" cy="17.5" r="1.75" />
    <circle cx="17" cy="17.5" r="1.75" />
  </Svg>
)
export const Wrench = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14.7 6.3a4 4 0 0 0 5 5L21 12.6a6 6 0 0 1-7.6 1.8L7 20.8a2 2 0 0 1-2.8-2.8l6.4-6.4A6 6 0 0 1 12.4 4l1.3 1.3Z" />
  </Svg>
)
export const ArrowLeftRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 3 4 7l4 4" />
    <path d="M4 7h16" />
    <path d="m16 21 4-4-4-4" />
    <path d="M20 17H4" />
  </Svg>
)
export const RefreshCw = (p: IconProps) => (
  <Svg {...p}>
    <path d="M21 12a9 9 0 0 0-15-6.7L3 8" />
    <path d="M3 3v5h5" />
    <path d="M3 12a9 9 0 0 0 15 6.7l3-2.7" />
    <path d="M16 16h5v5" />
  </Svg>
)
export const LayoutGrid = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </Svg>
)
export const Printer = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 9V3h12v6" />
    <rect x="3" y="9" width="18" height="8" rx="2" />
    <path d="M6 14h12v7H6z" />
  </Svg>
)
export const Mail = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </Svg>
)
export const Unlink = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 17H7A5 5 0 0 1 7 7h2" />
    <path d="M15 7h2a5 5 0 0 1 0 10h-2" />
    <path d="M4 4l16 16" />
  </Svg>
)
export const Calculator = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="2" width="16" height="20" rx="2" />
    <line x1="8" x2="16" y1="6" y2="6" />
    <line x1="16" x2="16" y1="14" y2="18" />
    <path d="M16 10h.01M12 10h.01M8 10h.01M12 14h.01M8 14h.01M12 18h.01M8 18h.01" />
  </Svg>
)
