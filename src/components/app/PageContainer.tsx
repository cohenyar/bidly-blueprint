import type { HTMLAttributes, ReactNode } from "react";

type PageContainerProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

/**
 * Shared max-width wrapper used across Bidly pages.
 * Caps content at 1440px and applies responsive gutters.
 */
export function PageContainer({
  children,
  className = "",
  ...rest
}: PageContainerProps) {
  return (
    <div
      {...rest}
      className={`mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-10 ${className}`}
    >
      {children}
    </div>
  );
}
