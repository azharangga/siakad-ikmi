import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, convertToModelMessages, tool, stepCountIs } from 'ai';
import { z } from 'zod';
import { auth } from '@/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { decrypt } from '@/lib/encryption'; // Import utilitas enkripsi

export const maxDuration = 60;

const supabase = createAdminClient();

function getAM(hm: string): number {
  const map: Record<string, number> = { A: 4, B: 3, C: 2, D: 1, E: 0 };
  return map[hm?.toUpperCase()] ?? 0;
}

// Fungsi untuk mendapatkan API Key yang aktif (Fallback ke .env jika tidak ada/limit)
async function getActiveApiKey() {
  let activeKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  let activeId = null;
  let model: string | null = null;

  try {
    const { data: dbKey } = await supabase
      .from('api_keys')
      .select('id, key_data, model')
      .eq('is_active', true)
      .eq('is_limited', false)
      .limit(1)
      .single();

    if (dbKey && dbKey.key_data) {
      const decrypted = decrypt(dbKey.key_data);
      if (decrypted) {
        activeKey = decrypted;
        activeId = dbKey.id;
        model = dbKey.model;
      }
    }
  } catch (e) {
    console.error("Gagal mengambil API key kustom dari DB, menggunakan default:", e);
  }

  return { activeKey, activeId, model };
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return Response.json({ status: 'unauthorized' });

    const keyInfo = await getActiveApiKey();
    if (!keyInfo.activeKey) return Response.json({ status: 'error' });

    const modelName = keyInfo.model as string;
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}?key=${keyInfo.activeKey}`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (!res.ok) {
      if (keyInfo.activeId) {
        console.log(`[Ping Offline] Menandai key ${keyInfo.activeId} sebagai limit karena LLM offline.`);
        await supabase.from('api_keys').update({ is_limited: true, is_active: false }).eq('id', keyInfo.activeId);
      }
      return Response.json({ status: 'ai_unavailable' });
    }

    return Response.json({ status: 'ok' });
  } catch {
    return Response.json({ status: 'error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let activeApiKeyId: string | null = null;

  try {
    const session = await auth();
    if (!session?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { messages } = await req.json();
    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Pesan kosong" }), { status: 400 });
    }

    // Ambil API Key Kustom / Default
    const keyInfo = await getActiveApiKey();
    activeApiKeyId = keyInfo.activeId;

    // Inisialisasi provider Google Generative AI secara dinamis
    const googleAI = createGoogleGenerativeAI({
      apiKey: keyInfo.activeKey as string,
    });

    const modelMessages = await convertToModelMessages(messages);
    const systemPrompt = buildSystemPrompt(session.user);
    const availableTools = buildTools(session.user);

    const result = streamText({
      model: googleAI(keyInfo.model as string),
      system: systemPrompt,
      messages: modelMessages,
      tools: availableTools,
      onError: async ({ error }) => {
        const errStatus = (error as any)?.status;
        const errMessage = String(
          (error as any)?.message || (error as any)?.statusText || error
        ).toLowerCase();

        // Deteksi error limit kuota (429)
        const isLimit =
          errStatus === 429 ||
          errMessage.includes('429') ||
          errMessage.includes('too many') ||
          errMessage.includes('quota') ||
          errMessage.includes('rate limit') ||
          errMessage.includes('resource_exhausted');

        // Deteksi error API Key tidak valid / salah
        const isInvalid =
          errStatus === 400 ||
          errStatus === 401 ||
          errStatus === 403 ||
          errMessage.includes('api_key_invalid') ||
          errMessage.includes('invalid api key') ||
          errMessage.includes('api key not valid') ||
          errMessage.includes('permission_denied') ||
          errMessage.includes('invalid_argument');

        if (activeApiKeyId && isLimit) {
          console.log(`[Limit] Menandai key ${activeApiKeyId} sebagai limit.`);
          await supabase
            .from('api_keys')
            .update({ is_limited: true, is_active: false })
            .eq('id', activeApiKeyId);
        } else if (activeApiKeyId && isInvalid) {
          console.log(`[Invalid Key] Menonaktifkan key ${activeApiKeyId} karena API key tidak valid.`);
          await supabase
            .from('api_keys')
            .update({ is_active: false })
            .eq('id', activeApiKeyId);
        } else {
          console.error("AI Stream Error:", error);
        }
      }
    });

    return result.toUIMessageStreamResponse();
  } catch (error: any) {
    console.error("Chat API Error:", error);
    const errString = String(error?.message || error).toLowerCase();

    // Deteksi error limit kuota
    const isLimit = error?.status === 429 || errString.includes('429') || errString.includes('quota') || errString.includes('resource_exhausted');
    // Deteksi API Key tidak valid/salah
    const isInvalid = [400, 401, 403].includes(error?.status) || errString.includes('api_key_invalid') || errString.includes('invalid api key') || errString.includes('permission_denied');

    if (activeApiKeyId && isLimit) {
      console.log(`[Limit Sync] Menandai key ${activeApiKeyId} sebagai limit.`);
      await supabase.from('api_keys').update({ is_limited: true, is_active: false }).eq('id', activeApiKeyId);
      return new Response(JSON.stringify({ error: "API Key mencapai limit. Silakan coba kirim ulang pesan Anda." }), { status: 429 });
    }

    if (activeApiKeyId && isInvalid) {
      console.log(`[Invalid Key Sync] Menonaktifkan key ${activeApiKeyId} karena tidak valid.`);
      await supabase.from('api_keys').update({ is_active: false }).eq('id', activeApiKeyId);
      return new Response(JSON.stringify({ error: "API Key tidak valid atau tidak memiliki akses. Silakan periksa konfigurasi key di halaman Manajemen API Key." }), { status: 401 });
    }

    return new Response(JSON.stringify({ error: "Terjadi kesalahan server" }), { status: 500 });
  }
}

// =====================================
// PROMPT OPTIMIZATION (Hemat Token)
// =====================================
function buildSystemPrompt(user: any): string {
  // Instruksi super ringkas untuk hemat token
  const base = `Asisten SIAKAD IKMI Cirebon. Aturan:
