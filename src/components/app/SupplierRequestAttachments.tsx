import { useState } from "react";
import { AlertTriangle, FileText, Image as ImageIcon, Loader2 } from "lucide-react";

import {
  formatSize,
  getSignedUrl,
  useRequestAttachments,
  type AttachmentRow,
} from "@/lib/attachments";

export function SupplierRequestAttachments({ requestId }: { requestId: string }) {
  const attachments = useRequestAttachments(requestId);

  if (attachments.isPending) {
    return (
      <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        טוען קבצים מצורפים…
      </div>
    );
  }
  if (attachments.isError) {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger/5 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          <div>
            <p className="text-[13px] font-semibold text-foreground">
              לא ניתן לטעון את הקבצים המצורפים.
            </p>
            <button
              type="button"
              onClick={() => void attachments.refetch()}
              className="mt-2 text-[12px] font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              ניסיון חוזר
            </button>
          </div>
        </div>
      </div>
    );
  }
  if (!attachments.data?.length) {
    return <p className="text-[13px] text-muted-foreground">אין קבצים מצורפים לבקשה.</p>;
  }

  return (
    <ul className="grid gap-2">
      {attachments.data.map((attachment) => (
        <SupplierAttachmentItem key={attachment.id} attachment={attachment} />
      ))}
    </ul>
  );
}

function SupplierAttachmentItem({ attachment }: { attachment: AttachmentRow }) {
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState(false);
  const Icon = attachment.mime_type.startsWith("image/") ? ImageIcon : FileText;

  async function openAttachment() {
    setOpening(true);
    setOpenError(false);
    try {
      const url = await getSignedUrl(attachment.storage_path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      setOpenError(true);
    } finally {
      setOpening(false);
    }
  }

  return (
    <li className="rounded-lg border border-border bg-surface px-3 py-2 shadow-e1">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-muted text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <button
          type="button"
          onClick={() => void openAttachment()}
          disabled={opening}
          className="min-w-0 flex-1 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-60"
        >
          <span className="block truncate text-[13px] font-semibold text-foreground hover:text-primary">
            {opening ? "פותח את הקובץ…" : attachment.file_name}
          </span>
          <span className="block truncate text-[11px] text-muted-foreground">
            {formatSize(attachment.size_bytes)}
          </span>
        </button>
      </div>
      {openError ? (
        <p role="alert" className="mt-2 text-[12px] text-danger">
          הקובץ אינו זמין כרגע או שאין הרשאה לפתוח אותו.
        </p>
      ) : null}
    </li>
  );
}
