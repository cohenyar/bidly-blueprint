import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Image as ImageIcon } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  getPortfolioImageUrl,
  getPortfolioSourceType,
  isValidHttpsPortfolioUrl,
} from "@/lib/supplier-portfolio";
import { cn } from "@/lib/utils";

export function SupplierPortfolioGallery({
  items,
  limit,
  className,
  emptyLabel = "עדיין לא נוספו פריטים לתיק העבודות.",
}: {
  items: string[];
  limit?: number;
  className?: string;
  emptyLabel?: string;
}) {
  const visibleItems = useMemo(
    () => items.filter((item) => getPortfolioSourceType(item)).slice(0, limit),
    [items, limit],
  );

  if (!visibleItems.length) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface-muted/25 p-5 text-center">
        <ImageIcon className="mx-auto h-5 w-5 text-muted-foreground" aria-hidden />
        <p className="mt-2 text-[13px] text-muted-foreground">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3", className)}>
      {visibleItems.map((item) =>
        isValidHttpsPortfolioUrl(item) ? (
          <ExternalPortfolioLink key={item} href={item} />
        ) : (
          <PortfolioImage key={item} path={item} />
        ),
      )}
    </div>
  );
}

function PortfolioImage({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setUrl(null);
    setFailed(false);
    void getPortfolioImageUrl(path)
      .then((signedUrl) => {
        if (active) setUrl(signedUrl);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [path]);

  if (failed) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-border bg-surface-muted/40 p-3 text-center text-[12px] text-muted-foreground">
        לא ניתן לטעון את התמונה
      </div>
    );
  }

  if (!url) {
    return (
      <div
        aria-label="טוען תמונת תיק עבודות"
        className="aspect-[4/3] animate-pulse rounded-xl border border-border bg-surface-muted"
      />
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-surface shadow-e1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="פתיחת תמונת תיק עבודות בתצוגה גדולה"
        >
          <img
            src={url}
            alt="תמונת תיק עבודות"
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          />
        </button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100%-2rem)] max-w-5xl border-0 bg-foreground p-2 sm:rounded-xl">
        <DialogTitle className="sr-only">תמונת תיק עבודות</DialogTitle>
        <DialogDescription className="sr-only">תצוגה גדולה של התמונה שנבחרה</DialogDescription>
        <img
          src={url}
          alt="תמונת תיק עבודות בתצוגה גדולה"
          className="max-h-[82vh] w-full rounded-lg object-contain"
        />
      </DialogContent>
    </Dialog>
  );
}

function ExternalPortfolioLink({ href }: { href: string }) {
  let hostname = href;
  try {
    hostname = new URL(href).hostname;
  } catch {
    // The parent filters invalid URLs; retain the source if URL parsing ever differs.
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex aspect-[4/3] min-w-0 flex-col items-center justify-center rounded-xl border border-border bg-surface-muted/35 p-3 text-center shadow-e1 transition-colors hover:border-border-strong hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ExternalLink className="h-5 w-5 text-primary" aria-hidden />
      <span className="mt-2 text-[12px] font-semibold text-foreground">קישור חיצוני</span>
      <span className="mt-1 max-w-full truncate text-[11px] text-muted-foreground" dir="ltr">
        {hostname}
      </span>
    </a>
  );
}
