'use server'

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { StudentData, TranscriptItem, StudentFormValues, StudyProgram, AcademicYear, Official } from "@/lib/types";
import { calculateStudentSemester } from "@/lib/academic-utils";

const supabaseAdmin = createAdminClient();

// Internal Interface
interface DBResponseStudent {
  id: string;
  nim: string;
  nama: string;
  alamat: string;
  angkatan: number;
  study_program_id: string | null;
  status_mahasiswa: string;
  jenis_kelamin: string | null;
  tempat_lahir: string | null;
  tanggal_lahir: string | null;
  agama: string | null;
  nik: string | null;
  status: string | null;
  no_hp: string | null;
  email: string | null;
  study_programs: StudyProgram | null;
  grades: {
    id: string;
    hm: string;
    courses: {
      id: string;
      kode: string;
      matkul: string;
      sks: number;
      smt_default: number;
    } | null;
  }[];

  krs: {
    status: string;
    courses: {
      id: string;
      kode: string;
      matkul: string;
      sks: number;
      smt_default: number;
    } | null;
  }[];
}

const getAM = (hm: string): number => {
  const map: Record<string, number> = { 'A': 4, 'B': 3, 'C': 2, 'D': 1 };
  return map[hm] || 0;
};



// --- HELPER ERROR HANDLING ---
const handleDbError = (error: any, context: string) => {
  console.error(`[DB_ERROR] ${context}:`, error);

  if (error.code === '23505') {
    if (error.message?.includes('nim')) {
      throw new Error("NIM tersebut sudah terdaftar. Silakan gunakan NIM lain.");
    }
    throw new Error("Data duplikat terdeteksi dalam sistem.");
  }

  if (error.code === '23503') {
    throw new Error("Data tidak dapat dihapus atau diubah karena sedang digunakan oleh data lain.");
  }

  throw new Error("Gagal memproses data. Terjadi kendala di server.");
};

// --- READ OPERATIONS ---

export async function getStudyPrograms(): Promise<StudyProgram[]> {
  const { data, error } = await supabaseAdmin
    .from('study_programs')
    .select('*')
    .order('nama', { ascending: true });

  if (error) return [];
  return data as StudyProgram[];
}

export async function getActiveAcademicYear(): Promise<AcademicYear | null> {
  const { data, error } = await supabaseAdmin
    .from('academic_years')
    .select('*')
    .eq('is_active', true)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') console.error("Error fetching active academic year:", error.message);
    return null;
  }
  return data as AcademicYear;
}

export async function getActiveOfficial(): Promise<Official | null> {
  // Legacy support or default fallback
  return getOfficialForDocument(undefined);
}

export async function getOfficialForDocument(studyProgramId?: string): Promise<Official | null> {
  // 1. Coba cari Kaprodi sesuai Prodi Mahasiswa
  if (studyProgramId) {
    // Prioritas 1: Filter by Prodi AND Jabatan contains 'Kaprodi' or 'Ketua'
    const { data: kaprodi } = await supabaseAdmin
      .from('officials')
      .select('*, lecturer:lecturers(*), study_program:study_programs(*)')
      .eq('study_program_id', studyProgramId)
      .ilike('jabatan', '%Kaprodi%') // Prioritize explicitly named Kaprodi
      .eq('is_active', true)
      .maybeSingle();

    if (kaprodi) return kaprodi as unknown as Official;

    // Prioritas 2: Filter by Prodi only (Fallback if jabatan name differs)
    const { data: prodiOfficial } = await supabaseAdmin
      .from('officials')
      .select('*, lecturer:lecturers(*), study_program:study_programs(*)')
      .eq('study_program_id', studyProgramId)
      .eq('is_active', true)
      .limit(1) // Avoid crash if multiple
      .maybeSingle();

    if (prodiOfficial) return prodiOfficial as unknown as Official;
  }

  // 2. Jika tidak ada (atau prodi beda), cari Ketua STMIK (Global)
  const { data: ketua } = await supabaseAdmin
    .from('officials')
    .select('*, lecturer:lecturers(*), study_program:study_programs(*)')
    .ilike('jabatan', '%Ketua%') // Flexible match for Ketua STMIK / Ketua
    .is('study_program_id', null) // Ensure general official (not bound to specific prodi)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (ketua) return ketua as unknown as Official;

  // 3. Fallback: Ambil sembarang official aktif (bisa jadi Waket dsb)
  const { data: anyOfficial } = await supabaseAdmin
    .from('officials')
    .select('*, lecturer:lecturers(*), study_program:study_programs(*)')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  return anyOfficial as unknown as Official || null;
}

