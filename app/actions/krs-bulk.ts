'use server';

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { calculateStudentSemester } from "@/lib/academic-utils";

const supabase = createAdminClient();

export async function getStudentsWithoutKRS(academicYearId: string) {
  try {
    const { data: academicYear } = await supabase
      .from("academic_years")
      .select("nama, semester")
      .eq("id", academicYearId)
      .single();

    if (!academicYear) return [];

    // 1. Ambil semua mahasiswa aktif - CHUNKED PAGINATION
    let allStudents: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: pageStudents, error: studentError } = await supabase
        .from("students")
        .select(`
          id, nim, nama, angkatan, status_mahasiswa,
          study_program:study_programs (nama, jenjang)
        `)
        .eq("is_active", true)
        .order("nama", { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (studentError) throw studentError;

      if (!pageStudents || pageStudents.length === 0) {
        hasMore = false;
      } else {
        allStudents.push(...pageStudents);
        if (pageStudents.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      }
    }

    // 2. Ambil student_id yang SUDAH punya KRS di tahun ini - CHUNKED PAGINATION
    let existingKRS: any[] = [];
    let krsPage = 0;
    let hasMoreKrs = true;

    while (hasMoreKrs) {
      const { data: pageKrs, error: krsError } = await supabase
        .from("krs")
        .select("student_id")
        .eq("academic_year_id", academicYearId)
        .range(krsPage * pageSize, (krsPage + 1) * pageSize - 1);

      if (krsError) throw krsError;

      if (!pageKrs || pageKrs.length === 0) {
        hasMoreKrs = false;
      } else {
        existingKRS.push(...pageKrs);
        if (pageKrs.length < pageSize) {
          hasMoreKrs = false;
        } else {
          krsPage++;
        }
      }
    }

    const studentIdsWithKRS = new Set(existingKRS.map((k: any) => k.student_id));

    // 3. Filter mahasiswa yang BELUM punya KRS
    const studentsWithoutKRS = allStudents.filter(s => !studentIdsWithKRS.has(s.id));

    // 4. Ambil data MBKM untuk tahun ini
    const { data: mbkmData } = await supabase
      .from("student_mbkm")
      .select("student_id")
      .eq("academic_year_id", academicYearId);

    const mbkmStudentIds = new Set(mbkmData?.map((m: any) => m.student_id));

    // 5. Tambahkan info semester & MBKM
    return studentsWithoutKRS.map(s => ({
      ...s,
      semester: calculateStudentSemester(s.angkatan, academicYear, s.status_mahasiswa),
      is_mbkm: mbkmStudentIds.has(s.id)
    }));

  } catch (error) {
    console.error("Error fetching students without KRS:", error);
    return [];
  }
}

interface BulkKRSPayload {
  studentIds: string[];
  courseIds: string[];
  academicYearId: string;
}

export async function createBulkKRS(payload: BulkKRSPayload) {
  const { studentIds, courseIds, academicYearId } = payload;

  if (studentIds.length === 0 || courseIds.length === 0) {
    throw new Error("Pilih minimal satu mahasiswa dan satu mata kuliah.");
  }

  try {
    // Generate kombinasi (student_id, course_id)
    const krsData = [];

    for (const sId of studentIds) {
      for (const cId of courseIds) {
        krsData.push({
          student_id: sId,
          course_id: cId,
          academic_year_id: academicYearId,
          status: 'APPROVED' // Langsung disetujui
        });
      }
    }

    const { error } = await supabase
      .from("krs")
      .insert(krsData);

    if (error) throw error;

    revalidatePath("/validasi-krs");
    return { success: true, count: krsData.length };

  } catch (error: any) {
    console.error("Error bulk create KRS:", error);
    throw new Error(error.message || "Gagal melakukan input kolektif.");
  }
}

export async function getCoursesForAcademicYear(academicYearId: string) {
  try {
    // 1. Cek Semester Ganjil/Genap
    const { data: ay } = await supabase
      .from("academic_years")
      .select("semester")
      .eq("id", academicYearId)
      .single();

    if (!ay) return [];

    const isGanjil = ay.semester.toLowerCase().includes('ganjil');

    // 2. Ambil Courses
    // Logic: Ganjil = smt_default ganjil (1,3,5,7), Genap = smt_default genap (2,4,6,8)
    // Kita bisa filter di client atau query. Untuk simpel query lte/gte susah pola odd/even.
    // Kita fetch semua lalu fileter JS (assuming courses not huge) or use mod func in sql (rpc).
    // For now, fetch all then filter is safest without knowing RPC.

    const { data: courses, error } = await supabase
      .from('courses')
      .select(`
                *,
                course_study_programs (
                    study_program:study_programs (id, kode, nama, jenjang)
                )
            `)
      .order('matkul', { ascending: true });

    if (error) throw error;

    const transformedData = courses.map((course: any) => ({
      ...course,
      study_programs: course.course_study_programs?.map((csp: any) => csp.study_program).filter(Boolean) || []
    }));

    // Filter Ganjil/Genap
    return transformedData.filter((c: any) => {
      if (isGanjil) return c.smt_default % 2 !== 0;
      return c.smt_default % 2 === 0;
    });

  } catch (error) {
    console.error("Error fetching courses for AY:", error);
    return [];
  }
}
