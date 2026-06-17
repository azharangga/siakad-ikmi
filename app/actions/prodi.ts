'use server'

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { StudyProgram, StudyProgramFormValues } from "@/lib/types";

const supabase = createAdminClient();

// --- HELPER ERROR HANDLING ---
const handleDbError = (error: any, context: string) => {
  console.error(`[DB_ERROR] ${context}:`, error);

  if (error.code === '23505') {
    if (error.message?.includes('kode')) {
        throw new Error("Kode Program Studi sudah terdaftar. Gunakan kode lain.");
    }
    throw new Error("Data duplikat terdeteksi.");
  }

  if (error.code === '23503') {
    throw new Error("Program Studi tidak dapat dihapus karena masih memiliki data mahasiswa terkait.");
  }

  throw new Error("Gagal memproses data. Terjadi kendala di server.");
};

// Ambil semua prodi
export async function getStudyPrograms() {
  const { data, error } = await supabase
    .from('study_programs')
    .select('*')
    .order('kode', { ascending: true });

  if (error) {
    console.error("Error fetching study programs:", error.message);
    return [];
  }
  return data as StudyProgram[];
}

// Tambah prodi
export async function createStudyProgram(values: StudyProgramFormValues) {
  const { error } = await supabase
    .from('study_programs')
    .insert([{
      kode: values.kode,
      nama: values.nama,
      jenjang: values.jenjang
    }]);

  if (error) handleDbError(error, "createStudyProgram");
  revalidatePath('/prodi');
}

// Update prodi
export async function updateStudyProgram(id: string, values: StudyProgramFormValues) {
  const { error } = await supabase
    .from('study_programs')
    .update({
      kode: values.kode,
      nama: values.nama,
      jenjang: values.jenjang
    })
    .eq('id', id);

  if (error) handleDbError(error, "updateStudyProgram");
  revalidatePath('/prodi');
}

// Hapus prodi
export async function deleteStudyProgram(id: string) {
  const { error } = await supabase
    .from('study_programs')
    .delete()
    .eq('id', id);

  if (error) handleDbError(error, "deleteStudyProgram");
  revalidatePath('/prodi');
}