export async function getStudents(): Promise<StudentData[]> {
  const activeYear = await getActiveAcademicYear();

  // 1. AMBIL DATA USERS SECARA TERPISAH (Untuk Foto)
  const { data: usersData } = await supabaseAdmin
    .from('users')
    .select('student_id, avatar_url')
    .not('student_id', 'is', null);

  const avatarMap = new Map<string, string>();
  if (usersData) {
    usersData.forEach((u) => {
      if (u.student_id && u.avatar_url) {
        avatarMap.set(u.student_id, u.avatar_url);
      }
    });
  }

  // 2. AMBIL DATA MAHASISWA
  const { data, error } = await supabaseAdmin
    .from('students')
    .select(`
      *,
      study_programs (
        id, kode, nama, jenjang
      ),
      grades (
        id, hm,
        courses (
          id, kode, matkul, sks, smt_default
        )
      ),
      krs (
        status,
        courses (
          id, kode, matkul, sks, smt_default
        )
      )
    `)
    .order('nama', { ascending: true });

  if (error) {
    console.error("Error fetching students:", error.message);
    return [];
  }

  if (!data) return [];

  const students = data as unknown as DBResponseStudent[];

  return students.map((s) => {
    const dynamicSemester = calculateStudentSemester(s.angkatan, activeYear, s.status_mahasiswa);
    const userAvatar = avatarMap.get(s.id) || null;

    const totalSksApproved = (s.krs || []).reduce((acc, curr) => {
      if (curr.status === "APPROVED") {
        return acc + (curr.courses?.sks || 0);
      }
      return acc;
    }, 0);

    const gradesTranscript: TranscriptItem[] = (s.grades || []).map((g) => {
      const course = g.courses;
      const am = getAM(g.hm);
      const sks = course?.sks || 0;
      const nm = am * sks;

      return {
        no: 0,
        course_id: course?.id,
        kode: course?.kode || "CODE",
        matkul: course?.matkul || "Unknown",
        smt: course?.smt_default || 1,
        sks: sks,
        hm: g.hm,
        am: am,
        nm: nm
      };
    });

    const gradeCourseIds = new Set(gradesTranscript.map(t => t.course_id));

    const krsTranscript: TranscriptItem[] = (s.krs || [])
      .filter(k => k.status === 'APPROVED' && k.courses && !gradeCourseIds.has(k.courses.id))
      .map(k => {
        const c = k.courses!;
        return {
          no: 0,
          course_id: c.id,
          kode: c.kode,
          matkul: c.matkul,
          smt: c.smt_default,
          sks: c.sks,
          hm: "-",
          am: 0,
          nm: 0
        };
      });

    const fullTranscript = [...gradesTranscript, ...krsTranscript]
      .sort((a, b) => a.smt - b.smt || a.kode.localeCompare(b.kode))
      .map((item, index) => ({ ...item, no: index + 1 }));

    return {
      id: s.id,
      profile: {
        id: s.id,
        nim: s.nim,
        nama: s.nama,
        alamat: s.alamat,
        angkatan: s.angkatan || 0,
        semester: dynamicSemester,
        study_program_id: s.study_program_id,
        study_program: s.study_programs,
        status_mahasiswa: s.status_mahasiswa || 'AKTIF',
        avatar_url: userAvatar,
        jenis_kelamin: s.jenis_kelamin,
        tempat_lahir: s.tempat_lahir,
        tanggal_lahir: s.tanggal_lahir,
        agama: s.agama,
        nik: s.nik,
        status: s.status,
        no_hp: s.no_hp,
        email: s.email,
      },
      transcript: fullTranscript,
      total_sks: totalSksApproved
    };
  });
}

