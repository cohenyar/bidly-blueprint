/**
 * Request attachment upload / list / delete.
 * Files live in the private `request-attachments` bucket under
 * `{userId}/{requestId}/{uuid}-{filename}`.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AttachmentRow = Database["public"]["Tables"]["request_attachments"]["Row"];

export const BUCKET = "request-attachments";
export const MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB
export const ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
];

export function validateFile(file: File): string | null {
  if (file.size > MAX_SIZE_BYTES) return "הקובץ גדול מ-15MB";
  if (!ALLOWED_MIME.includes(file.type)) return "סוג קובץ לא נתמך";
  return null;
}

export function useRequestAttachments(requestId: string) {
  return useQuery({
    queryKey: ["attachments", requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("request_attachments")
        .select("*")
        .eq("request_id", requestId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as AttachmentRow[];
    },
  });
}

export function useUploadAttachment(requestId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const err = validateFile(file);
      if (err) throw new Error(err);

      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userRes.user) throw new Error("לא מחובר");

      const safeName = file.name.replace(/[^\w.-]+/g, "_");
      const path = `${userRes.user.id}/${requestId}/${crypto.randomUUID()}-${safeName}`;

      const up = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });
      if (up.error) throw up.error;

      const { error: insErr } = await supabase.from("request_attachments").insert({
        request_id: requestId,
        storage_path: path,
        file_name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
      });
      if (insErr) {
        // best-effort rollback of the uploaded blob
        await supabase.storage.from(BUCKET).remove([path]);
        throw insErr;
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["attachments", requestId] });
    },
  });
}

export function useDeleteAttachment(requestId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (att: AttachmentRow) => {
      const { error: storageError } = await supabase.storage
        .from(BUCKET)
        .remove([att.storage_path]);
      if (storageError) throw storageError;

      const { error: metadataError } = await supabase
        .from("request_attachments")
        .delete()
        .eq("id", att.id);
      if (metadataError) throw metadataError;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["attachments", requestId] });
    },
  });
}

export async function getSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