- Bahasa Indonesia ramah, format Markdown
- Jawaban SINGKAT & PADAT dari data tools
- JANGAN sebut "menggunakan tools" atau teknis internal
- Standar: A=4, B=3, C=2, D=1, E=0. Lulus: S1=144SKS, D3=108SKS
- Jika data kosong/error, bilang "Data belum tersedia" (jangan teknis)`;

  if (user.role === 'mahasiswa') {
    return `${base}
User: Mahasiswa ${user.name} (NIM: ${user.username})
Tools: Profil, KHS (nilai 1 semester), Transkrip (IPK kumulatif), KRS (matkul diambil)`;
  }
  if (user.role === 'dosen') {
    return `${base}
User: Dosen ${user.name} (${user.username})
Tools: Statistik, Cari Mahasiswa/Dosen/Matkul`;
  }
  return `${base}
User: Admin ${user.name} (${user.username})
Akses: Semua data (Statistik, Profil, Pencarian)`;
}

// =====================================
// TOOLS OPTIMIZATION (Hemat Token & Fix Query)
// =====================================
function buildTools(user: any) {
  const isMahasiswa = user.role === 'mahasiswa';

  const baseTools: Record<string, any> = {
    getInfoProdi: tool({
      description: 'Daftar program studi',
      inputSchema: z.object({}),
      execute: async () => {
        const { data } = await supabase
          .from('study_programs')
          .select('kode,nama,jenjang')
          .order('nama');
        return data || [];
      },
    }),

    getTahunAkademik: tool({
      description: 'Tahun akademik terbaru',
      inputSchema: z.object({}),
      execute: async () => {
        const { data } = await supabase
          .from('academic_years')
          .select('nama,semester,is_active')
          .order('nama', { ascending: false })
          .limit(5);
        return data || [];
      },
    }),
  };

  if (isMahasiswa) {
    return {
      ...baseTools,
      
      getProfilSaya: tool({
        description: 'Biodata mahasiswa login',
        inputSchema: z.object({}),
        execute: async () => {
          const { data, error } = await supabase
            .from('students')
            .select('nim,nama,angkatan,semester,status,alamat,study_programs(nama,jenjang)')
            .eq('nim', user.username)
            .single();
          
          if (error || !data) return { error: 'Data tidak ditemukan' };
          
          return {
            nim: data.nim,
            nama: data.nama,
            angkatan: data.angkatan,
            semester: data.semester,
            status: data.status,
            prodi: data.study_programs?.nama,
            jenjang: data.study_programs?.jenjang,
          };
        },
      }),

      getKHSSaya: tool({
        description: 'KHS (Kartu Hasil Studi) per semester - nilai 1 semester saja',
        inputSchema: z.object({ 
          semester: z.number().optional().describe('Semester yang ingin dilihat (opsional, default semester aktif)')
        }),
        execute: async ({ semester }: { semester?: number }) => {
          // 1. Ambil data mahasiswa
          const { data: student, error: stdErr } = await supabase
            .from('students')
            .select('id,semester')
            .eq('nim', user.username)
            .single();
          
          if (stdErr || !student) return { error: 'Mahasiswa tidak ditemukan' };

          const targetSmt = semester || student.semester || 1;

          // 2. Ambil nilai semester target
          const { data: grades, error: gradeErr } = await supabase
            .from('grades')
            .select(`
              hm,
              courses:course_id(matkul,sks,smt_default)
            `)
            .eq('student_id', student.id);

          if (gradeErr || !grades) return { error: 'Nilai tidak ditemukan' };

          // Filter semester target
          const semesterGrades = grades.filter((g: any) => 
            g.courses?.smt_default === targetSmt && g.hm !== '-'
          );

          if (semesterGrades.length === 0) {
            return { 
              semester: targetSmt, 
              matakuliah: [], 
              pesan: `Belum ada nilai di semester ${targetSmt}` 
            };
          }

          // Hitung IPS
          let totalSKS = 0;
          let totalMutu = 0;
          const matakuliah = semesterGrades.map((g: any) => {
            const sks = g.courses?.sks || 0;
            const am = getAM(g.hm);
            totalSKS += sks;
            totalMutu += am * sks;
            return {
              matkul: g.courses?.matkul,
              sks: sks,
              nilai: g.hm,
            };
          });

          const ips = totalSKS > 0 ? (totalMutu / totalSKS).toFixed(2) : '0.00';

          return {
            semester: targetSmt,
            ips: ips,
            total_sks: totalSKS,
            matakuliah: matakuliah.slice(0, 20), // Max 20 untuk hemat token
          };
        },
      }),

      getTranskripSaya: tool({
        description: 'Transkrip nilai lengkap (semua semester) dengan IPK kumulatif',
        inputSchema: z.object({}),
        execute: async () => {
          // 1. Ambil student_id
          const { data: student, error: stdErr } = await supabase
            .from('students')
            .select('id')
            .eq('nim', user.username)
            .single();
          
          if (stdErr || !student) return { error: 'Mahasiswa tidak ditemukan' };

          // 2. Ambil semua nilai
          const { data: grades, error: gradeErr } = await supabase
            .from('grades')
            .select(`
              hm,
              courses:course_id(kode,matkul,sks,smt_default)
            `)
            .eq('student_id', student.id);

          if (gradeErr || !grades || grades.length === 0) {
            return { error: 'Belum ada nilai' };
          }

          // Filter nilai yang sudah ada (bukan strip)
          const validGrades = grades.filter((g: any) => g.hm && g.hm !== '-');

          // Deduplikasi: ambil nilai terbaik per matkul (untuk mengulang)
          const bestGrades = new Map<string, any>();
          validGrades.forEach((g: any) => {
            const kode = g.courses?.kode;
            if (!kode) return;
            
            const am = getAM(g.hm);
            const existing = bestGrades.get(kode);
            
            if (!existing || am > getAM(existing.hm)) {
              bestGrades.set(kode, g);
            }
          });

          // Hitung IPK & Total SKS Lulus
          let totalSKS = 0;
          let totalMutu = 0;
          let sksLulus = 0;

          const matakuliah = Array.from(bestGrades.values()).map((g: any) => {
            const sks = g.courses?.sks || 0;
            const am = getAM(g.hm);
            totalSKS += sks;
            totalMutu += am * sks;
            if (am >= 2) sksLulus += sks; // C ke atas = lulus
            
            return {
              smt: g.courses?.smt_default,
              matkul: g.courses?.matkul,
              sks: sks,
              nilai: g.hm,
            };
          });

          const ipk = totalSKS > 0 ? (totalMutu / totalSKS).toFixed(2) : '0.00';

          return {
            ipk: ipk,
            sks_lulus: sksLulus,
            total_matkul: matakuliah.length,
            matakuliah: matakuliah.slice(0, 25), // Max 25 untuk hemat token
            catatan: matakuliah.length > 25 ? 'Hanya 25 matkul pertama ditampilkan' : null,
          };
        },
      }),

      getKRSSaya: tool({
        description: 'KRS (Kartu Rencana Studi) - mata kuliah yang diambil semester ini',
        inputSchema: z.object({}),
        execute: async () => {
          // 1. Ambil student_id
          const { data: student, error: stdErr } = await supabase
            .from('students')
            .select('id')
            .eq('nim', user.username)
            .single();
          
          if (stdErr || !student) return { error: 'Mahasiswa tidak ditemukan' };

          // 2. Ambil tahun akademik aktif
          const { data: activeYear, error: yearErr } = await supabase
            .from('academic_years')
            .select('id,nama,semester')
            .eq('is_active', true)
            .single();

          if (yearErr || !activeYear) {
            return { error: 'Tahun akademik aktif tidak ditemukan' };
          }

          // 3. Ambil KRS
          const { data: krs, error: krsErr } = await supabase
            .from('krs')
            .select(`
              status,
              courses:course_id(matkul,sks)
            `)
            .eq('student_id', student.id)
            .eq('academic_year_id', activeYear.id);

          if (krsErr || !krs || krs.length === 0) {
            return { 
              tahun_akademik: activeYear.nama,
              semester: activeYear.semester,
              matakuliah: [],
              pesan: 'Belum ada KRS'
            };
          }

          const totalSKS = krs.reduce((sum: number, k: any) => sum + (k.courses?.sks || 0), 0);

          return {
            tahun_akademik: activeYear.nama,
            semester: activeYear.semester,
            total_sks: totalSKS,
            matakuliah: krs.map((k: any) => ({
              matkul: k.courses?.matkul,
              sks: k.courses?.sks,
              status: k.status,
            })),
          };
        }
      })
    };
  }

  // Admin/Dosen Tools
  return {
    ...baseTools,
    
    getStatistik: tool({
      description: 'Statistik umum SIAKAD (total mahasiswa, dosen, mata kuliah)',
      inputSchema: z.object({}),
      execute: async () => {
        const [mhs, mhsAktif, dsn, mk, prodi] = await Promise.all([
          supabase.from('students').select('id', { count: 'exact', head: true }),
          supabase.from('students').select('id', { count: 'exact', head: true }).eq('is_active', true),
          supabase.from('lecturers').select('id', { count: 'exact', head: true }).eq('is_active', true),
          supabase.from('courses').select('id', { count: 'exact', head: true }),
          supabase.from('study_programs').select('id', { count: 'exact', head: true }),
        ]);
        return { 
          total_mahasiswa: mhs.count || 0,
          mahasiswa_aktif: mhsAktif.count || 0, 
          total_dosen: dsn.count || 0, 
          total_matakuliah: mk.count || 0,
          total_prodi: prodi.count || 0,
        };
      }
    }),

    getStatistikProdi: tool({
      description: 'Statistik mahasiswa per program studi',
      inputSchema: z.object({}),
      execute: async () => {
        const { data: prodi } = await supabase
          .from('study_programs')
          .select('id,nama,jenjang');
        
        if (!prodi) return { error: 'Data tidak ditemukan' };

        const stats = await Promise.all(
          prodi.map(async (p: any) => {
            const { count } = await supabase
              .from('students')
              .select('id', { count: 'exact', head: true })
              .eq('study_program_id', p.id)
              .eq('is_active', true);
            return {
              prodi: p.nama,
              jenjang: p.jenjang,
              jumlah_mahasiswa: count || 0,
            };
          })
        );

        return { data: stats };
      }
    }),

    cariMahasiswa: tool({
      description: 'Cari mahasiswa berdasarkan nama atau NIM',
      inputSchema: z.object({ 
        keyword: z.string().describe('Nama atau NIM mahasiswa yang dicari')
      }),
      execute: async ({ keyword }: { keyword: string }) => {
        const isNIM = /^\d+$/.test(keyword);
        const { data } = await supabase
          .from('students')
          .select('nim,nama,semester,angkatan,is_active,study_programs(nama,jenjang)')
          .ilike(isNIM ? 'nim' : 'nama', `%${keyword}%`)
          .limit(5);
        
        if (!data || data.length === 0) {
          return { hasil: [], pesan: 'Tidak ditemukan' };
        }

        return { 
          hasil: data.map((s: any) => ({
            nim: s.nim,
            nama: s.nama,
            semester: s.semester,
            angkatan: s.angkatan,
            status: s.is_active ? 'Aktif' : 'Tidak Aktif',
            prodi: `${s.study_programs?.nama} (${s.study_programs?.jenjang})`,
          }))
        };
      }
    }),

    getDetailMahasiswa: tool({
      description: 'Detail lengkap mahasiswa tertentu (biodata + IPK)',
      inputSchema: z.object({ 
        nim: z.string().describe('NIM mahasiswa yang ingin dilihat detailnya')
      }),
      execute: async ({ nim }: { nim: string }) => {
        // 1. Ambil biodata
        const { data: student, error: stdErr } = await supabase
          .from('students')
          .select('id,nim,nama,angkatan,semester,alamat,is_active,study_programs(nama,jenjang)')
          .eq('nim', nim)
          .single();
        
        if (stdErr || !student) return { error: 'Mahasiswa tidak ditemukan' };

        // 2. Hitung IPK
        const { data: grades } = await supabase
          .from('grades')
          .select('hm,courses:course_id(sks)')
          .eq('student_id', student.id);

        let totalSKS = 0;
        let totalMutu = 0;
        let sksLulus = 0;

        if (grades && grades.length > 0) {
          const validGrades = grades.filter((g: any) => g.hm && g.hm !== '-');
          validGrades.forEach((g: any) => {
            const sks = g.courses?.sks || 0;
            const am = getAM(g.hm);
            totalSKS += sks;
            totalMutu += am * sks;
            if (am >= 2) sksLulus += sks;
          });
        }

        const ipk = totalSKS > 0 ? (totalMutu / totalSKS).toFixed(2) : '0.00';

        return {
          nim: student.nim,
          nama: student.nama,
          angkatan: student.angkatan,
          semester: student.semester,
          prodi: student.study_programs?.nama,
          jenjang: student.study_programs?.jenjang,
          status: student.is_active ? 'Aktif' : 'Tidak Aktif',
          ipk: ipk,
          sks_lulus: sksLulus,
          total_matkul: grades?.length || 0,
        };
      }
    }),

    cariDosen: tool({
      description: 'Cari dosen berdasarkan nama atau NIDN',
      inputSchema: z.object({ 
        keyword: z.string().describe('Nama atau NIDN dosen yang dicari')
      }),
      execute: async ({ keyword }: { keyword: string }) => {
        const isNIDN = /^\d+$/.test(keyword);
        const { data } = await supabase
          .from('lecturers')
          .select('nidn,nama,email,phone,is_active')
          .ilike(isNIDN ? 'nidn' : 'nama', `%${keyword}%`)
          .limit(5);
        
        if (!data || data.length === 0) {
          return { hasil: [], pesan: 'Tidak ditemukan' };
        }

        return { 
          hasil: data.map((d: any) => ({
            nidn: d.nidn || '-',
            nama: d.nama,
            email: d.email || '-',
            phone: d.phone || '-',
            status: d.is_active ? 'Aktif' : 'Tidak Aktif',
          }))
        };
      }
    }),

    cariMatakuliah: tool({
      description: 'Cari mata kuliah berdasarkan nama atau kode',
      inputSchema: z.object({ 
        keyword: z.string().describe('Nama atau kode mata kuliah yang dicari')
      }),
      execute: async ({ keyword }: { keyword: string }) => {
        const isKode = /^[A-Z]{2,4}/.test(keyword.toUpperCase());
        const { data } = await supabase
          .from('courses')
          .select('kode,matkul,sks,smt_default,kategori')
          .ilike(isKode ? 'kode' : 'matkul', `%${keyword}%`)
          .limit(8);
        
        if (!data || data.length === 0) {
          return { hasil: [], pesan: 'Tidak ditemukan' };
        }

        return { 
          hasil: data.map((mk: any) => ({
            kode: mk.kode,
            nama: mk.matkul,
            sks: mk.sks,
            semester: mk.smt_default,
            kategori: mk.kategori,
          }))
        };
      }
    }),

    getMahasiswaByProdi: tool({
      description: 'Daftar mahasiswa berdasarkan program studi tertentu',
      inputSchema: z.object({ 
        prodi: z.string().describe('Nama program studi (contoh: Sistem Informasi, Teknik Informatika)')
      }),
      execute: async ({ prodi }: { prodi: string }) => {
        // Cari prodi dulu
        const { data: prodiData } = await supabase
          .from('study_programs')
          .select('id,nama,jenjang')
          .ilike('nama', `%${prodi}%`)
          .limit(1)
          .single();

        if (!prodiData) return { error: 'Program studi tidak ditemukan' };

        // Ambil mahasiswa
        const { data: students } = await supabase
          .from('students')
          .select('nim,nama,semester,angkatan')
          .eq('study_program_id', prodiData.id)
          .eq('is_active', true)
          .order('angkatan', { ascending: false })
          .limit(10);

        if (!students || students.length === 0) {
          return { 
            prodi: prodiData.nama,
            jenjang: prodiData.jenjang,
            mahasiswa: [],
            pesan: 'Belum ada mahasiswa'
          };
        }

        return {
          prodi: prodiData.nama,
          jenjang: prodiData.jenjang,
          total: students.length,
          mahasiswa: students,
          catatan: students.length === 10 ? 'Hanya 10 mahasiswa pertama ditampilkan' : null,
        };
      }
    }),

    getTopMahasiswa: tool({
      description: 'Daftar mahasiswa dengan IPK tertinggi',
      inputSchema: z.object({ 
        limit: z.number().optional().describe('Jumlah mahasiswa yang ditampilkan (default 5)')
      }),
      execute: async ({ limit = 5 }: { limit?: number }) => {
        // Ambil semua mahasiswa aktif
        const { data: students } = await supabase
          .from('students')
          .select('id,nim,nama,semester,study_programs(nama)')
          .eq('is_active', true);

        if (!students || students.length === 0) {
          return { error: 'Data tidak ditemukan' };
        }

        // Hitung IPK masing-masing
        const studentsWithIPK = await Promise.all(
          students.map(async (s: any) => {
            const { data: grades } = await supabase
              .from('grades')
              .select('hm,courses:course_id(sks)')
              .eq('student_id', s.id);

            let totalSKS = 0;
            let totalMutu = 0;

            if (grades && grades.length > 0) {
              const validGrades = grades.filter((g: any) => g.hm && g.hm !== '-');
              validGrades.forEach((g: any) => {
                const sks = g.courses?.sks || 0;
                const am = getAM(g.hm);
                totalSKS += sks;
                totalMutu += am * sks;
              });
            }

            const ipk = totalSKS > 0 ? totalMutu / totalSKS : 0;

            return {
              nim: s.nim,
              nama: s.nama,
              semester: s.semester,
              prodi: s.study_programs?.nama,
              ipk: ipk.toFixed(2),
              ipk_raw: ipk,
            };
          })
        );

        // Sort by IPK descending
        const sorted = studentsWithIPK
          .filter((s) => s.ipk_raw > 0)
          .sort((a, b) => b.ipk_raw - a.ipk_raw)
          .slice(0, Math.min(limit, 10))
          .map(({ ipk_raw, ...rest }) => rest);

        return {
          total: sorted.length,
          mahasiswa: sorted,
        };
      }
    }),
  };
}
