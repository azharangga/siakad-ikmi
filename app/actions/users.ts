"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { UserData, UserPayload, StudentOption, LecturerOption } from "@/lib/types";

const supabaseAdmin = createAdminClient();

// --- HELPER ERROR HANDLING ---
const handleDbError = (error: any, context: string) => {
  console.error(`[DB_ERROR] ${context}:`, error);

  if (error.code === '23505') {
    if (error.message?.includes('username')) {
      throw new Error("Username tersebut sudah digunakan. Silakan pilih username lain.");
    }
    throw new Error("Data duplikat terdeteksi dalam sistem.");
  }

  if (error.code === '23503') {
    throw new Error("User tidak dapat dihapus karena data ini terhubung dengan data lain.");
  }

  throw new Error("Gagal memproses data. Terjadi kendala di server.");
};

// === GET USERS ===
export async function getUsers() {
  let allUsers: any[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("id, name, username, role, student_id, lecturer_id, is_active, avatar_url")
      .order("name", { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error || !data || data.length === 0) {
      hasMore = false;
    } else {
      allUsers.push(...data);
      if (data.length < pageSize) {
        hasMore = false;
      } else {
        page++;
      }
    }
  }

  return allUsers as UserData[];
}

// === HELPER: GET STUDENTS FOR SELECTION ===
export async function getStudentsForSelection(excludeUserId?: string) {
  let students: any[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data: pageStudents, error } = await supabaseAdmin
      .from("students")
      .select("id, nim, nama")
      .order("nim", { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error || !pageStudents || pageStudents.length === 0) {
      hasMore = false;
    } else {
      students.push(...pageStudents);
      if (pageStudents.length < pageSize) {
        hasMore = false;
      } else {
        page++;
      }
    }
  }

  let usedUsers: any[] = [];
  let userPage = 0;
  let hasMoreUsers = true;

  while (hasMoreUsers) {
    let query = supabaseAdmin
      .from("users")
      .select("student_id")
      .not("student_id", "is", null)
      .range(userPage * pageSize, (userPage + 1) * pageSize - 1);

    if (excludeUserId) {
      query = query.neq("id", excludeUserId);
    }

    const { data: pageUsers } = await query;

    if (!pageUsers || pageUsers.length === 0) {
      hasMoreUsers = false;
    } else {
      usedUsers.push(...pageUsers);
      if (pageUsers.length < pageSize) {
        hasMoreUsers = false;
      } else {
        userPage++;
      }
    }
  }

  const usedStudentIds = new Set(usedUsers.map((u) => u.student_id));

  return students.map((s) => ({
    id: s.id,
    nim: s.nim,
    nama: s.nama,
    is_taken: usedStudentIds.has(s.id),
  })) as StudentOption[];
}

// === HELPER: GET LECTURERS FOR SELECTION ===
export async function getLecturersForSelection(excludeUserId?: string) {
  let lecturers: any[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data: pageLecturers, error } = await supabaseAdmin
      .from("lecturers")
      .select("id, nidn, nama")
      .order("nama", { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error || !pageLecturers || pageLecturers.length === 0) {
      hasMore = false;
    } else {
      lecturers.push(...pageLecturers);
      if (pageLecturers.length < pageSize) {
        hasMore = false;
      } else {
        page++;
      }
    }
  }

  let usedUsers: any[] = [];
  let userPage = 0;
  let hasMoreUsers = true;

  while (hasMoreUsers) {
    let query = supabaseAdmin
      .from("users")
      .select("lecturer_id")
      .not("lecturer_id", "is", null)
      .range(userPage * pageSize, (userPage + 1) * pageSize - 1);

    if (excludeUserId) {
      query = query.neq("id", excludeUserId);
    }

    const { data: pageUsers } = await query;

    if (!pageUsers || pageUsers.length === 0) {
      hasMoreUsers = false;
    } else {
      usedUsers.push(...pageUsers);
      if (pageUsers.length < pageSize) {
        hasMoreUsers = false;
      } else {
        userPage++;
      }
    }
  }

  const usedLecturerIds = new Set(usedUsers.map((u) => u.lecturer_id));

  return lecturers.map((l) => ({
    id: l.id,
    nidn: l.nidn || "-",
    nama: l.nama,
    is_taken: usedLecturerIds.has(l.id),
  })) as LecturerOption[];
}

// === CREATE USER ===
export async function createUser(values: UserPayload) {
  const { name, username, password, role, student_id, lecturer_id, is_active } = values;

  if (!password) throw new Error("Password wajib diisi untuk user baru.");

  const targetStudentId = (role === "mahasiswa" && student_id) ? student_id : null;
  const targetLecturerId = (role === "dosen" && lecturer_id) ? lecturer_id : null;

  if (targetStudentId) {
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("student_id", targetStudentId)
      .single();

    if (existingUser) {
      throw new Error("Mahasiswa ini sudah memiliki akun. Satu mahasiswa hanya boleh punya satu akun.");
    }
  }

  if (targetLecturerId) {
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("lecturer_id", targetLecturerId)
      .single();

    if (existingUser) {
      throw new Error("Dosen ini sudah memiliki akun. Satu dosen hanya boleh punya satu akun.");
    }
  }

  // Validasi: Hanya boleh ada 1 superuser
  if (role === "superuser") {
    const { data: existingSuperuser } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("role", "superuser")
      .single();

    if (existingSuperuser) {
      throw new Error("Hanya boleh ada 1 akun superuser. Akun superuser sudah ada di sistem.");
    }
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const payload: Partial<UserPayload> = {
    name,
    username,
    password: hashedPassword,
    role: role || "mahasiswa",
    student_id: targetStudentId,
    lecturer_id: targetLecturerId,
    is_active: is_active ?? true
  };

  const { error } = await supabaseAdmin.from("users").insert([payload]);

  if (error) handleDbError(error, "createUser");

  revalidatePath("/users");
}

export async function updateUser(id: string, values: UserPayload) {
  const { name, username, password, role, student_id, lecturer_id, is_active } = values;

  // Validasi: Role tidak boleh diubah (anti-bypass)
  const { data: existingUser, error: fetchError } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", id)
    .single();

  if (fetchError || !existingUser) {
    throw new Error("User tidak ditemukan.");
  }

  if (existingUser.role !== role) {
    throw new Error("Role tidak dapat diubah. Jika perlu mengubah role, silakan buat user baru.");
  }

  const targetStudentId = (role === "mahasiswa" && student_id) ? student_id : null;
  const targetLecturerId = (role === "dosen" && lecturer_id) ? lecturer_id : null;

  if (targetStudentId) {
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("student_id", targetStudentId)
      .neq("id", id)
      .single();

    if (existingUser) {
      throw new Error("Mahasiswa ini sudah memiliki akun lain. Silakan pilih mahasiswa yang belum terdaftar.");
    }
  }

  if (targetLecturerId) {
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("lecturer_id", targetLecturerId)
      .neq("id", id)
      .single();

    if (existingUser) {
      throw new Error("Dosen ini sudah memiliki akun lain. Silakan pilih dosen yang belum terdaftar.");
    }
  }

  // Validasi: Hanya boleh ada 1 superuser
  if (role === "superuser") {
    const { data: existingSuperuser } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("role", "superuser")
      .neq("id", id) // Exclude user yang sedang di-edit
      .single();

    if (existingSuperuser) {
      throw new Error("Hanya boleh ada 1 akun superuser. Akun superuser sudah ada di sistem.");
    }
  }

  const updates: Partial<UserPayload> = {
    name,
    username,
    role,
    student_id: targetStudentId,
    lecturer_id: targetLecturerId,
    is_active: is_active
  };

  if (password && password.trim() !== "") {
    updates.password = await bcrypt.hash(password, 10);
  }

  const { error } = await supabaseAdmin
    .from("users")
    .update(updates)
    .eq("id", id);

  if (error) handleDbError(error, "updateUser");

  revalidatePath("/users");
}

// === DELETE USER ===
export async function deleteUser(id: string) {
  const { error } = await supabaseAdmin.from("users").delete().eq("id", id);
  if (error) handleDbError(error, "deleteUser");
  revalidatePath("/users");
}

// === GENERATE MISSING ACCOUNTS (STUDENTS & LECTURERS) ===
export async function generateMissingAccounts() {
  try {
    const results = {
      students: 0,
      lecturers: 0,
      message: ""
    };

    // --- 1. PROCESS STUDENTS ---
    const { data: students, error: studentError } = await supabaseAdmin
      .from("students")
      .select("id, nim, nama")
      .eq("is_active", true);

    if (studentError) throw new Error("Gagal mengambil data mahasiswa: " + studentError.message);

    if (students && students.length > 0) {
      const { data: existingStudentUsers } = await supabaseAdmin
        .from("users")
        .select("student_id")
        .not("student_id", "is", null);

      const existingStudentIds = new Set(existingStudentUsers?.map(u => u.student_id));
      const studentsToCreate = students.filter(s => !existingStudentIds.has(s.id));

      if (studentsToCreate.length > 0) {
        const studentUsers = await Promise.all(
          studentsToCreate.map(async (s) => {
            const hashedPassword = await bcrypt.hash(s.nim, 10);
            return {
              name: s.nama,
              username: s.nim,
              password: hashedPassword,
              role: "mahasiswa",
              student_id: s.id,
              is_active: true,
            };
          })
        );

        const { error: insertError } = await supabaseAdmin.from("users").insert(studentUsers);
        if (insertError) throw insertError;
        results.students = studentUsers.length;
      }
    }

    // --- 2. PROCESS LECTURERS ---
    const { data: lecturers, error: lecturerError } = await supabaseAdmin
      .from("lecturers")
      .select("id, nidn, nama")
      .eq("is_active", true)
      .not("nidn", "is", null); // Must have NIDN

    if (lecturerError) throw new Error("Gagal mengambil data dosen: " + lecturerError.message);

    if (lecturers && lecturers.length > 0) {
      const { data: existingLecturerUsers } = await supabaseAdmin
        .from("users")
        .select("lecturer_id")
        .not("lecturer_id", "is", null);

      const existingLecturerIds = new Set(existingLecturerUsers?.map(u => u.lecturer_id));
      // Ensure NIDN is present (already filtered by query but good to be safe for TS)
      const lecturersToCreate = lecturers.filter(l => !existingLecturerIds.has(l.id) && l.nidn);

      if (lecturersToCreate.length > 0) {
        const lecturerUsers = await Promise.all(
          lecturersToCreate.map(async (l) => {
            const hashedPassword = await bcrypt.hash(l.nidn!, 10);
            return {
              name: l.nama,
              username: l.nidn!,
              password: hashedPassword,
              role: "dosen",
              lecturer_id: l.id,
              is_active: true,
            };
          })
        );

        const { error: insertError } = await supabaseAdmin.from("users").insert(lecturerUsers);
        if (insertError) throw insertError;
        results.lecturers = lecturerUsers.length;
      }
    }

    revalidatePath("/users");

    if (results.students === 0 && results.lecturers === 0) {
      return { count: 0, message: "Semua mahasiswa dan dosen aktif sudah memiliki akun." };
    }

    return {
      count: results.students + results.lecturers,
      message: `Berhasil membuat ${results.students} akun Mahasiswa dan ${results.lecturers} akun Dosen.`
    };

  } catch (error: any) {
    console.error("Generate accounts error:", error);
    throw new Error(error.message || "Terjadi kesalahan saat generate akun.");
  }
}