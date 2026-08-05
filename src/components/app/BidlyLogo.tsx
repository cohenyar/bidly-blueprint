type BidlyLogoProps = {
  /** Renders the mark on a primary-colored surface. */
  onPrimary?: boolean;
  /** Renders only the symbol. */
  compact?: boolean;
  /** Hides the wordmark below the small breakpoint without changing header height. */
  compactOnMobile?: boolean;
  /** Uses one foreground color while preserving the two-shape silhouette. */
  monochrome?: boolean;
  className?: string;
};

/**
 * Bidly's matching mark: two complementary geometric ribbons meet at
 * the center and continue forward as one compact silhouette.
 */
export function BidlyLogo({
  onPrimary = false,
  compact = false,
  compactOnMobile = false,
  monochrome = false,
  className = "",
}: BidlyLogoProps) {
  const textColor = onPrimary ? "text-primary-foreground" : "text-foreground";
  const primaryShape = onPrimary ? "text-primary-foreground" : "text-primary";
  const accentShape = monochrome
    ? primaryShape
    : onPrimary
      ? "text-primary-foreground/65"
      : "text-success";

  return (
    <span
      role="img"
      aria-label="Bidly"
      className={`inline-flex shrink-0 items-center gap-2 font-semibold tracking-tight ${textColor} ${className}`}
    >
      <svg aria-hidden="true" focusable="false" viewBox="0 0 32 32" className="h-7 w-7 shrink-0">
        <path
          className={primaryShape}
          fill="currentColor"
          d="M5 5.5h8.4c1.1 0 2.2.45 3 1.24l6.1 6.1-4.58 4.58-5.2-5.2H5V5.5Z"
        />
        <path
          className={accentShape}
          fill="currentColor"
          opacity={monochrome ? 0.62 : 1}
          d="M27 26.5h-8.4c-1.1 0-2.2-.45-3-1.24l-6.1-6.1 4.58-4.58 5.2 5.2H27v6.72Z"
        />
      </svg>
      {!compact ? (
        <span className={`text-lg leading-none ${compactOnMobile ? "hidden sm:inline" : ""}`}>
          Bidly
        </span>
      ) : null}
    </span>
  );
}
