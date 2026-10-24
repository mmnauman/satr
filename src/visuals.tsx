import type { CSSProperties } from "react";

const PATHS: Record<string, string> = {
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z",
  dna: "M7 3c0 6 10 6 10 12M17 3c0 6-10 6-10 12M7 21c0-2 1-3.5 3-4.6M17 21c0-2-1-3.5-3-4.6M8.5 7h7M8.5 11h7",
  together: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c.6-3.4 3.3-5.5 6.5-5.5s5.9 2.1 6.5 5.5M16 4.3a3.5 3.5 0 0 1 0 6.4M18.5 14.8c1.6.8 2.7 2.6 3 5.2",
  pen: "M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16zM13.5 6.5l4 4",
  chat: "M4 5h16v11H9l-5 4z M8 9.5h8M8 12.5h5",
  lock: "M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3",
  unlock: "M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 6.8-1.2",
  check: "M5 12.5l4.5 4.5L19 7.5",
  x: "M6 6l12 12M18 6 6 18",
  eye: "M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  eyeOff: "M3 3l18 18M10.6 5.1A9.7 9.7 0 0 1 12 5c6 0 9.5 7 9.5 7a17 17 0 0 1-3 3.9M6.6 6.6C3.9 8.4 2.5 12 2.5 12S6 19 12 19c1.8 0 3.3-.5 4.6-1.2M9.9 9.9a3 3 0 0 0 4.2 4.2",
  sound: "M4 9.5h3.5L12 5.5v13l-4.5-4H4zM15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11",
  send: "M21 3 10 14M21 3l-7 18-4-7-7-4z",
  shield: "M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6z",
  shieldCheck: "M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6zM8.5 12l2.5 2.5 4.5-5",
  arrowRight: "M5 12h14M13 6l6 6-6 6",
  arrowLeft: "M19 12H5M11 6l-6 6 6 6",
  calendar: "M4 6h16v14H4zM4 10h16M8 3.5v4M16 3.5v4",
  court: "M3 9 12 4l9 5M5 9v9M9.7 9v9M14.3 9v9M19 9v9M3 20h18",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  steth: "M6 3v6a4 4 0 0 0 8 0V3M10 13v2.5a4.5 4.5 0 0 0 9 0V13M19 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3.5 9h17M3.5 15h17M12 3c2.5 2.6 3.5 5.6 3.5 9s-1 6.4-3.5 9c-2.5-2.6-3.5-5.6-3.5-9s1-6.4 3.5-9z",
  refresh: "M20 11a8 8 0 0 0-14.6-4.5L3 9M3 4v5h5M4 13a8 8 0 0 0 14.6 4.5L21 15M21 20v-5h-5",
  play: "M7 4.5v15l12-7.5z",
  sparkle: "M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5.5M12 7.5v.5",
  users: "M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2.5 19c.5-3 2.7-4.8 5.5-4.8s5 1.8 5.5 4.8M13.5 15.2c.8-.6 1.6-1 2.5-1 2.8 0 5 1.8 5.5 4.8",
  scan: "M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M4 12h16",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3.5 2",
  heart: "M12 20s-7.5-4.6-7.5-10A4.5 4.5 0 0 1 12 7.2 4.5 4.5 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z",
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, style, className }: { name: IconName; size?: number; style?: CSSProperties; className?: string }) {
  return (
    <svg
      className={className ? `icon ${className}` : "icon"}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

/** The wordmark: an eight-point star, the most familiar figure in Gulf geometric ornament, half veiled. */
export function Mark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className="mark">
      <rect x="9" y="9" width="22" height="22" rx="3" fill="currentColor" opacity="0.95" />
      <rect x="9" y="9" width="22" height="22" rx="3" fill="currentColor" opacity="0.95" transform="rotate(45 20 20)" />
      <circle cx="20" cy="20" r="6.5" fill="var(--mark-inner, #f5efe3)" />
      <path d="M20 13.5a6.5 6.5 0 0 1 0 13z" fill="currentColor" />
    </svg>
  );
}

export function Venn({ left, right, mid, privateLabel }: { left: string; right: string; mid: string; privateLabel: string }) {
  return (
    <svg className="venn" viewBox="0 0 520 380" role="img" aria-label={`${left}, ${right}: ${mid}`}>
      <defs>
        <radialGradient id="vg-l" cx="35%" cy="40%" r="70%">
          <stop offset="0" stopColor="#2c6e5d" stopOpacity="0.55" />
          <stop offset="1" stopColor="#0f3d33" stopOpacity="0.12" />
        </radialGradient>
        <radialGradient id="vg-r" cx="65%" cy="40%" r="70%">
          <stop offset="0" stopColor="#2c6e5d" stopOpacity="0.55" />
          <stop offset="1" stopColor="#0f3d33" stopOpacity="0.12" />
        </radialGradient>
        <clipPath id="vc-l">
          <circle cx="200" cy="190" r="140" />
        </clipPath>
      </defs>
      <circle cx="200" cy="190" r="140" fill="url(#vg-l)" stroke="#f5efe3" strokeOpacity="0.35" strokeWidth="1.5" />
      <circle cx="320" cy="190" r="140" fill="url(#vg-r)" stroke="#f5efe3" strokeOpacity="0.35" strokeWidth="1.5" />
      <circle cx="320" cy="190" r="140" fill="#d9a441" fillOpacity="0.85" clipPath="url(#vc-l)" className="venn-overlap" />

      <g className="venn-chip">
        <rect x="104" y="160" width="84" height="30" rx="15" fill="#0b2a24" fillOpacity="0.55" />
        <text x="146" y="180" textAnchor="middle" className="venn-gene">GJB2</text>
        <text x="146" y="214" textAnchor="middle" className="venn-small">{privateLabel}</text>
      </g>
      <g className="venn-chip">
        <rect x="332" y="160" width="84" height="30" rx="15" fill="#0b2a24" fillOpacity="0.55" />
        <text x="374" y="180" textAnchor="middle" className="venn-gene">MEFV</text>
        <text x="374" y="214" textAnchor="middle" className="venn-small">{privateLabel}</text>
      </g>
      <text x="260" y="186" textAnchor="middle" className="venn-gene venn-gene-dark">USH2A</text>
      <text x="260" y="208" textAnchor="middle" className="venn-small venn-small-dark">{mid}</text>

      <text x="130" y="36" textAnchor="middle" className="venn-label">{left}</text>
      <text x="390" y="36" textAnchor="middle" className="venn-label">{right}</text>
    </svg>
  );
}

