"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { KRS, KRSFormValues, Course } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { calculateStudentSemester } from "@/lib/academic-utils";

const supabase = createAdminClient();

// Tipe Data Khusus
export interface CourseOffering extends Course {
  is_taken: boolean;
  krs_id?: string;
  krs_status?: string;
}

// ==========================================
// GATEKEEPER & VALIDATION
// ==========================================

export async function validateStudentKrs(studentId: string) {
  try {
    const { data: activeYear, error: yearError } = await supabase
      .from("academic_years")
      .select("id, nama, semester")
      .eq("is_active", true)
      .single();

    if (yearError || !activeYear) {
      return { allowed: false, message: "Tahun akademik tidak aktif." };
    }

    const { data: krs, error: krsError } = await supabase
      .from("krs")
      .select("status")
      .eq("student_id", studentId)
      .eq("academic_year_id", activeYear.id)
      .in("status", ["SUBMITTED", "APPROVED"])
      .limit(1);

    const hasValidKrs = krs && krs.length > 0;

    if (!hasValidKrs) {
      return {
        allowed: false,
        message: "Anda belum mengajukan atau menyelesaikan KRS untuk semester ini.",
        reason: "no_krs"
      };
    }

    return { allowed: true, year: activeYear };

  } catch (error) {
    return { allowed: false, message: "Terjadi kesalahan sistem saat memvalidasi KRS." };
  }
}

export async function getStudentSksCount(studentId: string, academicYearId: string) {
  try {
    const { data, error } = await supabase
      .from("krs")
      .select(`course:courses (sks)`)
      .eq("student_id", studentId)
      .eq("academic_year_id", academicYearId);

    if (error || !data) return 0;

    const totalSks = data.reduce((acc: number, curr: any) => {
      return acc + (curr.course?.sks || 0);
    }, 0);

    return totalSks;
  } catch (error) {
    return 0;
  }
}

// ==========================================
// STUDENT ACTIONS (MAHASISWA)
// ==========================================

export async function getKRSByStudent(studentId: string, academicYearId: string) {
  try {
    const { data, error } = await supabase
      .from("krs")
      .select(`
        *,
        course:courses (id, kode, matkul, sks, smt_default, kategori),
        academic_year:academic_years (id, nama, semester)
      `)
      .eq("student_id", studentId)
      .eq("academic_year_id", academicYearId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data as KRS[];
  } catch (error) {
    console.error("Error fetching KRS:", error);
    throw new Error("Gagal mengambil data KRS.");
  }
}

export async function getStudentCourseOfferings(studentId: string, academicYearId: string) {
  try {
    // A. Ambil Data Mahasiswa beserta study_program_id
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select(`*, study_program:study_programs (id, nama, jenjang)`)
      .eq("id", studentId)
      .single();

    if (studentError) throw new Error("Data mahasiswa tidak ditemukan");

    // B. Ambil Data Tahun Akademik
    const { data: academicYear, error: yearError } = await supabase
      .from("academic_years")
      .select("nama, semester")
      .eq("id", academicYearId)
      .single();

    if (yearError) throw new Error("Tahun akademik tidak ditemukan");

    // Hitung semester mahasiswa
    const calculatedSemester = calculateStudentSemester(student.angkatan, academicYear, student.status_mahasiswa);

    // C. Cek Status MBKM Mahasiswa
    const { data: mbkmData } = await supabase
      .from("student_mbkm")
      .select("jenis_mbkm, mitra")
      .eq("student_id", studentId)
      .eq("academic_year_id", academicYearId)
      .single();

    let courses: any[] = [];

    if (mbkmData && mbkmData.jenis_mbkm === "Pertukaran Mahasiswa Merdeka") {
      // Mahasiswa MBKM: hanya tampilkan mata kuliah kategori MBKM
      const { data: mbkmCourses, error: courseError } = await supabase
        .from("courses")
        .select("*")
        .eq("smt_default", calculatedSemester)
        .eq("kategori", "MBKM")
        .order("matkul", { ascending: true });

      if (courseError) throw courseError;
      courses = mbkmCourses || [];
    } else {
      // Mahasiswa Reguler: filter berdasarkan program studi via junction table
      const studentProdiId = student.study_program_id;

      // Query mata kuliah yang terkait dengan program studi mahasiswa
      const { data: coursesByProdi, error: prodiCourseError } = await supabase
        .from("course_study_programs")
        .select(`
          course:courses (*)
        `)
        .eq("study_program_id", studentProdiId);

      if (prodiCourseError) throw prodiCourseError;

      // Flatten dan filter berdasarkan semester, exclude MBKM
      const flatCourses = (coursesByProdi || [])
        .map((item: any) => item.course)
        .filter((c: any) => c && c.smt_default === calculatedSemester && c.kategori !== "MBKM");

      courses = flatCourses.sort((a: any, b: any) => a.matkul.localeCompare(b.matkul));
    }

    // E. Ambil Data KRS yang SUDAH diambil
    const { data: takenKRS, error: krsError } = await supabase
      .from("krs")
      .select("id, course_id, status")
      .eq("student_id", studentId)
      .eq("academic_year_id", academicYearId);

    if (krsError) throw krsError;

    // F. Gabungkan Data
    const offerings: CourseOffering[] = courses.map((course) => {
      const taken = takenKRS.find((k) => k.course_id === course.id);
      return {
        ...course,
        is_taken: !!taken,
        krs_id: taken?.id,
        krs_status: taken?.status
      };
    });

    return {
      student_semester: calculatedSemester,
      student_profile: student,
      offerings: offerings,
      mbkm_data: mbkmData || null
    };

  } catch (error) {
    console.error("Error fetching offerings:", error);
    return { student_semester: 0, student_profile: null, offerings: [], mbkm_data: null };
  }
}

export async function createKRS(payload: KRSFormValues) {
  try {
    const { data: existing } = await supabase
      .from("krs")
      .select("id")
      .eq("student_id", payload.student_id)
      .eq("course_id", payload.course_id)
      .eq("academic_year_id", payload.academic_year_id)
      .single();

    if (existing) throw new Error("Mata kuliah ini sudah diambil.");

    const { error } = await supabase.from("krs").insert({
      student_id: payload.student_id,
      course_id: payload.course_id,
      academic_year_id: payload.academic_year_id,
      status: "DRAFT",
    });

    if (error) {
      if (error.code === '23505') throw new Error("Mata kuliah sudah diambil.");
      throw error;
    }

    // revalidatePath("/krs"); // Disabled to prevent client re-rendering/flash

    // Fetch the created record to get the ID
    const { data: newKrs } = await supabase
      .from("krs")
      .select("id")
      .eq("student_id", payload.student_id)
      .eq("course_id", payload.course_id)
      .eq("academic_year_id", payload.academic_year_id)
      .single();

    return { success: true, data: newKrs };
  } catch (error: any) {
    throw new Error(error.message || "Gagal mengambil mata kuliah.");
  }
}

export async function deleteKRS(id: string) {
  try {
    const { error } = await supabase.from("krs").delete().eq("id", id);
    if (error) throw error;
    // revalidatePath("/krs"); // Disabled to prevent client re-rendering/flash
  } catch (error) {
    throw new Error("Gagal membatalkan mata kuliah.");
  }
}

export async function submitKRS(studentId: string, academicYearId: string) {
  try {
    const { error } = await supabase
      .from("krs")
      .update({ status: "SUBMITTED" })
      .eq("student_id", studentId)
      .eq("academic_year_id", academicYearId)
      .eq("status", "DRAFT");

    if (error) throw error;
    revalidatePath("/krs");
    revalidatePath("/validasi-krs");
  } catch (error) {
    throw new Error("Gagal mengajukan KRS.");
  }
}

export async function resetKRS(studentId: string, academicYearId: string) {
  try {
    const { error } = await supabase
      .from("krs")
      .delete()
      .eq("student_id", studentId)
      .eq("academic_year_id", academicYearId);

    if (error) throw error;
    revalidatePath("/krs");
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message || "Gagal mereset KRS.");
  }
}

