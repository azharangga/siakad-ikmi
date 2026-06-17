'use server'

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { AcademicYear, AcademicYearFormValues } from "@/lib/types";

const supabase = createAdminClient();

// --- HELPER: RESET ACTIVE STATUS ---
const resetActiveStatus = async () => {
  const { error } = await supabase
    .from('academic_years')
    .update({ is_active: false })
    .neq('is_active', false);

  if (error) console.error("Error resetting active status:", error);
};

// --- CRUD OPERATIONS ---

export async function getAcademicYears() {
  const { data, error } = await supabase
    .from('academic_years')
    .select('*')
    .order('nama', { ascending: false });

  if (error) {
    console.error("Error fetching academic years:", error.message);
    return [];
  }
  return data as AcademicYear[];
}

export async function createAcademicYear(values: AcademicYearFormValues) {
  if (values.is_active) {
    await resetActiveStatus();
  }

  const { error } = await supabase
    .from('academic_years')
    .insert([{
      nama: values.nama,
      semester: values.semester,
      is_active: values.is_active
    }]);

  if (error) throw new Error("Gagal menambah Tahun Akademik.");
  revalidatePath('/tahun-akademik');
}

export async function updateAcademicYear(id: string, values: AcademicYearFormValues) {
  if (values.is_active) {
    await resetActiveStatus();
  }

  const { error } = await supabase
    .from('academic_years')
    .update({
      nama: values.nama,
      semester: values.semester,
      is_active: values.is_active
    })
    .eq('id', id);

  if (error) throw new Error("Gagal mengupdate Tahun Akademik.");
  revalidatePath('/tahun-akademik');
}

export async function deleteAcademicYear(id: string) {
  const { error } = await supabase
    .from('academic_years')
    .delete()
    .eq('id', id);

  if (error) throw new Error("Gagal menghapus data.");
  revalidatePath('/tahun-akademik');
}