export async function getStudentById(id: string): Promise<StudentData | null> {
  const activeYear = await getActiveAcademicYear();

  // 1. Get User Avatar
  const { data: userData } = await supabaseAdmin
    .from('users')
    .select('avatar_url')
    .eq('student_id', id)
    .single();

  // 2. Get Student Data
  const { data, error } = await supabaseAdmin
    .from('students')
    .select(`
      *,
      study_programs (
        id, kode, nama, jenjang
      ),
      grades (
        id, hm,
        courses (
          id, kode, matkul, sks, smt_default
        )
      ),
      krs (
        status,
        courses (
          id, kode, matkul, sks, smt_default
        )
      )
    `)
    .eq('id', id)
    .single();

  if (error || !data) {
    if (error && error.code !== 'PGRST116') console.error("Error fetching student:", error.message);
    return null;
  }

  const s = data as unknown as DBResponseStudent;
  const userAvatar = userData?.avatar_url || null;
  const dynamicSemester = calculateStudentSemester(s.angkatan, activeYear, s.status_mahasiswa);

  const totalSksApproved = (s.krs || []).reduce((acc, curr) => {
    if (curr.status === "APPROVED") {
      return acc + (curr.courses?.sks || 0);
    }
    return acc;
  }, 0);

  const gradesTranscript: TranscriptItem[] = (s.grades || []).map((g) => {
    const course = g.courses;
    const am = getAM(g.hm);
    const sks = course?.sks || 0;
    const nm = am * sks;

    return {
      no: 0,
      course_id: course?.id,
      kode: course?.kode || "CODE",
      matkul: course?.matkul || "Unknown",
      smt: course?.smt_default || 1,
      sks: sks,
      hm: g.hm,
      am: am,
      nm: nm
    };
  });

  const gradeCourseIds = new Set(gradesTranscript.map(t => t.course_id));

  const krsTranscript: TranscriptItem[] = (s.krs || [])
    .filter(k => k.status === 'APPROVED' && k.courses && !gradeCourseIds.has(k.courses.id))
    .map(k => {
      const c = k.courses!;
      return {
        no: 0,
        course_id: c.id,
        kode: c.kode,
        matkul: c.matkul,
        smt: c.smt_default,
        sks: c.sks,
        hm: "-",
        am: 0,
        nm: 0
      };
    });

  const fullTranscript = [...gradesTranscript, ...krsTranscript]
    .sort((a, b) => a.smt - b.smt || a.kode.localeCompare(b.kode))
    .map((item, index) => ({ ...item, no: index + 1 }));

  return {
    id: s.id,
    profile: {
      id: s.id,
      nim: s.nim,
      nama: s.nama,
      alamat: s.alamat,
      angkatan: s.angkatan || 0,
      semester: dynamicSemester,
      study_program_id: s.study_program_id,
      study_program: s.study_programs,
      status_mahasiswa: s.status_mahasiswa || 'AKTIF',
      avatar_url: userAvatar,
      jenis_kelamin: s.jenis_kelamin,
      tempat_lahir: s.tempat_lahir,
      tanggal_lahir: s.tanggal_lahir,
      agama: s.agama,
      nik: s.nik,
      status: s.status,
      no_hp: s.no_hp,
      email: s.email,
    },
    transcript: fullTranscript,
    total_sks: totalSksApproved
  };
}

// --- CRUD OPERATIONS ---
export async function createStudent(values: StudentFormValues) {
  const { error } = await supabaseAdmin.from('students').insert([{
    nim: values.nim,
    nama: values.nama,
    angkatan: Number(values.angkatan),
    alamat: values.alamat,
    study_program_id: values.study_program_id || null,
    status_mahasiswa: values.status_mahasiswa || 'AKTIF',
    jenis_kelamin: values.jenis_kelamin,
    tempat_lahir: values.tempat_lahir,
    tanggal_lahir: values.tanggal_lahir,
    agama: values.agama,
    nik: values.nik,
    status: values.status,
    no_hp: values.no_hp,
    email: values.email,
  }]);

  if (error) handleDbError(error, "createStudent");

  revalidatePath('/mahasiswa');
}

export async function createBulkStudents(students: any[]) {
  if (students.length === 0) return;

  const validStudents = students.map(s => ({
    nim: s.nim,
    nama: s.nama,
    angkatan: Number(s.angkatan),
    alamat: s.alamat,
    study_program_id: s.study_program_id || null,
    status_mahasiswa: s.status_mahasiswa || 'AKTIF',
    jenis_kelamin: s.jenis_kelamin,
    tempat_lahir: s.tempat_lahir,
    tanggal_lahir: s.tanggal_lahir,
    agama: s.agama,
    nik: s.nik,
    status: s.status,
    no_hp: s.no_hp,
    email: s.email,
  }));

  const { error } = await supabaseAdmin.from('students').insert(validStudents);

  if (error) handleDbError(error, "createBulkStudents");

  revalidatePath('/mahasiswa');
}

