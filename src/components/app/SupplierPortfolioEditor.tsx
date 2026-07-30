import { useEffect, useId, useRef, useState } from "react";
import { ExternalLink, Image as ImageIcon, Plus, Trash2, Upload } from "lucide-react";

import {
  deletePortfolioImage,
  getPortfolioImageUrl,
  getPortfolioSourceType,
  isPortfolioStoragePath,
  isValidHttpsPortfolioUrl,
  uploadPortfolioImage,
  validatePortfolioImage,
  type PortfolioSourceType,
} from "@/lib/supplier-portfolio";
import { cn } from "@/lib/utils";

const inputClass =
  "mt-1.5 block h-11 w-full rounded-lg border border-input bg-background px-3.5 text-[14px] text-foreground shadow-e1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15";
const statusClass = "mt-2 text-[12px]";

export function SupplierPortfolioEditor({
  items,
  onChange,
  error,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  error?: string;
}) {
  function update(index: number, value: string) {
    const nextItems = [...items];
    nextItems[index] = value;
    onChange(nextItems);
  }

  function remove(index: number) {
    onChange(items.filter((_, itemIndex) => itemIndex !== index));
  }

  return (
    <div>
      <p className="text-[13px] text-muted-foreground">
        שלב זה אופציונלי. ניתן להוסיף עד חמישה פריטים כתמונה מהמחשב או כקישור חיצוני.
      </p>
      <div className="mt-4 space-y-3">
        {items.map((value, index) => (
          <PortfolioItemEditor
            key={index}
            value={value}
            onChange={(nextValue) => update(index, nextValue)}
            onRemove={() => remove(index)}
          />
        ))}
      </div>
      {error ? <p className="mt-1 text-[12px] text-danger">{error}</p> : null}
      <button
        type="button"
        disabled={items.length >= 5}
        onClick={() => onChange([...items, ""])}
        className="mt-4 inline-flex h-10 items-center gap-1 rounded-lg border border-border px-4 text-[13px] font-semibold disabled:opacity-50"
      >
        <Plus className="h-4 w-4" />
        הוספת פריט
      </button>
    </div>
  );
}

