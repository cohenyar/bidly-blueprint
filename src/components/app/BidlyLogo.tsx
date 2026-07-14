type BidlyLogoProps = {
  /** Renders the mark on a primary-colored surface. */
  onPrimary?: boolean;
  className?: string;
};

/**
 * Bidly wordmark. Uses only semantic tokens so it inverts cleanly
 * on primary surfaces and in dark mode.
 */
export function BidlyLogo({ onPrimary = false, className = "" }: BidlyLogoProps) {
  const textColor = onPrimary ? "text-primary-foreground" : "text-foreground";
  const markBg = onPrimary ? "bg-primary-foreground" : "bg-primary";
  const markFg = onPrimary ? "text-primary" : "text-primary-foreground";

  return (
    <span
      className={`inline-flex items-center gap-2 font-semibold tracking-tight ${textColor} ${className}`}
      aria-label="Bidly"
    >
      <span
        aria-hidden="true"
        className={`inline-flex h-7 w-7 items-center justify-center rounded-md ${markBg} ${markFg}`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <path d="M4 17l6-6 4 4 6-8" />
          <path d="M14 7h6v6" />
        </svg>
      </span>
      <span className="text-lg leading-none">Bidly</span>
    </span>
  );
}
