import { MAX_SIZE_BYTES } from "@/lib/attachments";
import { supabase } from "@/integrations/supabase/client";

export const SUPPLIER_PORTFOLIO_BUCKET = "supplier-portfolio-images";
export const SUPPLIER_PORTFOLIO_ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;

const STORAGE_PATH_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/[A-Za-z0-9._-]+$/i;

export type PortfolioSourceType = "uploaded_image" | "external_link";

export function isValidHttpsPortfolioUrl(value: string): boolean {
  if (!value || value.length > 500 || /\s/.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname);
  } catch {
    return false;
  }
}

export function isPortfolioStoragePath(value: string): boolean {
  return value.length <= 500 && STORAGE_PATH_RE.test(value);
}

export function getPortfolioSourceType(value: string): PortfolioSourceType | null {
  if (isValidHttpsPortfolioUrl(value)) return "external_link";
  if (isPortfolioStoragePath(value)) return "uploaded_image";
  return null;
}

export function validatePortfolioImage(file: File): string | null {
  if (file.size > MAX_SIZE_BYTES) return "התמונה גדולה מ־15MB.";
  if (
    !SUPPLIER_PORTFOLIO_ALLOWED_MIME.includes(
      file.type as (typeof SUPPLIER_PORTFOLIO_ALLOWED_MIME)[number],
    )
  ) {
    return "ניתן להעלות תמונות JPG, JPEG, PNG או WEBP בלבד.";
  }
  return null;
}

function safeStorageFileName(fileName: string): string {
  const safeName = fileName.replace(/[^\w.-]+/g, "_");
  return safeName || "image";
}

async function requireSupplierUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("יש להתחבר כדי להעלות תמונה.");
  return data.user.id;
}

export async function uploadPortfolioImage(file: File): Promise<string> {
  const validationError = validatePortfolioImage(file);
  if (validationError) throw new Error(validationError);

  const userId = await requireSupplierUserId();
  const path = `${userId}/${crypto.randomUUID()}-${safeStorageFileName(file.name)}`;
  const { error } = await supabase.storage.from(SUPPLIER_PORTFOLIO_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function deletePortfolioImage(path: string): Promise<void> {
  const userId = await requireSupplierUserId();
  if (!isPortfolioStoragePath(path) || !path.startsWith(`${userId}/`)) {
    throw new Error("נתיב תמונת תיק העבודות אינו תקין.");
  }

  const { error } = await supabase.storage.from(SUPPLIER_PORTFOLIO_BUCKET).remove([path]);
  if (error) throw error;
}

export async function getPortfolioImageUrl(path: string): Promise<string> {
  if (!isPortfolioStoragePath(path)) {
    throw new Error("נתיב תמונת תיק העבודות אינו תקין.");
  }
  const { data, error } = await supabase.storage
    .from(SUPPLIER_PORTFOLIO_BUCKET)
    .createSignedUrl(path, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
}
