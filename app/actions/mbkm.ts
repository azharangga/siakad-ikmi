'use server'

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { StudentMBKM, StudentMBKMFormValues } from "@/lib/types";

const supabase = createAdminClient();

// 1. Get All MBKM Students
export async function getMbkmStudents() {
  let allData: any[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('student_mbkm')
      .select(`
        *,
        student:students (
          id, nim, nama, 
          study_program:study_programs(nama, jenjang)
        ),
        academic_year:academic_years (
          id, nama, semester
        )
      `)
      .order('created_at', { ascending: false })
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
  return allData as StudentMBKM[];
}

export async function getMbkmByStudentId(studentId: string) {
  const { data, error } = await supabase
    .from('student_mbkm')
    .select(`
      *,
      student:students (
        id, nim, nama, 
        study_program:study_programs(nama, jenjang)
      ),
      academic_year:academic_years (
        id, nama, semester
      )
    `)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching MBKM for student:", error);
    return [];
  }
  return data as StudentMBKM[];
}

// 2. Create
export async function createMbkmStudent(values: StudentMBKMFormValues) {
  // Cek duplikasi
  const { data: existing } = await supabase
    .from('student_mbkm')
    .select('id')
    .eq('student_id', values.student_id)
    .eq('academic_year_id', values.academic_year_id)
    .single();

  if (existing) {
    throw new Error("Mahasiswa ini sudah terdaftar MBKM di semester tersebut.");
  }

  const { error } = await supabase.from('student_mbkm').insert([{
    student_id: values.student_id,
    academic_year_id: values.academic_year_id,
    jenis_mbkm: values.jenis_mbkm,
    mitra: values.mitra,
    lokasi: values.lokasi
  }]);

  if (error) throw new Error("Gagal menambahkan data MBKM.");
  revalidatePath('/mbkm');
}

// 3. Update
export async function updateMbkmStudent(id: string, values: StudentMBKMFormValues) {
  const { error } = await supabase
    .from('student_mbkm')
    .update({
      student_id: values.student_id,
      academic_year_id: values.academic_year_id,
      jenis_mbkm: values.jenis_mbkm,
      mitra: values.mitra,
      lokasi: values.lokasi,
      updated_at: new Date().toISOString()
    })
    .eq('id', id);

  if (error) throw new Error("Gagal mengupdate data MBKM.");
  revalidatePath('/mbkm');
}

// 4. Delete
export async function deleteMbkmStudent(id: string) {
  const { error } = await supabase.from('student_mbkm').delete().eq('id', id);
  if (error) throw new Error("Gagal menghapus data MBKM.");
  revalidatePath('/mbkm');
}