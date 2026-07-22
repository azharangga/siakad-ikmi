"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { Lecturer, LecturerFormValues } from "@/lib/types";
import { uploadAvatar, deleteAvatarFile } from "./upload"; // [FIX] Import deleteAvatarFile

const supabaseAdmin = createAdminClient();

// === GET LECTURERS ===
export async function getLecturers() {
  let allData: any[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabaseAdmin
      .from("lecturers")
      .select("*")
      .order("nama", { ascending: true })
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
  return allData as Lecturer[];
}

// === GET ACTIVE LECTURERS (For Dropdown) ===
export async function getActiveLecturers() {
  let allData: any[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabaseAdmin
      .from("lecturers")
      .select("*")
      .eq("is_active", true)
      .order("nama", { ascending: true })
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
  return allData as Lecturer[];
}

// === CREATE LECTURER ===
export async function createLecturer(values: LecturerFormValues) {
  const { nidn, nama, email, phone, is_active, avatar_url } = values;

  const { error } = await supabaseAdmin.from("lecturers").insert([
    {
      nidn: nidn || null, // Allow empty string to be null if needed, or keep as string
      nama,
      email: email || null,
      phone: phone || null,
      is_active,
      avatar_url,
    },
  ]);

  if (error) {
    console.error("Create Lecturer Error:", error.message);
    throw new Error(error.message);
  }

  revalidatePath("/dosen");
}

// === UPDATE LECTURER ===
export async function updateLecturer(id: string, values: LecturerFormValues) {
  const { nidn, nama, email, phone, is_active, avatar_url } = values;

  // Cek apakah ada avatar lama yang perlu dihapus (jika avatar diganti)
  // Logic ini bisa ditangani di frontend (delete dulu baru upload) atau di sini.
  // Untuk simplifikasi, kita asumsikan FE ngirim URL baru.

  const { error } = await supabaseAdmin
    .from("lecturers")
    .update({
      nidn: nidn || null,
      nama,
      email: email || null,
      phone: phone || null,
      is_active,
      avatar_url,
    })
    .eq("id", id);

  if (error) {
    console.error("Update Lecturer Error:", error.message);
    throw new Error(error.message);
  }

  revalidatePath("/dosen");
}

// === DELETE LECTURER ===
export async function deleteLecturer(id: string) {
  // Ambil data dulu untuk tahu avatar-nya apa (buat hapus file)
  const { data: lecturer } = await supabaseAdmin
    .from("lecturers")
    .select("avatar_url")
    .eq("id", id)
    .single();

  const { error } = await supabaseAdmin.from("lecturers").delete().eq("id", id);

  if (error) throw new Error(error.message);

  // Hapus file avatar jika ada
  if (lecturer?.avatar_url) {
    // Ekstrak path relative dari URL
    // URL: https://xyz.supabase.co/storage/v1/object/public/avatars/dosen-123.jpg
    // Path: dosen-123.jpg
    // Asumsi logic deleteFile handle full url atau path, cek 'upload.ts'
    // Kita coba parse manual jika deleteFile butuh path.
    try {
      await deleteAvatarFile(lecturer.avatar_url); // [FIX] Use deleteAvatarFile (it handles logic internally or expects url/path)
    } catch (e) {
      console.error("Gagal hapus file avatar:", e);
    }
  }

  revalidatePath("/dosen");
}
