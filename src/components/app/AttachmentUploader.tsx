import { useRef, useState } from "react";
import { FileText, Image as ImageIcon, RefreshCw, Trash2, Upload, X } from "lucide-react";

import {
  formatSize,
  getSignedUrl,
  useDeleteAttachment,
  useRequestAttachments,
  useUploadAttachment,
  validateFile,
  type AttachmentRow,
} from "@/lib/attachments";
import { cn } from "@/lib/utils";

type FailedItem = { id: string; file: File; error: string };

export function AttachmentUploader({
  requestId,
  canEdit,
}: {
  requestId: string;
  canEdit: boolean;
}) {
  const list = useRequestAttachments(requestId);
  const upload = useUploadAttachment(requestId);
  const del = useDeleteAttachment(requestId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [failed, setFailed] = useState<FailedItem[]>([]);
  const [uploadingName, setUploadingName] = useState<string | null>(null);

  async function handleFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    for (const file of arr) {
      const clientErr = validateFile(file);
      if (clientErr) {
        setFailed((f) => [...f, { id: crypto.randomUUID(), file, error: clientErr }]);
        continue;
      }
      setUploadingName(file.name);
      try {
        await upload.mutateAsync(file);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "העלאה נכשלה";
        setFailed((f) => [...f, { id: crypto.randomUUID(), file, error: msg }]);
      } finally {
        setUploadingName(null);
      }
    }
  }

  async function retry(item: FailedItem) {
    setFailed((f) => f.filter((x) => x.id !== item.id));
    await handleFiles([item.file]);
  }

  return (
    <div className="space-y-4">
      {canEdit ? (
        <div>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*,application/pdf"
            className="sr-only"
            onChange={(e) => {
              if (e.target.files?.length) void handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={upload.isPending}
            className={cn(
              "inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-surface-muted/40 px-4 text-[13px] font-semibold text-foreground transition-colors hover:border-primary hover:bg-accent/50 disabled:cursor-not-allowed disabled:opacity-60",
            )}
          >
            <Upload className="h-4 w-4" />
            {upload.isPending && uploadingName
              ? `מעלה ${uploadingName}…`
              : "העלאת קבצים (תמונות · PDF · עד 15MB)"}
          </button>
        </div>
      ) : null}

      {failed.length > 0 ? (
        <ul className="space-y-2">
          {failed.map((f) => (
            <li
              key={f.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-danger/40 bg-danger/5 px-3 py-2 text-[12px]"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">{f.file.name}</p>
                <p className="truncate text-danger">{f.error}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => retry(f)}
                  aria-label="ניסיון חוזר"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-surface hover:text-foreground"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setFailed((all) => all.filter((x) => x.id !== f.id))}
                  aria-label="הסרה"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-surface hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {list.isPending ? (
        <p className="text-[12px] text-muted-foreground">טוען קבצים…</p>
      ) : (list.data ?? []).length === 0 ? (
        <p className="text-[12px] text-muted-foreground">אין קבצים מצורפים.</p>
      ) : (
        <ul className="grid gap-2">
          {(list.data ?? []).map((a) => (
            <AttachmentItem
              key={a.id}
              att={a}
              canEdit={canEdit}
              onDelete={() => {
                if (window.confirm("למחוק את הקובץ?")) void del.mutate(a);
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function AttachmentItem({
  att,
  canEdit,
  onDelete,
}: {
  att: AttachmentRow;
  canEdit: boolean;
  onDelete: () => void;
}) {
  const isImage = att.mime_type.startsWith("image/");
  const Icon = isImage ? ImageIcon : FileText;

  async function open() {
    try {
      const url = await getSignedUrl(att.storage_path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      alert(err instanceof Error ? err.message : "לא ניתן לפתוח את הקובץ");
    }
  }

  return (
    <li className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2 shadow-e1">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-surface-muted text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <button
        type="button"
        onClick={open}
        className="min-w-0 flex-1 text-start"
      >
        <p className="truncate text-[13px] font-semibold text-foreground hover:text-primary">
          {att.file_name}
        </p>
        <p className="truncate text-[11px] text-muted-foreground">
          {formatSize(att.size_bytes)}
        </p>
      </button>
      {canEdit ? (
        <button
          type="button"
          onClick={onDelete}
          aria-label="מחיקת קובץ"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-danger/10 hover:text-danger"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ) : null}
    </li>
  );
}
