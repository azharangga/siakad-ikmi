"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { GradeData, GradeFormValues } from "@/lib/types";
import { revalidatePath } from "next/cache";

const supabase = createAdminClient();

// --- FETCH DATA ---

export async function getGrades(): Promise<GradeData[]> {
  let allData: any[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from("grades")
      .select(`
        *,
        student:students (
          id, 
          nim, 
          nama, 
          study_program:study_programs (
             nama,
             jenjang
          )
        ),
        course:courses (id, kode, matkul, sks)
      `)
      .order("hm", { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) throw new Error(error.message);

    if (!data || data.length === 0) {
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
  return allData as unknown as GradeData[];
}

export async function getStudentCoursesForGrading(studentId: string) {
  try {
    const { data: krsList, error: krsError } = await supabase
      .from("krs")
      .select("course_id")
      .eq("student_id", studentId)
      .eq("status", "APPROVED");

    if (krsError) throw krsError;
    if (!krsList || krsList.length === 0) return [];

    const courseIds = Array.from(new Set(krsList.map((k) => k.course_id)));

    const { data: courses, error: courseError } = await supabase
      .from("courses")
      .select("id, kode, matkul, sks, smt_default")
      .in("id", courseIds)
      .order("smt_default", { ascending: true })
      .order("matkul", { ascending: true });

    if (courseError) throw courseError;
    return courses;
  } catch (error: any) {
    console.error("Error fetching student grading courses:", error.message);
    return [];
  }
}

export async function getStudentsForSelect() {
  let allData: any[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from("students")
      .select("id, nim, nama")
      .order("nama", { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) throw new Error(error.message);

    if (!data || data.length === 0) {
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
  return allData;
}

export async function getCoursesForSelect() {
  let allData: any[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from("courses")
      .select("id, kode, matkul, sks, smt_default")
      .order("matkul", { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) throw new Error(error.message);

    if (!data || data.length === 0) {
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
  return allData;
}

// --- Fetch Grade Summary (Dashboard) ---
export async function getStudentGradeSummary(studentId: string) {
  try {
    const { data: grades, error } = await supabase
      .from("grades")
      .select(`
        id,
        hm,
        course:courses (
          id,
          kode,
          matkul,
          sks,
          smt_default
        )
      `)
      .eq("student_id", studentId);

    if (error) throw error;

    const getAM = (hm: string) => {
      switch (hm) {
        case "A": return 4;
        case "B": return 3;
        case "C": return 2;
        case "D": return 1;
        default: return 0;
      }
    };

    const processedData = grades.map((g: any) => {
      const am = getAM(g.hm);
      const sks = g.course.sks;
      return {
        id: g.id,
        kode: g.course.kode,
        matkul: g.course.matkul,
        sks: sks,
        semester: g.course.smt_default,
        hm: g.hm,
        am: am,
        nm: (am * sks)
      };
    });

    const totalSKS = processedData.reduce((acc, curr) => acc + curr.sks, 0);
    const totalNM = processedData.reduce((acc, curr) => acc + curr.nm, 0);
    const ipk = totalSKS > 0 ? (totalNM / totalSKS).toFixed(2) : "0.00";

    processedData.sort((a, b) => {
      if (a.semester !== b.semester) return a.semester - b.semester;
      return a.matkul.localeCompare(b.matkul);
    });

    return {
      grades: processedData,
      summary: { totalSKS, totalNM, ipk }
    };

  } catch (error: any) {
    console.error("Error fetching student grades:", error.message);
    return { grades: [], summary: { totalSKS: 0, totalNM: 0, ipk: "0.00" } };
  }
}

// --- BATCH SAVE OPERATION ---
export async function saveStudentGrades(
  studentId: string,
  grades: { course_id: string, hm: string }[]
) {
  for (const item of grades) {
    const { data: existing } = await supabase
      .from("grades")
      .select("id")
      .eq("student_id", studentId)
      .eq("course_id", item.course_id)
      .single();

    if (existing) {
      await supabase.from("grades").update({ hm: item.hm }).eq("id", existing.id);
    } else {
      if (item.hm) {
        await supabase.from("grades").insert({
          student_id: studentId,
          course_id: item.course_id,
          hm: item.hm
        });
      }
    }
  }
  revalidatePath("/nilai");
}

/* NEW: BULK IMPORT FOR EXCEL */
export async function createBulkGrades(data: { nim: string, kode: string, hm: string }[]) {
  try {
    const uniqueNims = Array.from(new Set(data.map(d => d.nim)));
    const uniqueKodes = Array.from(new Set(data.map(d => d.kode)));

    // 1. Resolve Students
    const { data: students, error: studentError } = await supabase
      .from('students')
      .select('id, nim')
      .in('nim', uniqueNims);

    if (studentError) throw new Error("Gagal mengambil data mahasiswa");
    const studentMap = new Map(students.map((s: any) => [s.nim, s.id]));

    // 2. Resolve Courses
    const { data: courses, error: courseError } = await supabase
      .from('courses')
      .select('id, kode')
      .in('kode', uniqueKodes);

    if (courseError) throw new Error("Gagal mengambil data mata kuliah");
    const courseMap = new Map(courses.map((c: any) => [c.kode, c.id]));

    // 3. Prepare Upsert Data
    // 3. Prepare Data & Logic
    const errorList: string[] = [];
    const validItems: { student_id: string, course_id: string, hm: string }[] = [];

    const involvedStudentIds = new Set<string>();

    for (const item of data) {
      const studentId = studentMap.get(item.nim);
      const courseId = courseMap.get(item.kode);

      if (!studentId) {
        errorList.push(`NIM ${item.nim} tidak ditemukan`);
        continue;
      }
      if (!courseId) {
        errorList.push(`Kode Matkul ${item.kode} tidak ditemukan`);
        continue;
      }
      validItems.push({ student_id: studentId, course_id: courseId, hm: item.hm });
      involvedStudentIds.add(studentId);
    }

    if (errorList.length > 0) {
      return { success: false, message: `Terdapat ${errorList.length} error. Contoh: ${errorList[0]}` };
    }

    // 4. Manual "Upsert" Strategy (Fetch -> Split -> Act)
    // Fetch all existing grades for these students to determine if we update or insert
    const studentIdsArray = Array.from(involvedStudentIds);
    // Batched fetch if too many students
    let existingGrades: any[] = [];

    // Chunk student IDs for fetching existing grades
    const fetchBatchSize = 100;
    for (let i = 0; i < studentIdsArray.length; i += fetchBatchSize) {
      const chunk = studentIdsArray.slice(i, i + fetchBatchSize);
      const { data: gradesChunk, error: fetchError } = await supabase
        .from('grades')
        .select('id, student_id, course_id')
        .in('student_id', chunk);

      if (fetchError) throw new Error("Gagal memeriksa data nilai yang ada.");
      if (gradesChunk) existingGrades = existingGrades.concat(gradesChunk);
    }

    // Map existing: "studentId-courseId" -> gradeId
    const existingMap = new Map<string, string>();
    existingGrades.forEach((g: any) => {
      existingMap.set(`${g.student_id}-${g.course_id}`, g.id);
    });

    const toInsert: any[] = [];
    const toUpdate: { id: string, hm: string }[] = [];

    for (const item of validItems) {
      const key = `${item.student_id}-${item.course_id}`;
      if (existingMap.has(key)) {
        toUpdate.push({ id: existingMap.get(key)!, hm: item.hm });
      } else {
        toInsert.push(item);
      }
    }

    // A. Bulk Insert
    if (toInsert.length > 0) {
      const { error: insertError } = await supabase.from('grades').insert(toInsert);
      if (insertError) throw new Error("Gagal menyimpan data nilai baru: " + insertError.message);
    }

    // B. Parallel Updates
    if (toUpdate.length > 0) {
      // Process updates in chunks to avoid connection pool exhaustion
      const updateBatchSize = 20;
      for (let i = 0; i < toUpdate.length; i += updateBatchSize) {
        const batch = toUpdate.slice(i, i + updateBatchSize);
        await Promise.all(
          batch.map(u => supabase.from('grades').update({ hm: u.hm }).eq('id', u.id))
        );
      }
    }

    revalidatePath("/nilai");
    return { success: true };

  } catch (error: any) {
    console.error("Bulk Grade Import Error:", error);
    return { success: false, message: error.message };
  }
}

// --- CRUD SINGLE ---
export async function createGrade(formData: GradeFormValues) {
  const { error } = await supabase.from("grades").insert({
    student_id: formData.student_id,
    course_id: formData.course_id,
    hm: formData.hm,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/nilai");
}

export async function updateGrade(id: string, formData: GradeFormValues) {
  const { error } = await supabase
    .from("grades")
    .update({
      student_id: formData.student_id,
      course_id: formData.course_id,
      hm: formData.hm,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/nilai");
}

export async function deleteGrade(id: string) {
  const { error } = await supabase.from("grades").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/nilai");
}