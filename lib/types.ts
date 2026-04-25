// lib/types.ts

// =========================================
// GLOBAL & SHARED
// =========================================
export type Role = "admin" | "dosen" | "mahasiswa" | "superuser";
export type CourseCategory = "Reguler" | "MBKM";

export interface StudyProgram {
  id: string;
  kode: string;
  nama: string;
  jenjang: string;
}

export interface StudyProgramFormValues {
  kode: string;
  nama: string;
  jenjang: string;
}

export interface AcademicYear {
  id: string;
  nama: string;
  semester: string;
  is_active: boolean;
}

export interface AcademicYearFormValues {
  nama: string;
  semester: string;
  is_active: boolean;
}

// Interface untuk Pejabat (Official)
export interface Official {
  id: string;
  jabatan: string;
  is_active: boolean;
  ttd_basah_url?: string | null;
  ttd_digital_url?: string | null;
  lecturer_id: string;
  study_program_id?: string | null;

  // Relations
  lecturer: Lecturer;
  study_program?: StudyProgram | null;
}

export interface OfficialFormValues {
  jabatan: string;
  is_active: boolean;
  ttd_basah_url?: string | null;
  ttd_digital_url?: string | null;
  lecturer_id: string;
  study_program_id?: string | null;
}

// =========================================
// LECTURER (DOSEN)
// =========================================
export interface Lecturer {
  id: string;
  nidn: string | null;
  nama: string;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  avatar_url?: string | null;
}

export interface LecturerFormValues {
  nidn: string;
  nama: string;
  email: string;
  phone: string;
  is_active: boolean;
  avatar_url?: string | null;
}

// =========================================
// COURSE (MATA KULIAH)
// =========================================
export interface Course {
  id: string;
  kode: string;
  matkul: string;
  sks: number;
  smt_default: number;
  kategori: CourseCategory | string;
  study_programs?: StudyProgram[];
}

export interface CourseFormValues {
  kode: string;
  matkul: string;
  sks: number | string;
  smt_default: number | string;
  kategori: CourseCategory | "";
  study_program_ids: string[];
}

export type CoursePayload = CourseFormValues;

// =========================================
// STUDENT (MAHASISWA)
// =========================================
export interface StudentProfile {
  id: string;
  nim: string;
  nama: string;
  alamat: string;
  angkatan: number;
  semester: number;
  study_program_id: string | null;
  study_program?: StudyProgram | null;
  is_active: boolean;
  avatar_url?: string | null;
  jenis_kelamin?: string | null;
  tempat_lahir?: string | null;
  tanggal_lahir?: string | null;
  agama?: string | null;
  nik?: string | null;
  status?: string | null;
  no_hp?: string | null;
  email?: string | null;
}

export interface StudentFormValues {
  nim: string;
  nama: string;
  angkatan: string | number;
  alamat: string;
  study_program_id: string;
  is_active: boolean;
  avatar_url?: string | null;
  jenis_kelamin: string;
  tempat_lahir: string;
  tanggal_lahir: string;
  agama: string;
  nik: string;
  status: string;
  no_hp: string;
  email: string;
}

// =========================================
// TRANSCRIPT & GRADES
// =========================================
export interface TranscriptItem {
  no: number;
  course_id?: string;
  kode: string;
  matkul: string;
  smt: number;
  sks: number;
  hm: string;
  am: number;
  nm: number;
  kategori?: CourseCategory;
}

export interface StudentData {
  id: string;
  profile: StudentProfile;
  transcript: TranscriptItem[];
  total_sks?: number;
}

// =========================================
// USERS (PENGGUNA)
// =========================================
export interface UserData {
  id: string;
  name: string;
  username: string;
  role: Role | string;
  student_id?: string | null;
  lecturer_id?: string | null;
  is_active: boolean;
  avatar_url?: string | null;
}

export interface UserPayload {
  name: string;
  username: string;
  password?: string;
  role: string;
  student_id?: string | null;
  lecturer_id?: string | null;
  is_active?: boolean;
}

export interface UserFormValues {
  id?: string;
  name: string;
  username: string;
  password?: string;
  role: string;
  student_id?: string | null;
  lecturer_id?: string | null;
  is_active: boolean;
}

