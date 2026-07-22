'use server'

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { SidangSkripsi, SidangSkripsiFormValues } from "@/lib/types";

const supabase = createAdminClient();

export async function getSidangSkripsi(): Promise<SidangSkripsi[]> {
  let allData: any[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('sidang_skripsi')
      .select(`
        *,
        student:students (
          id, nim, nama,
          study_program:study_programs(nama, jenjang)
        )
      `)
      .order('tanggal_sidang', { ascending: false })
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
  return allData as unknown as SidangSkripsi[];
}

export async function getSidangByStudentId(studentId: string): Promise<SidangSkripsi | null> {
  const { data, error } = await supabase
    .from('sidang_skripsi')
    .select(`
      *,
      student:students (
        id, nim, nama,
        study_program:study_programs(nama, jenjang)
      )
    `)
    .eq('student_id', studentId)
    .order('tanggal_sidang', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return data as unknown as SidangSkripsi | null;
}

export async function createSidangSkripsi(values: SidangSkripsiFormValues) {
  const { error } = await supabase.from('sidang_skripsi').insert([{
    student_id: values.student_id,
    tanggal_sidang: values.tanggal_sidang,
    hari_sidang: values.hari_sidang,
    ruangan: values.ruangan || null,
    waktu_mulai: values.waktu_mulai || null,
    waktu_selesai: values.waktu_selesai || null,
    catatan: values.catatan || null,
  }]);

  if (error) throw new Error(error.message);
  revalidatePath('/jadwal-sidang');
  revalidatePath('/surat-keterangan-lulus');
}

export async function updateSidangSkripsi(id: string, values: SidangSkripsiFormValues) {
  const { error } = await supabase.from('sidang_skripsi').update({
    student_id: values.student_id,
    tanggal_sidang: values.tanggal_sidang,
    hari_sidang: values.hari_sidang,
    ruangan: values.ruangan || null,
    waktu_mulai: values.waktu_mulai || null,
    waktu_selesai: values.waktu_selesai || null,
    catatan: values.catatan || null,
    updated_at: new Date().toISOString(),
  }).eq('id', id);

  if (error) throw new Error(error.message);
  revalidatePath('/jadwal-sidang');
  revalidatePath('/surat-keterangan-lulus');
}

export async function deleteSidangSkripsi(id: string) {
  const { error } = await supabase.from('sidang_skripsi').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/jadwal-sidang');
}
