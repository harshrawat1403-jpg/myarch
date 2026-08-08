/**
 * A decorative, `aria-hidden` line drawing for the hero's secondary panel —
 * two offset massing volumes in a light axonometric projection, a ground
 * datum with dimension ticks, and a single reference crosshair. Pure inline
 * SVG (no image asset, no object storage dependency) so it renders crisply
 * at any size. Deliberately abstract rather than a literal building icon —
 * a schematic massing diagram reads as "architecture studio," a cartoon
 * house icon would read as clip art.
 */
export function ArchitecturalElevation({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 360 360" fill="none" aria-hidden="true" className={className}>
      <g stroke="currentColor" strokeWidth="1">
        <line x1="20" y1="320" x2="340" y2="320" />
        {Array.from({ length: 17 }).map((_, i) => (
          <line key={i} x1={20 + i * 20} y1="320" x2={20 + i * 20} y2="326" />
        ))}

        <rect x="60" y="140" width="120" height="180" />
        <path d="M60 140 L90 110 L210 110 L180 140" />
        <path d="M180 140 L210 110 L210 260 L180 290" />

        <rect x="190" y="210" width="90" height="110" />
        <path d="M190 210 L212 190 L302 190 L280 210" />
        <path d="M280 210 L302 190 L302 240 L280 260" />

        <circle cx="300" cy="90" r="4" />
        <line x1="288" y1="90" x2="296" y2="90" />
        <line x1="304" y1="90" x2="312" y2="90" />
        <line x1="300" y1="78" x2="300" y2="86" />
        <line x1="300" y1="94" x2="300" y2="102" />
      </g>
    </svg>
  );
}
