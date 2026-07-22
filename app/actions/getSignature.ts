"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function getSignatureBase64(pathOrType: string) {
  try {
    if (!pathOrType || pathOrType === "none") return null;

    // 1. Jika sudah dalam bentuk data URL (Base64), langsung kembalikan
    if (pathOrType.startsWith("data:image")) return pathOrType;

    // 2. Jika bukan URL atau path file valid (misal hanya keyword legacy 'basah'/'digital'), abaikan download palsu
    if (pathOrType === "basah" || pathOrType === "digital") {
      return null;
    }

    // 3. Inisialisasi Supabase Admin
    const supabase = createAdminClient();
    let filename = pathOrType;

    // Handle URL Parsing (extract path relative terhadap bucket)
    if (filename.startsWith("http")) {
      try {
        const url = new URL(filename);
        const splitKey = `/signatures/`;
        if (url.pathname.includes(splitKey)) {
          filename = url.pathname.split(splitKey)[1]; // Ambil bagian setelah bucket
        } else {
          const pathParts = url.pathname.split('/');
          filename = pathParts[pathParts.length - 1];
        }
        filename = decodeURIComponent(filename);
      } catch (e) {
        // Fallback jika URL invalid
      }
    }

    const bucketName = "signatures";

    // 4. Download file
    const { data, error } = await supabase.storage
      .from(bucketName)
      .download(filename);

    if (error || !data) {
      return null;
    }

    // 5. Konversi Blob ke Base64
    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return `data:image/png;base64,${buffer.toString("base64")}`;

  } catch (error) {
    console.error("Gagal memuat tanda tangan dari Supabase:", error);
    return null;
  }
}