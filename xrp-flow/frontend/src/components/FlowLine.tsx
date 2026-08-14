interface FlowLineProps {
  /** 0-100. When provided, renders as a filled progress bar (reputation use). */
  progress?: number;
  /** Renders tier tick marks (Bronze / Silver / Gold) beneath the bar. */
  showTierLabels?: boolean;
  className?: string;
}

/**
 * The signature XRP Flow visual: a glowing blue-to-teal line representing
 * capital moving from XRP -> FXRP -> the winning protocol.
 *
 * With no `progress`, it renders as an ambient animated line (used in the
 * landing page's dashboard preview). With `progress`, it renders as a
 * filled progress bar — reused on the dashboard's reputation card.
 */
export default function FlowLine({
  progress,
  showTierLabels = false,
  className = "",
}: FlowLineProps) {
  const isProgressBar = typeof progress === "number";
  const clamped = isProgressBar ? Math.min(100, Math.max(0, progress!)) : 100;

  return (
    <div className={className}>
      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-bg-surface">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary-blue via-accent-teal to-primary-blue bg-[length:200%_100%] animate-flow-pulse transition-[width] duration-700 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showTierLabels && (
        <div className="mt-2 flex justify-between text-xs font-medium text-text-muted">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-tier-bronze" />
            Bronze
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-tier-silver" />
            Silver
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-tier-gold" />
            Gold
          </span>
        </div>
      )}
    </div>
  );
}