/**
 * Four small L-shaped registration marks at the corners of a `relative`
 * parent — the corner brackets found on technical drawing plates and
 * printer's crop marks. A recurring accent motif ("this is a drawn plate,
 * not a stock photo card") applied sparingly to the page's few emphasized
 * frames (the hero's diagram panel, the closing CTA panel, the showcase
 * placeholders) rather than on every card, so it stays a signature rather
 * than noise.
 */
export function FrameCorners({ className = "" }: { className?: string }) {
  const corner = "absolute h-4 w-4 border-(--color-accent)/60";
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 ${className}`}>
      <span className={`${corner} left-0 top-0 border-l border-t`} />
      <span className={`${corner} right-0 top-0 border-r border-t`} />
      <span className={`${corner} bottom-0 left-0 border-b border-l`} />
      <span className={`${corner} bottom-0 right-0 border-b border-r`} />
    </div>
  );
}
