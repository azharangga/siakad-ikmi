'use server';

import { createAdminClient } from "@/lib/supabase/admin";

const supabase = createAdminClient();

export interface GlobalSearchResult {
  type: 'page' | 'student' | 'course';
  id: string;
  title: string;
  subtitle?: string;
  url: string;
  avatarUrl?: string;
  badge?: string;
}

export async function searchGlobalData(query: string): Promise<GlobalSearchResult[]> {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed || trimmed.length < 2) return [];

  const results: GlobalSearchResult[] = [];

  try {
    // 1. Search Students (Nama or NIM)
    const { data: students } = await supabase
      .from('students')
      .select(`
        id, nim, nama,
        study_program:study_programs (nama, jenjang)
      `)
      .or(`nama.ilike.%${trimmed}%,nim.ilike.%${trimmed}%`)
      .limit(6);

    if (students && students.length > 0) {
      students.forEach((s: any) => {
        results.push({
          type: 'student',
          id: s.id,
          title: s.nama,
          subtitle: `NIM: ${s.nim} • ${s.study_program?.nama || 'Mahasiswa'}`,
          url: `/mahasiswa`,
          badge: s.study_program?.jenjang || 'Mahasiswa',
        });
      });
    }

    // 2. Search Courses (Matkul or Kode)
    const { data: courses } = await supabase
      .from('courses')
      .select('id, kode, matkul, sks, smt_default')
      .or(`matkul.ilike.%${trimmed}%,kode.ilike.%${trimmed}%`)
      .limit(6);

    if (courses && courses.length > 0) {
      courses.forEach((c: any) => {
        results.push({
          type: 'course',
          id: c.id,
          title: c.matkul,
          subtitle: `Kode: ${c.kode} • Semester ${c.smt_default} (${c.sks} SKS)`,
          url: `/matakuliah`,
          badge: `${c.sks} SKS`,
        });
      });
    }
  } catch (error) {
    console.error("Global search error:", error);
  }

  return results;
}
