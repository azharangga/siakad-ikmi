import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, convertToModelMessages, tool, stepCountIs } from 'ai';
import { z } from 'zod';
import { auth } from '@/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { decrypt } from '@/lib/encryption';
import { createOfflineStreamResponse } from '@/lib/chatbotOfflineEngine';

export const maxDuration = 60;

const supabase = createAdminClient();

// Fungsi untuk mendapatkan API Key yang aktif
async function getActiveApiKey() {
  let activeKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  let activeId = null;
  let model: string | null = process.env.GOOGLE_GENERATIVE_AI_MODEL || 'gemini-1.5-flash';

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
        if (dbKey.model) model = dbKey.model;
      }
    }
  } catch (e) {
    console.error("Gagal mengambil API key kustom dari DB, menggunakan default:", e);
  }

  return { activeKey, activeId, model: model || 'gemini-1.5-flash' };
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return Response.json({ status: 'unauthorized' });
    return Response.json({ status: 'ok' });
  } catch {
    return Response.json({ status: 'ok' });
  }
}

export async function POST(req: Request) {
  let activeApiKeyId: string | null = null;
  let sessionUser: any = null;
  let requestMessages: any[] = [];

  try {
    const session = await auth();
    if (!session?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
    sessionUser = session.user;

    const body = await req.json();
    requestMessages = body.messages || [];

    if (!requestMessages || requestMessages.length === 0) {
      return new Response(JSON.stringify({ error: "Pesan kosong" }), { status: 400 });
    }

    const keyInfo = await getActiveApiKey();
    activeApiKeyId = keyInfo.activeId;

    // Jika API Key tidak ada, gunakan Engine Mandiri secara instan
    if (!keyInfo.activeKey) {
      return await createOfflineStreamResponse(requestMessages, sessionUser);
    }

    // Ping super cepat ke Google Generative AI (timeout 800ms) untuk memverifikasi kuota/akses
    let isAiAvailable = false;
    try {
      const pingRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${keyInfo.model}?key=${keyInfo.activeKey}`,
        { signal: AbortSignal.timeout(800) }
      );
      if (pingRes.ok) {
        isAiAvailable = true;
      } else {
        if (activeApiKeyId) {
          await supabase.from('api_keys').update({ is_active: false, is_limited: true }).eq('id', activeApiKeyId);
        }
      }
    } catch {
      isAiAvailable = false;
    }

    // Jika AI Cloud tidak tersedia/limit, jalankan Engine Mandiri
    if (!isAiAvailable) {
      return await createOfflineStreamResponse(requestMessages, sessionUser);
    }

    // Jika AI Cloud aktif & normal, jalankan Gemini LLM
    const googleAI = createGoogleGenerativeAI({
      apiKey: keyInfo.activeKey as string,
    });

    const modelMessages = await convertToModelMessages(requestMessages);
    const systemPrompt = buildSystemPrompt(sessionUser);
    const availableTools = buildTools(sessionUser);

    const result = streamText({
      model: googleAI(keyInfo.model),
      system: systemPrompt,
      messages: modelMessages,
      tools: availableTools,
      stopWhen: stepCountIs(5),
      onError: async ({ error }) => {
        if (activeApiKeyId) {
          await supabase.from('api_keys').update({ is_active: false, is_limited: true }).eq('id', activeApiKeyId);
        }
      }
    });

    return result.toUIMessageStreamResponse();
  } catch (error: any) {
    console.warn("Falling back to Smart Offline Engine due to error:", error?.message || error);
    if (sessionUser && requestMessages.length > 0) {
      return await createOfflineStreamResponse(requestMessages, sessionUser);
    }
    return new Response(JSON.stringify({ error: "Terjadi kesalahan server" }), { status: 500 });
  }
}

// =====================================
// PROMPT OPTIMIZATION PER ROLE
// =====================================
function buildSystemPrompt(user: any): string {
  const role = user.role;
  const base = `Anda adalah SIAKAD Bot, asisten virtual AI resmi Sistem Informasi Akademik STMIK IKMI Cirebon.
Aturan Utama:
1. Berikan jawaban dalam Bahasa Indonesia yang ramah, sopan, natural (dengan kalimat pengantar dan penutup yang komunikatif), dan profesional menggunakan format Markdown.
2. Jawab pertanyaan pengguna berdasarkan data riil dari tools yang tersedia.
3. JANGAN menceritakan alur internal teknis atau menyebut kata "tools", "database", "query", atau nama fungsi.
4. Patokan Nilai Mutu: A=4, B=3, C=2, D=1, E=0. Syarat Lulus SKS: S1=144 SKS, D3=108 SKS.
5. Jika data kosong, sampaikan dengan ramah "Data belum tersedia" atau "Data tidak ditemukan".
6. JANGAN gunakan emotikon atau emoji secara berlebihan.
7. BATASAN KONTEKS: Anda KHUSUS melayani topik akademik STMIK IKMI Cirebon. Jika pengguna bertanya di luar akademik kampus (seperti resep, game, politik umum), tolak secara sopan dan jelaskan bahwa Anda khusus melayani informasi akademik kampus.
8. FORMAT TABEL: Pastikan selalu menyisipkan baris kosong (double newline) sebelum tabel Markdown dimulai agar tabel ter-render dengan sempurna.`;

  if (role === 'mahasiswa') {
    return `${base}
Anda melayani Mahasiswa bernama ${user.name} (NIM: ${user.username}).
Fokus Fitur Mahasiswa:
- Biodata profil diri mahasiswa
- KHS (Kartu Hasil Studi per semester) & IPS
- Transkrip Nilai Kumulatif & IPK
- KRS (Kartu Rencana Studi aktif)
Pilih tool yang tepat secara otomatis untuk menjawab pertanyaan mahasiswa ini.`;
  }

  if (role === 'dosen') {
    return `${base}
Anda melayani Dosen bernama ${user.name} (${user.username}).
Fokus Fitur Dosen:
- Profil biodata diri dosen
- Pencarian data mahasiswa & detail akademiknya
- Statistik data mahasiswa, dosen, mata kuliah, & prodi
- Daftar mahasiswa dengan IPK tertinggi atau per prodi`;
  }

  return `${base}
Anda melayani Admin / Superuser bernama ${user.name} (${user.username}).
Fokus Fitur Admin:
- Akses lengkap seluruh statistik akademis SIAKAD IKMI
- Pencarian mahasiswa, dosen, mata kuliah, prodi, dan IPK tertinggi
- Pemantauan data dan kesehatan sistem`;
}

// =====================================
// TOOLS SETUP PER ROLE
// =====================================
function buildTools(user: any): Record<string, any> {
  const role = user.role;
  const isMahasiswa = role === 'mahasiswa';
  const isDosen = role === 'dosen';

  const baseTools: Record<string, any> = {
    getInfoProdi: tool({
      description: 'Mendapatkan daftar seluruh program studi di SIAKAD IKMI',
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
      description: 'Mendapatkan data tahun akademik aktif dan terbaru',
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
        description: 'Mendapatkan biodata dan profil mahasiswa yang sedang login',
        inputSchema: z.object({}),
        execute: async () => {
          const { data, error } = await supabase
            .from('students')
            .select('nim,nama,angkatan,is_active,alamat,no_hp,email,study_programs(nama,jenjang)')
            .eq('nim', user.username)
            .single();

          if (error || !data) return { error: 'Data mahasiswa tidak ditemukan' };

          const studyProgram = Array.isArray(data.study_programs)
            ? data.study_programs[0]
            : data.study_programs;

          return {
            nim: data.nim,
            nama: data.nama,
            angkatan: data.angkatan,
            status: data.is_active ? 'Aktif' : 'Tidak Aktif',
            alamat: data.alamat || '-',
            no_hp: data.no_hp || '-',
            email: data.email || '-',
            prodi: studyProgram?.nama || '-',
            jenjang: studyProgram?.jenjang || '-',
          };
        },
      }),

      getKHSSaya: tool({
        description: 'Mendapatkan KHS (Kartu Hasil Studi) per semester untuk mahasiswa login',
        inputSchema: z.object({
          semester: z.number().optional().describe('Semester yang ingin dilihat (opsional)')
        }),
        execute: async ({ semester }: { semester?: number }) => {
          const { data: student, error: stdErr } = await supabase
            .from('students')
            .select('id,angkatan')
            .eq('nim', user.username)
            .single();

          if (stdErr || !student) return { error: 'Mahasiswa tidak ditemukan' };

          const { data: grades, error: gradeErr } = await supabase
            .from('grades')
            .select(`
              hm,
              courses:course_id(matkul,sks,smt_default)
            `)
            .eq('student_id', student.id);

          if (gradeErr || !grades || grades.length === 0) return { pesan: 'Belum ada nilai KHS tersedia' };

          const targetSmt = semester || 1;
          const semesterGrades = grades.filter((g: any) =>
            g.courses?.smt_default === targetSmt && g.hm && g.hm !== '-'
          );

          if (semesterGrades.length === 0) {
            return {
              semester: targetSmt,
              matakuliah: [],
              pesan: `Belum ada nilai di semester ${targetSmt}`
            };
          }

          let totalSKS = 0;
          let totalMutu = 0;
          const mapAM: Record<string, number> = { A: 4, B: 3, C: 2, D: 1, E: 0 };
          const matakuliah = semesterGrades.map((g: any) => {
            const sks = g.courses?.sks || 0;
            const am = mapAM[g.hm?.toUpperCase()] || 0;
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
            matakuliah: matakuliah,
          };
        },
      }),

      getTranskripSaya: tool({
        description: 'Mendapatkan transkrip nilai lengkap (seluruh semester) dan IPK kumulatif mahasiswa login',
        inputSchema: z.object({}),
        execute: async () => {
          const { data: student, error: stdErr } = await supabase
            .from('students')
            .select('id')
            .eq('nim', user.username)
            .single();

          if (stdErr || !student) return { error: 'Mahasiswa tidak ditemukan' };

          const { data: grades, error: gradeErr } = await supabase
            .from('grades')
            .select(`
              hm,
              courses:course_id(kode,matkul,sks,smt_default)
            `)
            .eq('student_id', student.id);

          if (gradeErr || !grades || grades.length === 0) {
            return { pesan: 'Belum ada nilai transkrip' };
          }

          const mapAM: Record<string, number> = { A: 4, B: 3, C: 2, D: 1, E: 0 };
          const validGrades = grades.filter((g: any) => g.hm && g.hm !== '-');
          const bestGrades = new Map<string, any>();
          validGrades.forEach((g: any) => {
            const kode = g.courses?.kode;
            if (!kode) return;
            const am = mapAM[g.hm?.toUpperCase()] || 0;
            const existing = bestGrades.get(kode);
            const existingAM = existing ? mapAM[existing.hm?.toUpperCase()] || 0 : -1;
            if (!existing || am > existingAM) {
              bestGrades.set(kode, g);
            }
          });

          let totalSKS = 0;
          let totalMutu = 0;
          let sksLulus = 0;

          const matakuliah = Array.from(bestGrades.values()).map((g: any) => {
            const sks = g.courses?.sks || 0;
            const am = mapAM[g.hm?.toUpperCase()] || 0;
            totalSKS += sks;
            totalMutu += am * sks;
            if (am >= 2) sksLulus += sks;

            return {
              smt: g.courses?.smt_default,
              kode: g.courses?.kode,
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
            matakuliah: matakuliah,
          };
        },
      }),

      getKRSSaya: tool({
        description: 'Mendapatkan KRS (Kartu Rencana Studi) semester aktif mahasiswa login',
        inputSchema: z.object({}),
        execute: async () => {
          const { data: student, error: stdErr } = await supabase
            .from('students')
            .select('id')
            .eq('nim', user.username)
            .single();

          if (stdErr || !student) return { error: 'Mahasiswa tidak ditemukan' };

          const { data: activeYear } = await supabase
            .from('academic_years')
            .select('id,nama,semester')
            .eq('is_active', true)
            .single();

          if (!activeYear) return { pesan: 'Tahun akademik aktif tidak ditemukan' };

          const { data: krs } = await supabase
            .from('krs')
            .select(`
              status,
              courses:course_id(kode,matkul,sks)
            `)
            .eq('student_id', student.id)
            .eq('academic_year_id', activeYear.id);

          if (!krs || krs.length === 0) {
            return {
              tahun_akademik: activeYear.nama,
              semester: activeYear.semester,
              matakuliah: [],
              pesan: 'Belum ada mata kuliah KRS yang diambil semester ini'
            };
          }

          const totalSKS = krs.reduce((sum: number, k: any) => sum + (k.courses?.sks || 0), 0);

          return {
            tahun_akademik: activeYear.nama,
            semester: activeYear.semester,
            total_sks: totalSKS,
            matakuliah: krs.map((k: any) => ({
              kode: k.courses?.kode,
              matkul: k.courses?.matkul,
              sks: k.courses?.sks,
              status: k.status,
            })),
          };
        }
      })
    };
  }

  // Dosen Profil Tool
  const dosenProfileTool = isDosen ? {
    getProfilDosenSaya: tool({
      description: 'Mendapatkan profil dan biodata dosen yang sedang login',
      inputSchema: z.object({}),
      execute: async () => {
        const { data, error } = await supabase
          .from('lecturers')
          .select('nidn,nama,email,phone,is_active')
          .eq('nidn', user.username)
          .single();

        if (error || !data) return { error: 'Data dosen tidak ditemukan' };

        return {
          nidn: data.nidn || '-',
          nama: data.nama,
          email: data.email || '-',
          phone: data.phone || '-',
          status: data.is_active ? 'Aktif Mengajar' : 'Tidak Aktif',
        };
      }
    })
  } : {};

  // Admin / Superuser Profil Tool
  const adminProfileTool = (!isMahasiswa && !isDosen) ? {
    getProfilAdminSaya: tool({
      description: 'Mendapatkan profil admin/superuser yang sedang login',
      inputSchema: z.object({}),
      execute: async () => {
        return {
          username: user.username,
          nama: user.name,
          role: user.role,
          status: 'Aktif',
        };
      }
    })
  } : {};

  // Admin & Dosen Tools
  return {
    ...baseTools,
    ...dosenProfileTool,
    ...adminProfileTool,

    getStatistik: tool({
      description: 'Mendapatkan statistik umum SIAKAD (total mahasiswa, dosen, matkul, prodi)',
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
      description: 'Mendapatkan statistik jumlah mahasiswa per program studi',
      inputSchema: z.object({}),
      execute: async () => {
        const { data: prodi } = await supabase
          .from('study_programs')
          .select('id,nama,jenjang');

        if (!prodi) return { error: 'Data prodi tidak ditemukan' };

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
      description: 'Mencari mahasiswa berdasarkan nama atau NIM',
      inputSchema: z.object({
        keyword: z.string().describe('Nama atau NIM mahasiswa yang dicari')
      }),
      execute: async ({ keyword }: { keyword: string }) => {
        const isNIM = /^\d+$/.test(keyword);
        const { data } = await supabase
          .from('students')
          .select('nim,nama,angkatan,is_active,study_programs(nama,jenjang)')
          .ilike(isNIM ? 'nim' : 'nama', `%${keyword}%`)
          .limit(5);

        if (!data || data.length === 0) {
          return { hasil: [], pesan: 'Mahasiswa tidak ditemukan' };
        }

        return {
          hasil: data.map((s: any) => {
            const studyProgram = Array.isArray(s.study_programs)
              ? s.study_programs[0]
              : s.study_programs;

            return {
              nim: s.nim,
              nama: s.nama,
              angkatan: s.angkatan,
              status: s.is_active ? 'Aktif' : 'Tidak Aktif',
              prodi: studyProgram ? `${studyProgram.nama} (${studyProgram.jenjang})` : '-',
            };
          })
        };
      }
    }),

    getDetailMahasiswa: tool({
      description: 'Mendapatkan detail lengkap mahasiswa tertentu berdasarkan NIM (biodata + IPK)',
      inputSchema: z.object({
        nim: z.string().describe('NIM mahasiswa yang ingin dilihat detailnya')
      }),
      execute: async ({ nim }: { nim: string }) => {
        const { data: student, error: stdErr } = await supabase
          .from('students')
          .select('id,nim,nama,angkatan,alamat,status_mahasiswa,study_programs(nama,jenjang)')
          .eq('nim', nim)
          .single();

        if (stdErr || !student) return { error: 'Mahasiswa tidak ditemukan' };

        const studyProgram = Array.isArray(student.study_programs)
          ? student.study_programs[0]
          : student.study_programs;

        const { data: grades } = await supabase
          .from('grades')
          .select('hm,courses:course_id(sks)')
          .eq('student_id', student.id);

        let totalSKS = 0;
        let totalMutu = 0;
        let sksLulus = 0;

        if (grades && grades.length > 0) {
          const mapAM: Record<string, number> = { A: 4, B: 3, C: 2, D: 1, E: 0 };
          const validGrades = grades.filter((g: any) => g.hm && g.hm !== '-');
          validGrades.forEach((g: any) => {
            const sks = g.courses?.sks || 0;
            const am = mapAM[g.hm?.toUpperCase()] || 0;
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
          prodi: studyProgram?.nama,
          jenjang: studyProgram?.jenjang,
          status: student.status_mahasiswa || 'AKTIF',
          ipk: ipk,
          sks_lulus: sksLulus,
          total_matkul: grades?.length || 0,
        };
      }
    }),

    cariDosen: tool({
      description: 'Mencari dosen berdasarkan nama atau NIDN',
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
          return { hasil: [], pesan: 'Dosen tidak ditemukan' };
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
      description: 'Mencari mata kuliah berdasarkan nama atau kode',
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
          return { hasil: [], pesan: 'Mata kuliah tidak ditemukan' };
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
      description: 'Mendapatkan daftar mahasiswa berdasarkan nama program studi',
      inputSchema: z.object({
        prodi: z.string().describe('Nama program studi (contoh: Sistem Informasi, Teknik Informatika)')
      }),
      execute: async ({ prodi }: { prodi: string }) => {
        const { data: prodiData } = await supabase
          .from('study_programs')
          .select('id,nama,jenjang')
          .ilike('nama', `%${prodi}%`)
          .limit(1)
          .single();

        if (!prodiData) return { error: 'Program studi tidak ditemukan' };

        const { data: students } = await supabase
          .from('students')
          .select('nim,nama,angkatan')
          .eq('study_program_id', prodiData.id)
          .eq('is_active', true)
          .order('angkatan', { ascending: false })
          .limit(10);

        if (!students || students.length === 0) {
          return {
            prodi: prodiData.nama,
            jenjang: prodiData.jenjang,
            mahasiswa: [],
            pesan: 'Belum ada mahasiswa aktif di prodi ini'
          };
        }

        return {
          prodi: prodiData.nama,
          jenjang: prodiData.jenjang,
          total: students.length,
          mahasiswa: students,
        };
      }
    }),

    getTopMahasiswa: tool({
      description: 'Mendapatkan daftar mahasiswa dengan IPK tertinggi',
      inputSchema: z.object({
        limit: z.number().optional().describe('Jumlah mahasiswa yang ditampilkan (default 5)')
      }),
      execute: async ({ limit = 5 }: { limit?: number }) => {
        const { data: students } = await supabase
          .from('students')
          .select('id,nim,nama,study_programs(nama)')
          .eq('is_active', true);

        if (!students || students.length === 0) {
          return { error: 'Data mahasiswa tidak ditemukan' };
        }

        const mapAM: Record<string, number> = { A: 4, B: 3, C: 2, D: 1, E: 0 };
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
                const am = mapAM[g.hm?.toUpperCase()] || 0;
                totalSKS += sks;
                totalMutu += am * sks;
              });
            }

            const ipk = totalSKS > 0 ? totalMutu / totalSKS : 0;
            const studyProgram = Array.isArray(s.study_programs)
              ? s.study_programs[0]
              : s.study_programs;

            return {
              nim: s.nim,
              nama: s.nama,
              prodi: studyProgram?.nama || '-',
              ipk: ipk.toFixed(2),
              ipk_raw: ipk,
            };
          })
        );

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
