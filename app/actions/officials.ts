'use server'

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { Official, OfficialFormValues } from "@/lib/types";

const supabaseAdmin = createAdminClient();

// --- HELPER: Upload Signature ---
async function uploadSignature(file: File, prefix: string): Promise<string> {
  // Validasi tipe file
  const validTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
  if (!validTypes.includes(file.type)) {
    throw new Error("Format file harus JPG, PNG, atau WEBP.");
  }

  // Validasi ukuran (Max 2MB)
  if (file.size > 2 * 1024 * 1024) {
    throw new Error("Ukuran file maksimal 2MB.");
  }

  try {
    const fileExt = file.name.split(".").pop();
    const fileName = `${prefix}-${Date.now()}.${fileExt}`;
    // Simpan di folder signatures/
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("signatures")
      .upload(filePath, file, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data } = supabaseAdmin.storage
      .from("signatures")
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error: any) {
    console.error("Upload Signature Error:", error);
    throw new Error("Gagal mengunggah tanda tangan: " + error.message);
  }
}

// --- HELPER: Delete File from Storage ---
async function deleteSignatureFile(fileUrl: string) {
  try {
    // fileUrl usually like: .../storage/v1/object/public/signatures/filename.png
    const parts = fileUrl.split('/signatures/');
    if (parts.length < 2) return;
    const fileName = parts[1];

    await supabaseAdmin.storage.from('signatures').remove([fileName]);
  } catch (error) {
    console.error("Error deleting file:", error);
  }
}


// --- CRUD OPERATIONS ---

export async function getOfficials(): Promise<Official[]> {
  let allData: any[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabaseAdmin
      .from('officials')
      .select(`
          *,
          lecturer:lecturers(*),
          study_program:study_programs(*)
      `)
      .order('id', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error || !data || data.length === 0) {
      hasMore = false;
    } else {
      allData.push(...data);
      if (data.length < pageSize) {
        hasMore = false;
      } else {
        page++;
      }
    }
  }
  return allData as unknown as Official[];
}

export async function createOfficial(formData: FormData) {
  // const nama = formData.get("nama") as string; // REMOVED
  // const nidn = formData.get("nidn") as string; // REMOVED
  const jabatan = formData.get("jabatan") as string;
  const is_active = formData.get("is_active") === "true";
  const lecturer_id = formData.get("lecturer_id") as string;
  const study_program_id = formData.get("study_program_id") as string;

  const fileBasah = formData.get("file_basah") as File | null;
  const fileDigital = formData.get("file_digital") as File | null;

  // We need name for filename. Fetch it or pass it? Fetching is safer.
  const { data: lecturer } = await supabaseAdmin.from('lecturers').select('nama').eq('id', lecturer_id).single();
  const safeName = lecturer?.nama?.replace(/\s+/g, '-').toLowerCase() || 'official';

  let ttd_basah_url = null;
  let ttd_digital_url = null;

  if (fileBasah && fileBasah.size > 0) {
    ttd_basah_url = await uploadSignature(fileBasah, `basah-${safeName}`);
  }

  if (fileDigital && fileDigital.size > 0) {
    ttd_digital_url = await uploadSignature(fileDigital, `digital-${safeName}`);
  }

  if (fileDigital && fileDigital.size > 0) {
    ttd_digital_url = await uploadSignature(fileDigital, `digital-${safeName}`);
  }

  // --- VALIDATION: Check Duplicate Active Jabatan ---
  if (is_active) {
    const { data: existing } = await supabaseAdmin
      .from('officials')
      .select('id')
      .eq('jabatan', jabatan)
      .eq('is_active', true)
      .maybeSingle();

    if (existing) {
      throw new Error(`Jabatan "${jabatan}" sudah diisi oleh pejabat aktif lain. Silakan non-aktifkan pejabat lama terlebih dahulu.`);
    }
  }

  const { error } = await supabaseAdmin.from('officials').insert([{
    // nama, // REMOVED
    // nidn: nidn || null, // REMOVED
    jabatan,
    is_active,
    ttd_basah_url,
    ttd_digital_url,
    lecturer_id: lecturer_id, // NOT NULL now
    study_program_id: study_program_id || null,
  }]);

  if (error) throw new Error(error.message);

  revalidatePath('/pejabat');
  revalidatePath('/surat-keterangan'); // Revalidate usage places
}

