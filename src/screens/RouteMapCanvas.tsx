import { useEffect, useMemo, useRef, useState } from 'react'
import { TOLL_ROWS, type Farmer } from '../data'

export const SRC_KEY = '__source__'

/* -------------------------------------------------------------------- */
/* Google-Maps-style regional map with clickable nearby farmers         */
/* -------------------------------------------------------------------- */

const COORDS: Record<string, { x: number; y: number }> = {
  // farmers (stops / nearby) — spread through the middle band
  'Tiago Oliveira': { x: 600, y: 300 },
  'Mateus Ferreira': { x: 690, y: 250 },
  'Lucas Schneider': { x: 772, y: 224 },
  'Rafael Bortolini': { x: 520, y: 392 },
  'Helena Kunz': { x: 430, y: 340 },
  'Bruno Wagner': { x: 470, y: 470 },
  'Camila Reis': { x: 360, y: 300 },
  'Otávio Lima': { x: 640, y: 392 },
  // transporter base (source)
  [SRC_KEY]: { x: 860, y: 180 },
  // buying / billing stations (destinations)
  'Posto de Compra': { x: 200, y: 470 },
  'Armazém Vale do Sol': { x: 250, y: 330 },
  'Unidade Rio Pardo': { x: 180, y: 560 },
  'Estação Venâncio Aires': { x: 340, y: 520 },
}

type Pt = { x: number; y: number }
type RouteStop = Farmer & { color?: string; label?: string; removable?: boolean }

// Turn each straight leg into an L-shaped elbow so the line runs along the
// street grid (horizontal + vertical) instead of cutting diagonally.
function elbows(pts: Pt[]): Pt[] {
  const out: Pt[] = [pts[0]]
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]
    const b = pts[i]
    const horizFirst = Math.abs(b.x - a.x) >= Math.abs(b.y - a.y)
    out.push(horizFirst ? { x: b.x, y: a.y } : { x: a.x, y: b.y })
    out.push(b)
  }
  return out
}

// Polyline with rounded corners — reads like a real road-following route.
function roadPath(input: Pt[], r = 16): string {
  const p = input.filter(
    (pt, i) => i === 0 || pt.x !== input[i - 1].x || pt.y !== input[i - 1].y,
  )
  if (p.length < 2) return ''
  const d = [`M${p[0].x} ${p[0].y}`]
  for (let i = 1; i < p.length - 1; i++) {
    const A = p[i - 1]
    const B = p[i]
    const C = p[i + 1]
    const dAB = Math.hypot(B.x - A.x, B.y - A.y)
    const dBC = Math.hypot(C.x - B.x, C.y - B.y)
    if (dAB === 0 || dBC === 0) {
      d.push(`L${B.x} ${B.y}`)
      continue
    }
    const r1 = Math.min(r, dAB / 2)
    const r2 = Math.min(r, dBC / 2)
    const inX = B.x + ((A.x - B.x) / dAB) * r1
    const inY = B.y + ((A.y - B.y) / dAB) * r1
    const outX = B.x + ((C.x - B.x) / dBC) * r2
    const outY = B.y + ((C.y - B.y) / dBC) * r2
    d.push(`L${inX} ${inY}`)
    d.push(`Q${B.x} ${B.y} ${outX} ${outY}`)
  }
  const last = p[p.length - 1]
  d.push(`L${last.x} ${last.y}`)
  return d.join(' ')
}

// Toll plazas positioned along the route corridor (index-matched to TOLL_ROWS).
const TOLL_POS: Pt[] = [
  { x: 762, y: 236 },
  { x: 610, y: 322 },
  { x: 452, y: 388 },
  { x: 300, y: 452 },
]

// Light building footprints for an urban feel.
const BUILDINGS: { x: number; y: number; w: number; h: number }[] = [
  { x: 96, y: 150, w: 34, h: 22 },
  { x: 136, y: 150, w: 20, h: 22 },
  { x: 96, y: 178, w: 24, h: 18 },
  { x: 126, y: 178, w: 30, h: 18 },
  { x: 96, y: 202, w: 54, h: 16 },
  { x: 60, y: 150, w: 28, h: 46 },
  { x: 168, y: 150, w: 22, h: 30 },
  { x: 820, y: 560, w: 30, h: 20 },
  { x: 858, y: 560, w: 24, h: 20 },
  { x: 820, y: 586, w: 62, h: 16 },
]

