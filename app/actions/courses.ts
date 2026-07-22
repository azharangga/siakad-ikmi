'use server'

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { Course, CoursePayload } from "@/lib/types";

const supabase = createAdminClient();

// --- HELPER ERROR HANDLING ---
const handleDbError = (error: any, context: string) => {
  console.error(`[DB_ERROR] ${context}:`, error);

  if (error.code === '23505') {
    if (error.message?.includes('kode')) {
      throw new Error("Kode Mata Kuliah tersebut sudah ada. Harap gunakan kode lain.");
    }
    throw new Error("Data duplikat terdeteksi dalam sistem.");
  }

  if (error.code === '23503') {
    throw new Error("Mata kuliah tidak dapat dihapus karena sudah diambil oleh mahasiswa atau memiliki data nilai.");
  }

  throw new Error("Gagal memproses data. Terjadi kendala di server.");
};

// Ambil semua mata kuliah beserta relasi program studi
export async function getCourses() {
  let allCoursesData: any[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data: pageData, error } = await supabase
      .from('courses')
      .select(`
        *,
        course_study_programs (
          study_program:study_programs (id, kode, nama, jenjang)
        )
      `)
      .order('matkul', { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error("Error fetching courses page:", error.message);
      break;
    }

    if (!pageData || pageData.length === 0) {
      hasMore = false;
    } else {
      allCoursesData.push(...pageData);
      if (pageData.length < pageSize) {
        hasMore = false;
      } else {
        page++;
      }
    }
  }

  const transformedData = allCoursesData.map((course: any) => ({
    ...course,
    study_programs: course.course_study_programs?.map((csp: any) => csp.study_program).filter(Boolean) || []
  }));

  return transformedData as Course[];
}

// Tambah mata kuliah baru dengan relasi program studi
export async function createCourse(values: CoursePayload) {
  // Insert mata kuliah terlebih dahulu
  const { data: newCourse, error: courseError } = await supabase
    .from('courses')
    .insert([{
      kode: values.kode,
      matkul: values.matkul,
      sks: Number(values.sks),
      smt_default: Number(values.smt_default),
      kategori: values.kategori
    }])
    .select('id')
    .single();

  if (courseError) handleDbError(courseError, "createCourse");

  if (newCourse) {
    let prodiIds = values.study_program_ids || [];

    // Jika kategori MBKM, ambil semua program studi
    if (values.kategori === 'MBKM') {
      const { data: allProdi } = await supabase
        .from('study_programs')
        .select('id');
      prodiIds = allProdi?.map(p => p.id) || [];
    }

    // Insert relasi ke junction table
    if (prodiIds.length > 0) {
      const junctionData = prodiIds.map(spId => ({
        course_id: newCourse.id,
        study_program_id: spId
      }));

      const { error: junctionError } = await supabase
        .from('course_study_programs')
        .insert(junctionData);

      if (junctionError) {
        console.error("[DB_ERROR] Insert junction:", junctionError);
      }
    }
  }

  revalidatePath('/matakuliah');
}

// Update mata kuliah dengan relasi program studi
export async function updateCourse(id: string, values: CoursePayload) {
  // Update data mata kuliah
  const { error: courseError } = await supabase
    .from('courses')
    .update({
      kode: values.kode,
      matkul: values.matkul,
      sks: Number(values.sks),
      smt_default: Number(values.smt_default),
      kategori: values.kategori
    })
    .eq('id', id);

  if (courseError) handleDbError(courseError, "updateCourse");

  // Hapus relasi lama
  await supabase
    .from('course_study_programs')
    .delete()
    .eq('course_id', id);

  let prodiIds = values.study_program_ids || [];

  // Jika kategori MBKM, ambil semua program studi
  if (values.kategori === 'MBKM') {
    const { data: allProdi } = await supabase
      .from('study_programs')
      .select('id');
    prodiIds = allProdi?.map(p => p.id) || [];
  }

  // Insert relasi baru
  if (prodiIds.length > 0) {
    const junctionData = prodiIds.map(spId => ({
      course_id: id,
      study_program_id: spId
    }));

    const { error: junctionError } = await supabase
      .from('course_study_programs')
      .insert(junctionData);

    if (junctionError) {
      console.error("[DB_ERROR] Update junction:", junctionError);
    }
  }

  revalidatePath('/matakuliah');
}

// Hapus mata kuliah (relasi junction otomatis terhapus karena ON DELETE CASCADE)
export async function deleteCourse(id: string) {
  const { error } = await supabase
    .from('courses')
    .delete()
    .eq('id', id);

  if (error) handleDbError(error, "deleteCourse");

  revalidatePath('/matakuliah');
}