export async function updateStudent(id: string, values: StudentFormValues) {
  const { error } = await supabaseAdmin.from('students').update({
    nim: values.nim,
    nama: values.nama,
    angkatan: Number(values.angkatan),
    alamat: values.alamat,
    study_program_id: values.study_program_id || null,
    status_mahasiswa: values.status_mahasiswa || 'AKTIF',
    jenis_kelamin: values.jenis_kelamin,
    tempat_lahir: values.tempat_lahir,
    tanggal_lahir: values.tanggal_lahir,
    agama: values.agama,
    nik: values.nik,
    status: values.status,
    no_hp: values.no_hp,
    email: values.email,
  }).eq('id', id);

  if (error) handleDbError(error, "updateStudent");

  revalidatePath('/mahasiswa');
}

export async function deleteStudent(id: string) {
  const { error } = await supabaseAdmin.from('students').delete().eq('id', id);

  if (error) handleDbError(error, "deleteStudent");

  revalidatePath('/mahasiswa');
}

export async function getStudentByNim(nim: string): Promise<StudentData | null> {
  const activeYear = await getActiveAcademicYear();

  // 1. Get Student Data by NIM
  const { data, error } = await supabaseAdmin
    .from('students')
    .select(`
      *,
      study_programs (
        id, kode, nama, jenjang
      ),
      grades (
        id, hm,
        courses (
          id, kode, matkul, sks, smt_default
        )
      ),
      krs (
        status,
        courses (
          id, kode, matkul, sks, smt_default
        )
      )
    `)
    .eq('nim', nim)
    .single();

  if (error || !data) {
    if (error && error.code !== 'PGRST116') console.error("Error fetching student by NIM:", error.message);
    return null;
  }

  const s = data as unknown as DBResponseStudent;

  // 2. Get User Avatar (Requires separate query because user links to student_id, not nim)
  const { data: userData } = await supabaseAdmin
    .from('users')
    .select('avatar_url')
    .eq('student_id', s.id)
    .single();

  const userAvatar = userData?.avatar_url || null;
  const dynamicSemester = calculateStudentSemester(s.angkatan, activeYear, s.status_mahasiswa);

  const totalSksApproved = (s.krs || []).reduce((acc, curr) => {
    if (curr.status === "APPROVED") {
      return acc + (curr.courses?.sks || 0);
    }
    return acc;
  }, 0);

  const gradesTranscript: TranscriptItem[] = (s.grades || []).map((g) => {
    const course = g.courses;
    const am = getAM(g.hm);
    const sks = course?.sks || 0;
    const nm = am * sks;

    return {
      no: 0,
      course_id: course?.id,
      kode: course?.kode || "CODE",
      matkul: course?.matkul || "Unknown",
      smt: course?.smt_default || 1,
      sks: sks,
      hm: g.hm,
      am: am,
      nm: nm
    };
  });

  const gradeCourseIds = new Set(gradesTranscript.map(t => t.course_id));

  const krsTranscript: TranscriptItem[] = (s.krs || [])
    .filter(k => k.status === 'APPROVED' && k.courses && !gradeCourseIds.has(k.courses.id))
    .map(k => {
      const c = k.courses!;
      return {
        no: 0,
        course_id: c.id,
        kode: c.kode,
        matkul: c.matkul,
        smt: c.smt_default,
        sks: c.sks,
        hm: "-",
        am: 0,
        nm: 0
      };
    });

  const fullTranscript = [...gradesTranscript, ...krsTranscript]
    .sort((a, b) => a.smt - b.smt || a.kode.localeCompare(b.kode))
    .map((item, index) => ({ ...item, no: index + 1 }));

  return {
    id: s.id,
    profile: {
      id: s.id,
      nim: s.nim,
      nama: s.nama,
      alamat: s.alamat,
      angkatan: s.angkatan || 0,
      semester: dynamicSemester,
      study_program_id: s.study_program_id,
      study_program: s.study_programs,
      status_mahasiswa: s.status_mahasiswa || 'AKTIF',
      avatar_url: userAvatar,
      jenis_kelamin: s.jenis_kelamin,
      tempat_lahir: s.tempat_lahir,
      tanggal_lahir: s.tanggal_lahir,
      agama: s.agama,
      nik: s.nik,
      status: s.status,
      no_hp: s.no_hp,
      email: s.email,
    },
    transcript: fullTranscript,
    total_sks: totalSksApproved
  };
}