export interface StudentOption {
  id: string;
  nim: string;
  nama: string;
  is_taken: boolean;
}

export interface LecturerOption {
  id: string;
  nidn: string;
  nama: string;
  is_taken: boolean;
}

// =========================================
// SETTINGS (PENGATURAN)
// =========================================
export interface UserProfile {
  name: string;
  username: string;
  role: string;
  alamat?: string;
  password?: string;
  avatar_url?: string | null;
}

// --- Grades / Nilai ---
export type Grade = {
  id: string;
  student_id: string;
  course_id: string;
  hm: string;
};

export type GradeData = Grade & {
  student: {
    nim: string;
    nama: string;
    study_program?: {
      nama: string;
      jenjang: string;
    };
  };
  course: {
    kode: string;
    matkul: string;
    sks: number;
  };
};

export type GradeFormValues = {
  student_id: string;
  course_id: string;
  hm: string;
};

// =========================================
// MENUS (MANAJEMEN MENU)
// =========================================
export interface Menu {
  id: string;
  label: string;
  href: string;
  icon: string;
  section: string;
  parent_id?: string | null;
  parent?: { label: string } | null;
  allowed_roles: string[];
  sequence: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface MenuFormValues {
  id?: string;
  label: string;
  href: string;
  icon: string;
  section: string;
  parent_id?: string | null;
  allowed_roles: string[];
  sequence: number | string;
  is_active: boolean;
}

// =========================================
// KRS (KARTU RENCANA STUDI)
// =========================================

export type KRSStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";

export interface KRS {
  id: string;
  student_id: string;
  course_id: string;
  academic_year_id: string;
  status: KRSStatus;

  grade_letter?: string | null;
  grade_point?: number | null;

  created_at?: string;
  updated_at?: string;

  student?: {
    nim: string;
    nama: string;
    study_program?: {
      nama: string;
      jenjang: string;
    };
  } | null;

  course?: {
    kode: string;
    matkul: string;
    sks: number;
    smt_default: number;
  } | null;

  academic_year?: {
    nama: string;
    semester: string;
  } | null;
}

export interface KRSFormValues {
  student_id: string;
  course_id: string;
  academic_year_id: string;
  status?: KRSStatus;
}

// =========================================
// MBKM
// =========================================
export interface StudentMBKM {
  id: string;
  student_id: string;
  academic_year_id: string;
  jenis_mbkm: string;
  mitra: string;
  lokasi?: string;

  // Relations
  student?: {
    nim: string;
    nama: string;
    study_program?: {
      nama: string;
      jenjang: string;
    };
  };
  academic_year?: {
    nama: string;
    semester: string;
  };
}

export interface StudentMBKMFormValues {
  student_id: string;
  academic_year_id: string;
  jenis_mbkm: string;
  mitra: string;
  lokasi: string;
}

// =========================================
// PREDIKAT YUDISIUM (MASTERDATA)
// =========================================
export interface PredikatYudisium {
  id: string;
  label: string;       // e.g. "Memuaskan"
  ipk_min: number;     // e.g. 2.00
  ipk_max: number;     // e.g. 2.99
  urutan: number;      // untuk sorting
}

export interface PredikatYudisiumFormValues {
  label: string;
  ipk_min: number | string;
  ipk_max: number | string;
  urutan: number | string;
}

// =========================================
// JADWAL SIDANG SKRIPSI
// =========================================
export interface SidangSkripsi {
  id: string;
  student_id: string;
  tanggal_sidang: string;   // ISO date string
  hari_sidang: string;
  ruangan?: string | null;
  waktu_mulai?: string | null;
  waktu_selesai?: string | null;
  catatan?: string | null;
  created_at?: string;
  updated_at?: string;

  // Relations
  student?: {
    id: string;
    nim: string;
    nama: string;
    study_program?: {
      nama: string;
      jenjang: string;
    } | null;
  } | null;
}

export interface SidangSkripsiFormValues {
  student_id: string;
  tanggal_sidang: string;
  hari_sidang: string;
  ruangan?: string;
  waktu_mulai?: string;
  waktu_selesai?: string;
  catatan?: string;
}