function PortfolioItemEditor({
  value,
  onChange,
  onRemove,
}: {
  value: string;
  onChange: (value: string) => void;
  onRemove: () => void;
}) {
  const controlId = useId();
  const [sourceType, setSourceType] = useState<PortfolioSourceType>(
    getPortfolioSourceType(value) ?? "external_link",
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [itemError, setItemError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const persistedType = getPortfolioSourceType(value);
    if (persistedType) setSourceType(persistedType);
  }, [value]);

  useEffect(() => {
    let active = true;
    if (sourceType !== "uploaded_image" || !isPortfolioStoragePath(value)) {
      if (!objectUrlRef.current) setPreviewUrl(null);
      return;
    }

    void getPortfolioImageUrl(value)
      .then((url) => {
        if (active && !objectUrlRef.current) setPreviewUrl(url);
      })
      .catch((error: unknown) => {
        if (active) setItemError(getErrorMessage(error, "לא ניתן לטעון את התמונה."));
      });
    return () => {
      active = false;
    };
  }, [sourceType, value]);

  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    [],
  );

  async function selectSource(nextSource: PortfolioSourceType) {
    if (nextSource === sourceType || busy) return;
    setItemError(null);
    setStatus(null);
    setBusy(true);
    try {
      if (isPortfolioStoragePath(value)) await deletePortfolioImage(value);
      clearObjectPreview();
      onChange("");
      setSourceType(nextSource);
    } catch (error) {
      setItemError(getErrorMessage(error, "לא ניתן להחליף את סוג הפריט."));
    } finally {
      setBusy(false);
    }
  }

  async function handleImage(file: File | undefined) {
    if (!file) return;
    setItemError(null);
    setStatus(null);
    const validationError = validatePortfolioImage(file);
    if (validationError) {
      setItemError(validationError);
      return;
    }

    clearObjectPreview();
    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;
    setPreviewUrl(objectUrl);
    setBusy(true);
    setStatus("מעלה את התמונה…");
    const previousPath = isPortfolioStoragePath(value) ? value : null;
    try {
      const nextPath = await uploadPortfolioImage(file);
      onChange(nextPath);
      setStatus("התמונה הועלתה בהצלחה.");
      if (previousPath && previousPath !== nextPath) {
        void deletePortfolioImage(previousPath).catch(() => undefined);
      }
    } catch (error) {
      clearObjectPreview();
      setItemError(getErrorMessage(error, "העלאת התמונה נכשלה."));
      setStatus(null);
    } finally {
      setBusy(false);
    }
  }

  async function removeItem() {
    if (busy) return;
    setItemError(null);
    setBusy(true);
    try {
      if (isPortfolioStoragePath(value)) await deletePortfolioImage(value);
      clearObjectPreview();
      onRemove();
    } catch (error) {
      setItemError(getErrorMessage(error, "לא ניתן להסיר את הפריט."));
    } finally {
      setBusy(false);
    }
  }

  function clearObjectPreview() {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setPreviewUrl(null);
  }

  return (
    <div className="rounded-xl border border-border bg-surface-muted/30 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          className="inline-flex rounded-lg border border-border bg-background p-1"
          aria-label="מקור פריט תיק עבודות"
        >
          <SourceButton
            active={sourceType === "uploaded_image"}
            disabled={busy}
            onClick={() => void selectSource("uploaded_image")}
          >
            <Upload className="h-3.5 w-3.5" />
            העלאת תמונה
          </SourceButton>
          <SourceButton
            active={sourceType === "external_link"}
            disabled={busy}
            onClick={() => void selectSource("external_link")}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            קישור חיצוני
          </SourceButton>
        </div>
        <button
          type="button"
          aria-label="הסרת פריט"
          disabled={busy}
          onClick={() => void removeItem()}
          className="grid h-10 w-10 place-items-center rounded-lg border border-border text-danger disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {sourceType === "external_link" ? (
        <div className="mt-3">
          <label htmlFor={`${controlId}-url`} className="text-[13px] font-semibold text-foreground">
            כתובת HTTPS
          </label>
          <input
            key="external-link-input"
            id={`${controlId}-url`}
            type="url"
            className={inputClass}
            value={value ?? ""}
            maxLength={500}
            onChange={(event) => onChange(event.target.value)}
            placeholder="https://"
            dir="ltr"
          />
          {isValidHttpsPortfolioUrl(value) ? (
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              פתיחת הקישור
            </a>
          ) : null}
        </div>
      ) : (
        <div className="mt-3">
          <label
            htmlFor={`${controlId}-file`}
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-input bg-background px-3.5 text-[13px] font-semibold text-foreground shadow-e1"
          >
            <ImageIcon className="h-4 w-4 text-primary" />
            {value ? "החלפת תמונה" : "בחירת תמונה"}
          </label>
          <input
            key="uploaded-image-input"
            id={`${controlId}-file`}
            type="file"
            className="sr-only"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={(event) => void handleImage(event.target.files?.[0])}
          />
          <p className="mt-2 text-[12px] text-muted-foreground">JPG, JPEG, PNG או WEBP, עד 15MB.</p>
          {previewUrl ? (
            <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="mt-3 block">
              <img
                src={previewUrl}
                alt="תצוגה מקדימה של תמונת תיק עבודות"
                className="h-32 w-full rounded-lg border border-border object-cover"
              />
            </a>
          ) : null}
        </div>
      )}

      {status ? <p className={cn(statusClass, "text-success")}>{status}</p> : null}
      {itemError ? (
        <p role="alert" className={cn(statusClass, "text-danger")}>
          {itemError}
        </p>
      ) : null}
    </div>
  );
}

function SourceButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[12px] font-semibold disabled:opacity-50",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}