export async function checkExistingNims(nims: string[]): Promise<string[]> {
  if (nims.length === 0) return [];

  const { data, error } = await supabaseAdmin
    .from('students')
    .select('nim')
    .in('nim', nims);

  if (error) {
    console.error("Error checking NIMS:", error);
    return [];
  }

  return data.map((s) => s.nim);
}

export async function getAllStudentsForKtm(): Promise<StudentData[]> {
  const activeYear = await getActiveAcademicYear();

  // Fetch avatar mapping
  const { data: usersData } = await supabaseAdmin
    .from('users')
    .select('student_id, avatar_url')
    .not('student_id', 'is', null);

  const avatarMap = new Map<string, string>();
  if (usersData) {
    usersData.forEach((u) => {
      if (u.student_id && u.avatar_url) {
        avatarMap.set(u.student_id, u.avatar_url);
      }
    });
  }

  // Fetch students with minimal data for KTM
  const { data, error } = await supabaseAdmin
    .from('students')
    .select(`
      id, nim, nama, alamat, angkatan, study_program_id, is_active,
      study_programs (
        id, kode, nama, jenjang
      )
    `)
    .order('nama', { ascending: true });

  if (error) {
    console.error("Error fetching students for KTM:", error.message);
    return [];
  }

  if (!data) return [];

  return data.map((s: any) => {
    const dynamicSemester = calculateStudentSemester(s.angkatan, activeYear, s.status_mahasiswa);
    const userAvatar = avatarMap.get(s.id) || null;

    return {
      id: s.id,
      profile: {
        id: s.id,
        nim: s.nim,
        nama: s.nama,
        alamat: s.alamat,
        angkatan: s.angkatan || 0,
        semester: dynamicSemester,
        study_program_id: s.study_program_id,
        study_program: s.study_programs,
        status_mahasiswa: s.status_mahasiswa || 'AKTIF',
        avatar_url: userAvatar,
        jenis_kelamin: null,
        tempat_lahir: null,
        tanggal_lahir: null,
        agama: null,
        nik: null,
        status: null,
        no_hp: null,
        email: null,
      },
      transcript: [],
      total_sks: 0
    };
  });
}

export async function getAllStudentsForBiodata(): Promise<StudentData[]> {
  const activeYear = await getActiveAcademicYear();

  // Fetch avatar mapping
  const { data: usersData } = await supabaseAdmin
    .from('users')
    .select('student_id, avatar_url')
    .not('student_id', 'is', null);

  const avatarMap = new Map<string, string>();
  if (usersData) {
    usersData.forEach((u) => {
      if (u.student_id && u.avatar_url) {
        avatarMap.set(u.student_id, u.avatar_url);
      }
    });
  }

  // Fetch students with FULL data for Biodata
  const { data, error } = await supabaseAdmin
    .from('students')
    .select(`
      *,
      study_programs (
        id, kode, nama, jenjang
      )
    `)
    .order('nama', { ascending: true });

  if (error) {
    console.error("Error fetching students for Biodata:", error.message);
    return [];
  }

  if (!data) return [];

  return data.map((s: any) => {
    const dynamicSemester = calculateStudentSemester(s.angkatan, activeYear, s.status_mahasiswa);
    const userAvatar = avatarMap.get(s.id) || null;

    return {
      id: s.id,
      profile: {
        id: s.id,
        nim: s.nim,
        nama: s.nama,
        alamat: s.alamat,
        angkatan: s.angkatan || 0,
        semester: dynamicSemester,
        study_program_id: s.study_program_id,
        study_program: s.study_programs,
        status_mahasiswa: s.status_mahasiswa || 'AKTIF',
        avatar_url: userAvatar,
        jenis_kelamin: s.jenis_kelamin,
        tempat_lahir: s.tempat_lahir,
        tanggal_lahir: s.tanggal_lahir,
        agama: s.agama,
        nik: s.nik,
        status: s.status,
        no_hp: s.no_hp,
        email: s.email,
      },
      transcript: [],
      total_sks: 0
    };
  });
}