// Woven residential street grid — reads as a zoomed-out Google-Maps area.
const MINOR: string[] = (() => {
  const p: string[] = []
  for (let y = 64; y < 660; y += 60)
    p.push(`M-20 ${y} Q 250 ${y - 12} 500 ${y} T 1020 ${y}`)
  for (let x = 58; x < 1000; x += 82)
    p.push(`M${x} -20 Q ${x + 12} 250 ${x} 500 T ${x} 680`)
  return p
})()

// Wider arterials
const ARTERIALS: string[] = [
  'M150 680 C 250 520 360 320 460 150 C 500 84 512 20 520 -20',
  'M-20 306 C 210 330 380 300 560 334 S 860 366 1020 352',
  'M712 -20 C 728 160 742 320 748 452 S 760 600 756 680',
]

// Muted green park polygons
const PARKS: string[] = [
  'M756 -20 L1020 -20 L1020 680 L826 680 C 788 566 806 470 772 388 C 748 306 800 182 782 78 C 776 26 764 4 756 -20 Z',
  'M-20 -20 L250 -20 C 206 62 122 96 42 116 C 10 124 -20 126 -20 126 Z',
  'M-20 520 C 118 500 202 560 262 602 C 302 628 322 652 332 680 L-20 680 Z',
]

export function MapCanvas({
  stops,
  nearby,
  onAdd,
  onRemove,
  sourceName,
  dest,
  focus,
  onFocus,
  activeTollIdx,
  stopColor = '#1a73e8',
  destinationColor = '#7c3aed',
  destinationLabel,
  extraMarkers = [],
}: {
  stops: RouteStop[]
  nearby: Farmer[]
  onAdd: (f: Farmer) => void
  onRemove: (name: string) => void
  sourceName: string
  dest: Farmer
  focus: string | null
  onFocus: (name: string | null) => void
  activeTollIdx: number[]
  stopColor?: string
  destinationColor?: string
  destinationLabel?: string
  extraMarkers?: { name: string; label: string; color: string }[]
}) {
  const [hover, setHover] = useState<string | null>(null)
  const [hoverStop, setHoverStop] = useState<string | null>(null)
  const [hoverToll, setHoverToll] = useState<number | null>(null)
  const [view, setView] = useState({ k: 0.86, tx: 70, ty: 46.2 })
  const [animate, setAnimate] = useState(true)

  const src = COORDS[SRC_KEY]
  const destC = COORDS[dest.name] ?? COORDS['Posto de Compra']
  // Live route geometry — reflects add / remove / reorder / destination.
  const routePts = useMemo(
    () => [src, ...stops.map((s) => COORDS[s.name]).filter(Boolean), destC],
    [src, stops, destC],
  )
  const routeD = useMemo(() => roadPath(elbows(routePts)), [routePts])

  const svgRef = useRef<SVGSVGElement>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<{ dist: number; mid: { x: number; y: number } } | null>(null)
  const suppressClick = useRef(false)

  // client px -> pre-transform viewBox (user) coordinate
  const toUser = (clientX: number, clientY: number) => {
    const el = svgRef.current
    if (!el) return { x: 0, y: 0, s: 1 }
    const r = el.getBoundingClientRect()
    const s = Math.max(r.width / 1000, r.height / 660)
    const offX = (r.width - 1000 * s) / 2
    const offY = (r.height - 660 * s) / 2
    return {
      x: (clientX - r.left - offX) / s,
      y: (clientY - r.top - offY) / s,
      s,
    }
  }

  const clamp = (k: number, tx: number, ty: number) => {
    const kk = Math.min(6, Math.max(0.62, k))
    const bx = 1000 * (1 - kk)
    const by = 660 * (1 - kk)
    return {
      k: kk,
      tx: Math.min(Math.max(0, bx), Math.max(Math.min(0, bx), tx)),
      ty: Math.min(Math.max(0, by), Math.max(Math.min(0, by), ty)),
    }
  }

  // zoom keeping the user-space focal point pinned under the cursor/fingers
  const zoomAt = (factor: number, ux: number, uy: number) =>
    setView((v) => {
      const nk = Math.min(6, Math.max(0.62, v.k * factor))
      return clamp(nk, v.tx + (v.k - nk) * ux, v.ty + (v.k - nk) * uy)
    })

  // Focus-driven fly-to (row / pin click) or fit-the-route framing (centered).
  useEffect(() => {
    setAnimate(true)
    const fc = focus ? COORDS[focus] : null
    if (fc) {
      const k = 2.4
      setView(clamp(k, 500 - k * fc.x, 330 - k * fc.y))
      return
    }
    // Fit the whole route into the middle of the map.
    const xs = routePts.map((p) => p.x)
    const ys = routePts.map((p) => p.y)
    const pad = 130
    const minX = Math.min(...xs) - pad
    const maxX = Math.max(...xs) + pad
    const minY = Math.min(...ys) - pad
    const maxY = Math.max(...ys) + pad
    const k = Math.min(1000 / (maxX - minX), 660 / (maxY - minY))
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2
    setView(clamp(k, 500 - k * cx, 330 - k * cy))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, routeD])

  // non-passive wheel zoom
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      setAnimate(false)
      const u = toUser(e.clientX, e.clientY)
      zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, u.x, u.y)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    suppressClick.current = false
    setAnimate(false)
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinch.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      }
    }
  }

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const prev = pointers.current.get(e.pointerId)
    if (!prev) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      const u = toUser(mid.x, mid.y)
      const prevU = toUser(pinch.current.mid.x, pinch.current.mid.y)
      const factor = dist / pinch.current.dist
      suppressClick.current = true
      setView((v) => {
        const nk = Math.min(6, Math.max(0.62, v.k * factor))
        return clamp(
          nk,
          v.tx + (v.k - nk) * u.x + (u.x - prevU.x),
          v.ty + (v.k - nk) * u.y + (u.y - prevU.y),
        )
      })
      pinch.current = { dist, mid }
      return
    }

    // single-pointer pan
    const dx = e.clientX - prev.x
    const dy = e.clientY - prev.y
    if (Math.hypot(dx, dy) > 2) suppressClick.current = true
    const el = svgRef.current
    const r = el?.getBoundingClientRect()
    const s = r ? Math.max(r.width / 1000, r.height / 660) : 1
    setView((v) => clamp(v.k, v.tx + dx / s, v.ty + dy / s))
  }

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinch.current = null
    if (suppressClick.current) setTimeout(() => (suppressClick.current = false), 0)
  }

  const guard = (fn: () => void) => () => {
    if (suppressClick.current) return
    fn()
  }

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 1000 660"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full cursor-grab touch-none select-none active:cursor-grabbing"
      role="img"
      aria-label="Regional road map with the optimal route and nearby farmers you can add. Drag to pan, pinch or scroll to zoom."
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <defs>
        <filter id="mpin" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#123" floodOpacity=".35" />
        </filter>
      </defs>

      <g
        style={{
          transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.k})`,
          transition: animate ? 'transform .55s cubic-bezier(.4,0,.2,1)' : 'none',
        }}
      >

      {/* Google-like land base — click empty map to reset zoom */}
      <rect width="1000" height="660" fill="#f1f3f4" onClick={guard(() => onFocus(null))} />

      {/* parks / green areas */}
      <g fill="#cfe4c5">
        {PARKS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      {/* lake inside the eastern park */}
      <path
        d="M900 260 C 960 250 990 300 966 350 C 944 396 876 400 850 356 C 828 318 852 268 900 260 Z"
        fill="#a9d4f5"
      />
      {/* faint water sliver in a corner */}
      <path
        d="M-20 96 C 90 108 150 150 150 220 C 150 150 96 130 -20 138 Z"
        fill="#aad3f2"
      />

      {/* building footprints */}
      <g fill="#e4e6e9">
        {BUILDINGS.map((b, i) => (
          <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx="2" />
        ))}
      </g>

      {/* minor streets — casing then white fill */}
      <g fill="none" strokeLinecap="round">
        {MINOR.map((d) => (
          <path key={`c${d}`} d={d} stroke="#dadce0" strokeWidth="3.4" />
        ))}
        {MINOR.map((d) => (
          <path key={`f${d}`} d={d} stroke="#ffffff" strokeWidth="2.1" />
        ))}
      </g>

      {/* arterials — casing then fill */}
      <g fill="none" strokeLinecap="round">
        {ARTERIALS.map((d) => (
          <path key={`ac${d}`} d={d} stroke="#d2d5da" strokeWidth="8.5" />
        ))}
        {ARTERIALS.map((d) => (
          <path key={`af${d}`} d={d} stroke="#ffffff" strokeWidth="6" />
        ))}
      </g>

      {/* highway — pale cream like a state road */}
      <g fill="none" strokeLinecap="round">
        <path
          d="M300 410C400 452 500 512 580 518s150-8 230-2 150 6 240-30 200-96 290-120"
          stroke="#e7dcac"
          strokeWidth="12"
        />
        <path
          d="M300 410C400 452 500 512 580 518s150-8 230-2 150 6 240-30 200-96 290-120"
          stroke="#faf3d8"
          strokeWidth="8"
        />
      </g>

      {/* LIVE ROUTE (Google blue, white cased) — follows source→stops→destination */}
      <path
        d={routeD}
        fill="none"
        stroke="#ffffff"
        strokeWidth="9.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={routeD}
        fill="none"
        stroke="#1a73e8"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* road & place labels — muted Google grey */}
      <g fontFamily="Inter, Arial" fill="#5f6368">
        <g transform="rotate(-58 470 240)">
          <text x="470" y="240" fontSize="12" fontWeight="500" textAnchor="middle">
            Av. Vera Cruz
          </text>
        </g>
        <g transform="rotate(6 300 322)">
          <text x="300" y="322" fontSize="12" fontWeight="500" textAnchor="middle">
            RSC-287
          </text>
        </g>
        <text x="676" y="120" fontSize="12.5" fontWeight="600" fill="#3c4043">
          Sinimbu
        </text>
        <text x="470" y="250" fontSize="12.5" fontWeight="600" fill="#3c4043">
          Rio Pardo
        </text>
        <text x="880" y="470" fontSize="12.5" fontWeight="600" fill="#5f8a4e">
          Parque do Vale
        </text>
        <text x="150" y="620" fontSize="12" fontWeight="500">
          Bairro Boa Vista
        </text>
      </g>

      {/* NEARBY farmers — clickable to add */}
      {nearby.map((f) => {
        const c = COORDS[f.name]
        if (!c) return null
        const isHover = hover === f.name
        return (
          <g
            key={f.name}
            transform={`translate(${c.x},${c.y})`}
            className="cursor-pointer"
            onMouseEnter={() => setHover(f.name)}
            onMouseLeave={() => setHover(null)}
            onClick={guard(() => onAdd(f))}
          >
            <circle
              r="13"
              fill="#fff"
              stroke="#168a4a"
              strokeWidth="2.5"
              filter="url(#mpin)"
              opacity={isHover ? 1 : 0.95}
            />
            <path
              d="M0 -6V6M-6 0H6"
              stroke="#168a4a"
              strokeWidth="2.6"
              strokeLinecap="round"
            />
            {isHover && (
              <g transform="translate(0,-22)">
                <rect
                  x="-70"
                  y="-20"
                  width="140"
                  height="34"
                  rx="7"
                  fill="#102a56"
                  filter="url(#mpin)"
                />
                <text
                  x="0"
                  y="-6"
                  fontFamily="Inter, Arial"
                  fontSize="11.5"
                  fontWeight="700"
                  fill="#fff"
                  textAnchor="middle"
                >
                  {f.name}
                </text>
                <text
                  x="0"
                  y="8"
                  fontFamily="Inter, Arial"
                  fontSize="10"
                  fill="#c9d6ea"
                  textAnchor="middle"
                >
                  Click to add · {f.city}
                </text>
              </g>
            )}
          </g>
        )
      })}

      {/* extra route-leg markers, such as a billing facility */}
      {extraMarkers.map((marker) => {
        const c = COORDS[marker.name]
        if (!c) return null
        return (
          <g key={`${marker.label}-${marker.name}`} transform={`translate(${c.x},${c.y})`}>
            <g filter="url(#mpin)">
              <path d="M0 34C0 34 16 16 16 4A16 16 0 1 0-16 4C-16 16 0 34 0 34Z" fill={marker.color} />
              <circle cx="0" cy="4" r="5.5" fill="#fff" />
            </g>
            <g fontFamily="Inter, Arial" transform="translate(0,-24)">
              <rect x={-68} y="-11" width="136" height="22" rx="6" fill="#fff" filter="url(#mpin)" />
              <text y="4" fontSize="11.5" fontWeight="700" fill={marker.color} textAnchor="middle">
                {marker.label}
              </text>
            </g>
          </g>
        )
      })}

      {/* destination — clickable, follows the selected station */}
      <g
        className="cursor-pointer"
        transform={`translate(${destC.x},${destC.y})`}
        onClick={guard(() => onFocus(dest.name))}
      >
        {focus === dest.name && (
          <circle cy="4" r="26" fill="none" stroke={destinationColor} strokeWidth="3" opacity=".4" />
        )}
        <g filter="url(#mpin)">
          <path d="M0 34C0 34 16 16 16 4A16 16 0 1 0-16 4C-16 16 0 34 0 34Z" fill={destinationColor} />
          <circle cx="0" cy="4" r="5.5" fill="#fff" />
        </g>
        <g fontFamily="Inter, Arial" transform="translate(0,-24)">
          <rect x={-Math.max(59, (destinationLabel ?? dest.name).length * 3.7)} y="-11" width={Math.max(118, (destinationLabel ?? dest.name).length * 7.4)} height="22" rx="6" fill="#fff" filter="url(#mpin)" />
          <text y="4" fontSize="12" fontWeight="700" fill={destinationColor} textAnchor="middle">
            {destinationLabel ?? dest.name}
          </text>
        </g>
      </g>

      {/* route stops — numbered blue pins at their coords */}
      {stops.map((f, i) => {
        const c = COORDS[f.name] ?? { x: 500 + i * 40, y: 470 }
        const isFocus = focus === f.name
        const isStopHover = hoverStop === f.name
        const markerColor = f.color ?? stopColor
        const markerLabel = f.label ?? f.city.replace(' - RS', '')
        return (
          <g
            key={f.name}
            transform={`translate(${c.x},${c.y})`}
            className="cursor-pointer"
            onMouseEnter={() => setHoverStop(f.name)}
            onMouseLeave={() => setHoverStop(null)}
            onClick={guard(() => onFocus(f.name))}
          >
            {isFocus && (
              <circle r="24" fill="none" stroke={markerColor} strokeWidth="3" opacity=".4" />
            )}
            <circle r="16" fill={markerColor} stroke="#fff" strokeWidth="2.5" filter="url(#mpin)" />
            <text
              y="5"
              fontFamily="Inter, Arial"
              fontSize="13"
              fontWeight="700"
              fill="#fff"
              textAnchor="middle"
            >
              {i + 1}
            </text>
            {/* remove control on hover — mirrors the panel's X */}
            {isStopHover && f.removable !== false && (
              <g
                transform="translate(14,-15)"
                onClick={(e) => {
                  e.stopPropagation()
                  if (suppressClick.current) return
                  onRemove(f.name)
                }}
              >
                <circle r="9" fill="#c23b3b" stroke="#fff" strokeWidth="2" filter="url(#mpin)" />
                <path d="M-3.2 -3.2 3.2 3.2M3.2 -3.2 -3.2 3.2" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
              </g>
            )}
            <g transform="translate(0,30)">
              <rect
                x={-Math.max(44, f.city.length * 3.6)}
                y="-11"
                width={Math.max(88, f.city.length * 7.2)}
                height="22"
                rx="6"
                fill="#fff"
                filter="url(#mpin)"
              />
              <text
                y="4"
                fontFamily="Inter, Arial"
                fontSize="11.5"
                fontWeight="600"
                fill="#202124"
                textAnchor="middle"
              >
                {markerLabel}
              </text>
            </g>
          </g>
        )
      })}

      {/* transporter base (home) — clickable */}
      <g
        className="cursor-pointer"
        transform={`translate(${src.x},${src.y})`}
        onClick={guard(() => onFocus(SRC_KEY))}
      >
        {focus === SRC_KEY && (
          <circle cy="4" r="26" fill="none" stroke="#1a73e8" strokeWidth="3" opacity=".4" />
        )}
        <g filter="url(#mpin)">
          <path d="M0 34C0 34 16 16 16 4A16 16 0 1 0-16 4C-16 16 0 34 0 34Z" fill="#1a73e8" />
          <path d="M0-6 -7 0.6V8h4.4V3.4h5.2V8H7V0.6z" fill="#fff" />
        </g>
        <g transform="translate(0,-24)">
          <rect x={-Math.max(48, sourceName.length * 3.6)} y="-11" width={Math.max(96, sourceName.length * 7.2)} height="22" rx="6" fill="#fff" filter="url(#mpin)" />
          <text y="4" fontFamily="Inter, Arial" fontSize="11.5" fontWeight="700" fill="#1a73e8" textAnchor="middle">
            {sourceName}
          </text>
        </g>
      </g>

      {/* highway shield */}
      <g fontFamily="Inter, Arial" fontSize="11" fontWeight="700" fill="#3c4043">
        <rect x="612" y="474" width="46" height="18" rx="4" fill="#fff" stroke="#bfc4c8" />
        <text x="635" y="487" textAnchor="middle">RSC-287</text>
      </g>

      {/* TOLL PLAZAS — only those on the current route; hover for name & fees */}
      {TOLL_ROWS.map((t, i) => {
        const c = TOLL_POS[i]
        if (!c || !activeTollIdx.includes(i)) return null
        const on = hoverToll === i
        return (
          <g
            key={t.plaza}
            transform={`translate(${c.x},${c.y})`}
            className="cursor-pointer"
            onMouseEnter={() => setHoverToll(i)}
            onMouseLeave={() => setHoverToll(null)}
          >
            {/* toll-gate badge */}
            <g filter="url(#mpin)">
              <rect
                x="-11"
                y="-11"
                width="22"
                height="22"
                rx="6"
                fill="#f9ab00"
                stroke="#fff"
                strokeWidth="2"
              />
              <path
                d="M-5.5 5V-2.5M5.5 5V-2.5M-7.5 -2.5H7.5"
                stroke="#fff"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </g>

            {on ? (
              <g transform="translate(0,-16)">
                <rect
                  x="-118"
                  y="-72"
                  width="236"
                  height="66"
                  rx="9"
                  fill="#102a56"
                  filter="url(#mpin)"
                />
                <text
                  x="-104"
                  y="-52"
                  fontFamily="Inter, Arial"
                  fontSize="12.5"
                  fontWeight="700"
                  fill="#fff"
                >
                  {t.plaza}
                </text>
                <text
                  x="-104"
                  y="-37"
                  fontFamily="Inter, Arial"
                  fontSize="10.5"
                  fill="#9db4d6"
                >
                  {t.road} · {t.kind}
                </text>
                <text
                  x="-104"
                  y="-19"
                  fontFamily="Inter, Arial"
                  fontSize="11"
                  fontWeight="600"
                  fill="#ffd76a"
                >
                  Car {t.car} · 2-axle {t.truck2} · 3+ {t.truck3}
                </text>
              </g>
            ) : (
              <g transform="translate(0,24)">
                <rect
                  x="-24"
                  y="-10"
                  width="48"
                  height="20"
                  rx="5"
                  fill="#fff"
                  filter="url(#mpin)"
                />
                <text
                  y="4"
                  fontFamily="Inter, Arial"
                  fontSize="10.5"
                  fontWeight="700"
                  fill="#b57900"
                  textAnchor="middle"
                >
                  {t.truck2}
                </text>
              </g>
            )}
          </g>
        )
      })}
      </g>
    </svg>
  )
}