export async function updateOfficial(id: string, formData: FormData) {
  // Ambil data lama + info lecturer untuk nama file
  const { data: oldData } = await supabaseAdmin
    .from('officials')
    .select('*, lecturer:lecturers(nama)')
    .eq('id', id)
    .single();
  // Note: oldData.lecturer joined might be array or object depending on settings. Assuming object here or handle safely.
  // Actually supabase-js usually returns object for single relation.

  // const nama = formData.get("nama") as string; // REMOVED
  // const nidn = formData.get("nidn") as string; // REMOVED
  const jabatan = formData.get("jabatan") as string;
  const is_active = formData.get("is_active") === "true";
  const lecturer_id = formData.get("lecturer_id") as string;
  const study_program_id = formData.get("study_program_id") as string;

  const fileBasah = formData.get("file_basah") as File | null;
  const fileDigital = formData.get("file_digital") as File | null;

  let ttd_basah_url = oldData?.ttd_basah_url;
  let ttd_digital_url = oldData?.ttd_digital_url;

  // Nama for filename
  const safeName = (oldData as any)?.lecturer?.nama?.replace(/\s+/g, '-').toLowerCase() || 'official';

  // Handle Update File Basah
  if (fileBasah && fileBasah.size > 0) {
    if (ttd_basah_url) await deleteSignatureFile(ttd_basah_url);
    ttd_basah_url = await uploadSignature(fileBasah, `basah-${safeName}`);
  }

  // Handle Update File Digital
  if (fileDigital && fileDigital.size > 0) {
    if (ttd_digital_url) await deleteSignatureFile(ttd_digital_url);
    ttd_digital_url = await uploadSignature(fileDigital, `digital-${safeName}`);
  }

  // Handle Update File Digital
  if (fileDigital && fileDigital.size > 0) {
    if (ttd_digital_url) await deleteSignatureFile(ttd_digital_url);
    ttd_digital_url = await uploadSignature(fileDigital, `digital-${safeName}`);
  }

  // --- VALIDATION: Check Duplicate Active Jabatan (Exclude Self) ---
  if (is_active) {
    const { data: existing } = await supabaseAdmin
      .from('officials')
      .select('id')
      .eq('jabatan', jabatan)
      .eq('is_active', true)
      .neq('id', id)
      .maybeSingle();

    if (existing) {
      throw new Error(`Jabatan "${jabatan}" sudah diisi oleh pejabat aktif lain. Silakan non-aktifkan pejabat lama terlebih dahulu.`);
    }
  }

  const { error } = await supabaseAdmin.from('officials').update({
    // nama, // REMOVED
    // nidn: nidn || null, // REMOVED
    jabatan,
    is_active,
    ttd_basah_url,
    ttd_digital_url,
    lecturer_id: lecturer_id,
    study_program_id: study_program_id || null,
  }).eq('id', id);

  if (error) throw new Error(error.message);

  revalidatePath('/pejabat');
  revalidatePath('/surat-keterangan');
}

export async function deleteOfficial(id: string) {
  // Hapus file fisik dulu
  const { data: oldData } = await supabaseAdmin.from('officials').select('*').eq('id', id).single();

  if (oldData?.ttd_basah_url) await deleteSignatureFile(oldData.ttd_basah_url);
  if (oldData?.ttd_digital_url) await deleteSignatureFile(oldData.ttd_digital_url);

  const { error } = await supabaseAdmin.from('officials').delete().eq('id', id);
  if (error) throw new Error(error.message);

  revalidatePath('/pejabat');
}

export async function toggleOfficialStatus(id: string, isActive: boolean) {
  const { error } = await supabaseAdmin.from('officials').update({
    is_active: isActive
  }).eq('id', id);

  if (error) throw new Error(error.message);
  revalidatePath('/pejabat');
}