function Person({ x, y, carrier, label, highlight }: { x: number; y: number; carrier: boolean; label: string; highlight?: boolean }) {
  return (
    <g>
      <circle cx={x} cy={y} r={highlight ? 25 : 21} fill={highlight ? "var(--surface)" : "var(--surface-2)"} stroke="var(--palm)" strokeWidth={highlight ? 2 : 1.4} />
      <circle cx={x} cy={y - 4} r="6.5" fill="var(--palm)" opacity="0.85" />
      <path d={`M${x - 11} ${y + 13} q11 -14 22 0`} fill="var(--palm)" opacity="0.85" />
      {carrier && <circle cx={x + 16} cy={y - 16} r="7" fill="var(--gold)" stroke="var(--surface)" strokeWidth="2" />}
      {label && (
        <text x={x} y={y + 44} textAnchor="middle" className="tree-label">
          {label}
        </text>
      )}
    </g>
  );
}

export function FamilyTree({ grand, layla, omar, carrier }: { grand: string; layla: string; omar: string; carrier: string }) {
  const line = { stroke: "var(--line-strong)", strokeWidth: 1.6, fill: "none" };
  return (
    <svg className="tree" viewBox="0 0 360 312" role="img" aria-label={`${grand} → ${layla}, ${omar}`}>
      <path d="M180 62 V92 M100 92 H260 M100 92 V128 M260 92 V128 M100 172 V202 M260 172 V202" {...line} />
      <path d="M100 236 Q180 290 260 236" {...line} strokeDasharray="4 5" />
      <path d="M180 62 V92 H100 V128 M100 172 V202" stroke="var(--gold)" strokeWidth="2.6" fill="none" className="tree-flow" />
      <path d="M180 92 H260 V128 M260 172 V202" stroke="var(--gold)" strokeWidth="2.6" fill="none" className="tree-flow" />
      <Person x={180} y={40} carrier label="" />
      <text x="216" y="44" className="tree-label">
        {grand}
      </text>
      <Person x={100} y={150} carrier label="" />
      <Person x={260} y={150} carrier label="" />
      <Person x={100} y={224} carrier label={layla} highlight />
      <Person x={260} y={224} carrier label={omar} highlight />
      <circle cx="24" cy="290" r="6" fill="var(--gold)" />
      <text x="36" y="294" className="tree-legend">
        {carrier}
      </text>
    </svg>
  );
}

function Child({ kind }: { kind: "affected" | "carrier" | "neither" }) {
  const fill = kind === "affected" ? "var(--clay)" : kind === "carrier" ? "var(--gold)" : "var(--palm-3)";
  return (
    <svg viewBox="0 0 48 64" className="child" aria-hidden="true">
      <circle cx="24" cy="16" r="10" fill={fill} />
      <path d="M8 60c0-14 7-24 16-24s16 10 16 24z" fill={fill} />
      {kind === "carrier" && <circle cx="24" cy="48" r="5" fill="var(--surface)" />}
    </svg>
  );
}

export function RiskPicture({ affected, carrier, neither }: { affected: string; carrier: string; neither: string }) {
  return (
    <div className="risk">
      <div className="risk-kids">
        <figure>
          <Child kind="affected" />
          <figcaption>
            <strong>1 in 4</strong>
            <span>{affected}</span>
          </figcaption>
        </figure>
        <figure className="risk-pair">
          <div>
            <Child kind="carrier" />
            <Child kind="carrier" />
          </div>
          <figcaption>
            <strong>2 in 4</strong>
            <span>{carrier}</span>
          </figcaption>
        </figure>
        <figure>
          <Child kind="neither" />
          <figcaption>
            <strong>1 in 4</strong>
            <span>{neither}</span>
          </figcaption>
        </figure>
      </div>
    </div>
  );
}

export function Seal({ size = 120 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true" className="seal">
      <g className="seal-spin">
        {Array.from({ length: 16 }, (_, i) => (
          <rect key={i} x="57" y="4" width="6" height="14" rx="3" fill="var(--gold)" opacity={0.25 + (i % 4) * 0.15} transform={`rotate(${i * 22.5} 60 60)`} />
        ))}
      </g>
      <circle cx="60" cy="60" r="36" fill="var(--palm)" />
      <rect x="47" y="47" width="26" height="26" rx="3" fill="var(--gold)" />
      <rect x="47" y="47" width="26" height="26" rx="3" fill="var(--gold)" transform="rotate(45 60 60)" />
      <path d="M55 58v-3a5 5 0 0 1 10 0v3M53 58h14v10H53z" fill="none" stroke="var(--palm)" strokeWidth="2.4" strokeLinejoin="round" />
    </svg>
  );
}