// ==========================================
// ADMIN ACTIONS (VALIDASI)
// ==========================================

export async function getStudentsWithSubmittedKRS(academicYearId: string) {
  try {
    const { data: academicYear } = await supabase
      .from("academic_years")
      .select("nama, semester")
      .eq("id", academicYearId)
      .single();

    let krsList: any[] = [];
    let krsPage = 0;
    const pageSize = 1000;
    let hasMoreKrs = true;

    while (hasMoreKrs) {
      const { data: pageKrs, error } = await supabase
        .from("krs")
        .select(`
          student_id, status,
          students:students (
            id, nim, nama, angkatan, status_mahasiswa,
            study_program:study_programs (nama, jenjang)
          )
        `)
        .eq("academic_year_id", academicYearId)
        .in("status", ["SUBMITTED", "APPROVED", "REJECTED"])
        .range(krsPage * pageSize, (krsPage + 1) * pageSize - 1);

      if (error) throw error;

      if (!pageKrs || pageKrs.length === 0) {
        hasMoreKrs = false;
      } else {
        krsList.push(...pageKrs);
        if (pageKrs.length < pageSize) {
          hasMoreKrs = false;
        } else {
          krsPage++;
        }
      }
    }

    const studentMap = new Map<string, any>();

    krsList.forEach((item: any) => {
      if (item.students && !studentMap.has(item.student_id)) {
        const calculatedSemester = calculateStudentSemester(item.students.angkatan, academicYear, item.students.status_mahasiswa);
        studentMap.set(item.student_id, {
          ...item.students, status: item.status, semester: calculatedSemester
        });
      }
    });

    return Array.from(studentMap.values());
  } catch (error) {
    console.error("Error fetching students:", error);
    return [];
  }
}

export async function approveKRS(studentId: string, academicYearId: string) {
  try {
    const { error } = await supabase
      .from("krs")
      .update({ status: "APPROVED" })
      .eq("student_id", studentId)
      .eq("academic_year_id", academicYearId)
      .in("status", ["SUBMITTED", "DRAFT", "REJECTED"]);

    if (error) throw error;
    revalidatePath("/validasi-krs");
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message || "Gagal menyetujui KRS.");
  }
}

export async function rejectKRS(studentId: string, academicYearId: string) {
  try {
    const { error } = await supabase
      .from("krs")
      .update({ status: "REJECTED" })
      .eq("student_id", studentId)
      .eq("academic_year_id", academicYearId)
      .in("status", ["SUBMITTED", "APPROVED"]);

    if (error) throw error;
    revalidatePath("/validasi-krs");
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message || "Gagal menolak KRS.");
  }
}

export async function approveAllKRS(academicYearId: string) {
  try {
    const { error } = await supabase
      .from("krs")
      .update({ status: "APPROVED" })
      .eq("academic_year_id", academicYearId)
      .eq("status", "SUBMITTED");

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message || "Gagal menyetujui semua KRS.");
  }
}