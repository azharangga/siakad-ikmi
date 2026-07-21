import { createAdminClient } from '@/lib/supabase/admin';
import { createUIMessageStream, createUIMessageStreamResponse } from 'ai';

const supabase = createAdminClient();

function getAM(hm: string): number {
  const map: Record<string, number> = { A: 4, B: 3, C: 2, D: 1, E: 0 };
  return map[hm?.toUpperCase()] ?? 0;
}

function getMessageText(parts: any[]): string {
  if (!parts || !Array.isArray(parts)) return "";
  return parts.filter((p: any) => p.type === "text").map((p: any) => p.text).join("");
}

export async function createOfflineStreamResponse(messages: any[], user: any) {
  const offlineText = await generateOfflineAnswer(messages, user);
  const partId = `part-${Date.now()}`;
  
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      writer.write({ type: 'text-start', id: partId });

      // Authentic ChatGPT typewriter streaming effect over HTTP (3 chars per chunk, 25ms delay)
      const chunks = offlineText.match(/[\s\S]{1,3}/g) || [offlineText];
      for (const chunk of chunks) {
        writer.write({ type: 'text-delta', id: partId, delta: chunk });
        await new Promise((resolve) => setTimeout(resolve, 25));
      }

      writer.write({ type: 'text-end', id: partId });
    },
  });

  return createUIMessageStreamResponse({ stream });
}

export async function generateOfflineAnswer(messages: any[], user: any): Promise<string> {
  const lastUserMessage = [...messages].reverse().find((m: any) => m.role === 'user');
  let prompt = "";
  if (lastUserMessage) {
    if (typeof lastUserMessage.content === 'string' && lastUserMessage.content.trim()) {
      prompt = lastUserMessage.content;
    } else if (lastUserMessage.parts) {
      prompt = getMessageText(lastUserMessage.parts);
    }
  }
  prompt = prompt.toLowerCase().trim();
  const role = user.role;

  // 0. DETEKSI PERTANYAAN DI LUAR KONTEKS AKADEMIK KAMPUS
  const outOfContextKeywords = [
    'resep', 'masak', 'game', 'presiden', 'cuaca', 'film', 'lagu', 'musik', 
    'politik', 'crypto', 'bitcoin', 'sepak bola', 'olahraga', 'hp', 'laptop', 
    'saham', 'cerita lucu', 'pantun', 'zodiak', 'ramalan', 'mobil', 'motor'
  ];

  if (outOfContextKeywords.some(kw => prompt.includes(kw))) {
    return `Mohon maaf, sebagai **SIAKAD Bot**, saya khusus melayani pertanyaan seputar akademik dan data resmi STMIK IKMI Cirebon.

Saya tidak dapat menjawab pertanyaan di luar konteks akademik kampus.

Silakan tanyakan mengenai:
* Biodata & Profil Pengguna
* KHS & IPS Semester
* Transkrip Nilai & IPK Kumulatif
* Kartu Rencana Studi (KRS)
* Data Mahasiswa, Dosen, & Mata Kuliah
* Statistik Akademik STMIK IKMI`;
  }

  // 1. SALAM & BASA-BASI AI RAMAH
  if (prompt === 'halo' || prompt === 'hai' || prompt.includes('selamat pagi') || prompt.includes('selamat siang') || prompt.includes('selamat malam') || prompt === 'p' || prompt.includes('permisi')) {
    if (role === 'mahasiswa') {
      return `Halo **${user.name}**! Selamat datang di layanan asisten virtual SIAKAD STMIK IKMI Cirebon.

Ada yang dapat saya bantu mengenai data akademik Anda hari ini? Anda dapat menanyakan tentang profil, IPK, KHS semester, atau KRS aktif.`;
    }
    return `Halo **${user.name}**! Selamat datang di SIAKAD Bot.

Saya siap membantu Anda menyajikan data dan statistik akademik STMIK IKMI Cirebon secara cepat dan akurat. Silakan masukkan pertanyaan atau perintah pencarian Anda.`;
  }

  if (prompt.includes('terima kasih') || prompt.includes('makasih') || prompt.includes('trims') || prompt.includes('thanks')) {
    return `Sama-sama **${user.name}**! Senang dapat membantu Anda.

Jika ada data akademik lain yang Anda butuhkan, silakan sampaikan kembali.`;
  }

  if (prompt.includes('siapa kamu') || prompt.includes('siapa anda') || prompt.includes('tentang bot')) {
    return `Saya adalah **SIAKAD Bot**, asisten virtual AI resmi Sistem Informasi Akademik STMIK IKMI Cirebon.

Saya bertugas membantu Mahasiswa, Dosen, dan Administrator dalam mengakses data akademik kampus secara cepat dan terstruktur.`;
  }

  // 2. INTENT: PROFIL / BIODATA
  if (prompt.includes('profil') || prompt.includes('biodata') || prompt.includes('data diri') || prompt.includes('siapa saya') || prompt.includes('akun')) {
    if (role === 'mahasiswa') {
      const { data } = await supabase
        .from('students')
        .select('nim,nama,angkatan,is_active,alamat,no_hp,email,study_programs(nama,jenjang)')
        .eq('nim', user.username)
        .single();

      if (!data) return "Mohon maaf, data profil Anda belum ditemukan di database.";

      const prodi = Array.isArray(data.study_programs) ? data.study_programs[0] : data.study_programs;
      return `Tentu **${user.name}**, berikut adalah profil biodata diri Anda yang terdaftar pada sistem SIAKAD:

### Profil Mahasiswa

* **Nama Lengkap**: ${data.nama}
* **NIM**: \`${data.nim}\`
* **Program Studi**: ${prodi?.nama || '-'} (${prodi?.jenjang || '-'})
* **Angkatan**: ${data.angkatan}
* **Status Keaktifan**: ${data.is_active ? 'Aktif' : 'Tidak Aktif'}
* **Alamat Domisili**: ${data.alamat || '-'}
* **No. Telepon**: ${data.no_hp || '-'}
* **Email**: ${data.email || '-'}`;
    }

    if (role === 'dosen') {
      const { data } = await supabase
        .from('lecturers')
        .select('nidn,nama,email,phone,is_active')
        .eq('nidn', user.username)
        .single();

      if (!data) return "Mohon maaf, data profil dosen Anda belum ditemukan di database.";

      return `Tentu Bapak/Ibu **${user.name}**, berikut adalah rincian data profil pengajar Anda:

### Profil Dosen

* **Nama Lengkap**: ${data.nama}
* **NIDN**: \`${data.nidn || '-'}\`
* **Email**: ${data.email || '-'}
* **No. Telepon**: ${data.phone || '-'}
* **Status Mengajar**: ${data.is_active ? 'Aktif' : 'Tidak Aktif'}`;
    }

    return `Tentu **${user.name}**, berikut adalah rincian profil akun administrator Anda:

### Profil Administrator

* **Nama Pengguna**: ${user.name}
* **Username**: \`${user.username}\`
* **Hak Akses**: ${user.role}
* **Status Sistem**: Aktif`;
  }

  // 3. INTENT: TOP IPK & PREDIKAT YUDISIUM
  if (prompt.includes('tertinggi') || prompt.includes('terbaik') || prompt.includes('top ipk') || prompt.includes('ipk tertinggi') || prompt.includes('predikat') || prompt.includes('yudisium')) {
    if (prompt.includes('predikat') || prompt.includes('yudisium') || prompt.includes('syarat lulus')) {
      const { data: predikat } = await supabase.from('predikat_yudisium').select('label,ipk_min,ipk_max').order('urutan');
      if (predikat && predikat.length > 0) {
        const rows = predikat.map((p: any) => `| ${p.label} | ${p.ipk_min.toFixed(2)} - ${p.ipk_max.toFixed(2)} |`);
        return `Berikut adalah acuan kriteria predikat kelulusan (yudisium) di STMIK IKMI Cirebon:

| Predikat Yudisium | Rentang IPK |
| :---------------- | :---------: |
${rows.join('\n')}

*Catatan: Minimal SKS kelulusan jenjang S1 adalah 144 SKS, dan jenjang D3 adalah 108 SKS.*`;
      }
    }

    const { data: students } = await supabase
      .from('students')
      .select('id,nim,nama,study_programs(nama)')
      .eq('is_active', true);

    if (!students || students.length === 0) return "Data mahasiswa tidak ditemukan.";

    const studentsWithIPK = await Promise.all(
      students.map(async (s: any) => {
        const { data: grades } = await supabase.from('grades').select('hm,courses:course_id(sks)').eq('student_id', s.id);
        let totalSKS = 0, totalMutu = 0;
        if (grades && grades.length > 0) {
          grades.filter((g: any) => g.hm && g.hm !== '-').forEach((g: any) => {
            const sks = g.courses?.sks || 0;
            totalSKS += sks;
            totalMutu += getAM(g.hm) * sks;
          });
        }
        const ipk = totalSKS > 0 ? totalMutu / totalSKS : 0;
        const prodi = Array.isArray(s.study_programs) ? s.study_programs[0] : s.study_programs;
        return { nim: s.nim, nama: s.nama, prodi: prodi?.nama || '-', ipk: ipk.toFixed(2), ipk_raw: ipk };
      })
    );

    const topList = studentsWithIPK.filter(s => s.ipk_raw > 0).sort((a, b) => b.ipk_raw - a.ipk_raw).slice(0, 5);
    if (topList.length === 0) return "Belum ada data nilai IPK mahasiswa yang tercatat.";

    const rows = topList.map((s, i) => `| ${i + 1} | \`${s.nim}\` | ${s.nama} | ${s.prodi} | **${s.ipk}** |`);

    return `Baik, berikut adalah daftar 5 mahasiswa dengan perolehan IPK tertinggi di STMIK IKMI Cirebon:

| No | NIM | Nama Mahasiswa | Program Studi | IPK |
| :-: | :--- | :------------- | :------------ | :-: |
${rows.join('\n')}

Selamat kepada para mahasiswa atas prestasi akademik yang berhasil diraih.`;
  }

  // 4. INTENT: JUMLAH MAHASISWA PER PRODI & DAFTAR PRODI
  if (prompt.includes('per prodi') || prompt.includes('jumlah mahasiswa per prodi') || prompt.includes('daftar prodi') || prompt.includes('program studi') || prompt.includes('jurusan')) {
    const { data: prodi } = await supabase.from('study_programs').select('id,kode,nama,jenjang').order('nama');
    if (prodi && prodi.length > 0) {
      const stats = await Promise.all(
        prodi.map(async (p: any) => {
          const { count } = await supabase.from('students').select('id', { count: 'exact', head: true }).eq('study_program_id', p.id).eq('is_active', true);
          return `| ${p.kode} | ${p.nama} | ${p.jenjang} | ${count || 0} Mahasiswa |`;
        })
      );

      return `Tentu, berikut adalah sebaran statistik jumlah mahasiswa aktif berdasarkan Program Studi di STMIK IKMI Cirebon:

| Kode | Program Studi | Jenjang | Jumlah Mahasiswa Aktif |
| :-: | :------------ | :-: | :--------------------: |
${stats.join('\n')}

Silakan sampaikan jika Anda membutuhkan informasi lebih detail mengenai salah satu prodi di atas.`;
    }
  }

  // 5. INTENT: TRANSKRIP & IPK SAYA
  if (prompt.includes('ipk') || prompt.includes('transkrip') || prompt.includes('kumulatif') || prompt.includes('sks lulus')) {
    if (role === 'mahasiswa') {
      const { data: student } = await supabase.from('students').select('id').eq('nim', user.username).single();
      if (!student) return "Data mahasiswa tidak ditemukan.";

      const { data: grades } = await supabase
        .from('grades')
        .select('hm, courses:course_id(kode,matkul,sks,smt_default)')
        .eq('student_id', student.id);

      if (!grades || grades.length === 0) return "Belum ada riwayat nilai transkrip yang tercatat untuk akun Anda.";

      const validGrades = grades.filter((g: any) => g.hm && g.hm !== '-');
      const bestGrades = new Map<string, any>();
      validGrades.forEach((g: any) => {
        const kode = g.courses?.kode;
        if (!kode) return;
        const am = getAM(g.hm);
        const existing = bestGrades.get(kode);
        if (!existing || am > getAM(existing.hm)) bestGrades.set(kode, g);
      });

      let totalSKS = 0, totalMutu = 0, sksLulus = 0;
      const list = Array.from(bestGrades.values()).map((g: any) => {
        const sks = g.courses?.sks || 0;
        const am = getAM(g.hm);
        totalSKS += sks;
        totalMutu += am * sks;
        if (am >= 2) sksLulus += sks;
        return `| ${g.courses?.smt_default || 1} | ${g.courses?.kode} | ${g.courses?.matkul} | ${sks} | **${g.hm}** |`;
      });

      const ipk = totalSKS > 0 ? (totalMutu / totalSKS).toFixed(2) : '0.00';

      return `Tentu **${user.name}**, berikut adalah rincian Transkrip Nilai Akademik Kumulatif Anda:

### Transkrip Nilai Akademik

* **IPK Kumulatif**: **${ipk}**
* **Total SKS Lulus**: **${sksLulus} SKS**
* **Jumlah Mata Kuliah**: ${list.length} Matkul

| Smt | Kode | Mata Kuliah | SKS | Nilai |
| :-: | :--- | :---------- | :-: | :-: |
${list.join('\n')}

Semoga perolehan nilai akademik Anda terus meningkat!`;
    }
  }

  // 6. INTENT: KHS / NILAI SEMESTER
  if (prompt.includes('khs') || prompt.includes('nilai') || prompt.includes('ips')) {
    if (role === 'mahasiswa') {
      const smtMatch = prompt.match(/\b([1-8])\b/);
      const targetSmt = smtMatch ? parseInt(smtMatch[1]) : 1;

      const { data: student } = await supabase.from('students').select('id').eq('nim', user.username).single();
      if (!student) return "Data mahasiswa tidak ditemukan.";

      const { data: grades } = await supabase
        .from('grades')
        .select('hm, courses:course_id(matkul,sks,smt_default)')
        .eq('student_id', student.id);

      const semGrades = (grades || []).filter((g: any) => g.courses?.smt_default === targetSmt && g.hm && g.hm !== '-');

      if (semGrades.length === 0) return `Belum ada data nilai KHS yang tercatat untuk Semester ${targetSmt}.`;

      let totalSKS = 0, totalMutu = 0;
      const list = semGrades.map((g: any) => {
        const sks = g.courses?.sks || 0;
        const am = getAM(g.hm);
        totalSKS += sks;
        totalMutu += am * sks;
        return `| ${g.courses?.matkul} | ${sks} | **${g.hm}** |`;
      });

      const ips = totalSKS > 0 ? (totalMutu / totalSKS).toFixed(2) : '0.00';

      return `Berikut adalah laporan Kartu Hasil Studi (KHS) Anda pada Semester ${targetSmt}:

### Kartu Hasil Studi (KHS) - Semester ${targetSmt}

* **IPS (Indeks Prestasi Semester)**: **${ips}**
* **Total SKS Diselesaikan**: ${totalSKS} SKS

| Mata Kuliah | SKS | Nilai |
| :---------- | :-: | :-: |
${list.join('\n')}`;
    }
  }

  // 7. INTENT: KRS / MATKUL AKTIF
  if (prompt.includes('krs') || prompt.includes('mata kuliah diambil')) {
    if (role === 'mahasiswa') {
      const { data: student } = await supabase.from('students').select('id').eq('nim', user.username).single();
      const { data: activeYear } = await supabase.from('academic_years').select('id,nama,semester').eq('is_active', true).single();

      if (!student || !activeYear) return "Data mahasiswa atau tahun akademik aktif tidak ditemukan.";

      const { data: krs } = await supabase
        .from('krs')
        .select('status, courses:course_id(kode,matkul,sks)')
        .eq('student_id', student.id)
        .eq('academic_year_id', activeYear.id);

      if (!krs || krs.length === 0) return `Belum ada mata kuliah KRS yang diambil pada Tahun Akademik ${activeYear.nama} (${activeYear.semester}).`;

      let totalSKS = 0;
      const list = krs.map((k: any) => {
        totalSKS += k.courses?.sks || 0;
        const statusBadge = k.status === 'APPROVED' ? 'Disetujui' : k.status === 'SUBMITTED' ? 'Menunggu Approval' : 'Draft';
        return `| ${k.courses?.kode} | ${k.courses?.matkul} | ${k.courses?.sks} | ${statusBadge} |`;
      });

      return `Berikut adalah Kartu Rencana Studi (KRS) aktif yang sedang Anda jalani semester ini:

### Kartu Rencana Studi (KRS) Aktif

* **Tahun Akademik**: ${activeYear.nama} (${activeYear.semester})
* **Total SKS Diambil**: **${totalSKS} SKS**

| Kode | Mata Kuliah | SKS | Status |
| :--- | :---------- | :-: | :----: |
${list.join('\n')}`;
    }
  }

  // 8. INTENT: STATISTIK GENERAL SIAKAD
  if (prompt.includes('statistik') || prompt.includes('total') || prompt.includes('jumlah') || prompt.includes('ringkasan')) {
    const [mhs, mhsAktif, dsn, mk, prodi] = await Promise.all([
      supabase.from('students').select('id', { count: 'exact', head: true }),
      supabase.from('students').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('lecturers').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('courses').select('id', { count: 'exact', head: true }),
      supabase.from('study_programs').select('id', { count: 'exact', head: true }),
    ]);

    return `Tentu, berikut adalah ringkasan data statistik akademik kampus STMIK IKMI Cirebon:

### Statistik Umum SIAKAD IKMI

| Kategori Data | Jumlah |
| :------------ | :----: |
| Total Mahasiswa Terdaftar | **${mhs.count || 0}** |
| Mahasiswa Aktif | **${mhsAktif.count || 0}** |
| Total Dosen Aktif | **${dsn.count || 0}** |
| Total Mata Kuliah | **${mk.count || 0}** |
| Program Studi | **${prodi.count || 0}** |`;
  }

  // 9. INTENT: CARI MAHASISWA
  if (prompt.includes('cari mahasiswa') || prompt.includes('mahasiswa bernama') || prompt.includes('nim')) {
    const kw = prompt.replace('cari mahasiswa', '').replace('mahasiswa bernama', '').replace('nim', '').replace('cari', '').trim();
    if (kw.length > 0) {
      const isNIM = /^\d+$/.test(kw);
      const { data } = await supabase
        .from('students')
        .select('nim,nama,angkatan,is_active,study_programs(nama,jenjang)')
        .ilike(isNIM ? 'nim' : 'nama', `%${kw}%`)
        .limit(5);

      if (data && data.length > 0) {
        const list = data.map((s: any) => {
          const p = Array.isArray(s.study_programs) ? s.study_programs[0] : s.study_programs;
          return `* **${s.nama}** (NIM: \`${s.nim}\`) - ${p?.nama || '-'} (${s.angkatan}) [${s.is_active ? 'Aktif' : 'Non-Aktif'}]`;
        });
        return `Berikut adalah hasil pencarian mahasiswa dengan kata kunci "${kw}":\n\n${list.join('\n')}`;
      }
      return `Pencarian mahasiswa dengan kata kunci "${kw}" tidak ditemukan di database.`;
    }
  }

  // 10. INTENT: CARI DOSEN
  if (prompt.includes('cari dosen') || prompt.includes('dosen bernama') || prompt.includes('nidn')) {
    const kw = prompt.replace('cari dosen', '').replace('dosen bernama', '').replace('nidn', '').replace('cari', '').trim();
    if (kw.length > 0) {
      const isNIDN = /^\d+$/.test(kw);
      const { data } = await supabase
        .from('lecturers')
        .select('nidn,nama,email,phone,is_active')
        .ilike(isNIDN ? 'nidn' : 'nama', `%${kw}%`)
        .limit(5);

      if (data && data.length > 0) {
        const list = data.map((d: any) => {
          return `* **${d.nama}** (NIDN: \`${d.nidn || '-'}\`) - Email: ${d.email || '-'} [${d.is_active ? 'Aktif' : 'Non-Aktif'}]`;
        });
        return `Berikut adalah hasil pencarian data dosen dengan kata kunci "${kw}":\n\n${list.join('\n')}`;
      }
      return `Pencarian data dosen dengan kata kunci "${kw}" tidak ditemukan.`;
    }
  }

  // 11. INTENT: MATA KULIAH / ALGORITMA
  if (prompt.includes('cari matkul') || prompt.includes('mata kuliah') || prompt.includes('matakuliah') || prompt.includes('algoritma')) {
    let kw = prompt.replace('cari matkul', '').replace('mata kuliah', '').replace('matakuliah', '').replace('cari', '').trim();
    if (!kw || kw === 'algoritma') kw = 'algoritma';

    const { data } = await supabase
      .from('courses')
      .select('kode,matkul,sks,smt_default,kategori')
      .ilike('matkul', `%${kw}%`)
      .limit(8);

    if (data && data.length > 0) {
      const list = data.map((c: any) => `| ${c.kode} | ${c.matkul} | ${c.sks} SKS | Semester ${c.smt_default} | ${c.kategori} |`);
      return `Tentu, berikut adalah daftar mata kuliah yang sesuai dengan kata kunci "${kw}":

| Kode | Nama Mata Kuliah | SKS | Semester | Kategori |
| :--- | :--------------- | :-: | :------: | :------: |
${list.join('\n')}`;
    }
    return `Mata kuliah dengan kata kunci "${kw}" tidak ditemukan.`;
  }

  // 12. DEFAULT FALLBACK AKADEMIK UMUM
  if (role === 'mahasiswa') {
    return `Halo **${user.name}**! Saya SIAKAD Bot, asisten virtual resmi STMIK IKMI Cirebon.

Saya siap membantu Anda menyajikan informasi akademis seperti:
* **"Tampilkan biodata saya"** - Profil data diri mahasiswa.
* **"Berapa IPK saya sekarang?"** - Transkrip Nilai & IPK Kumulatif.
* **"Lihat KHS semester ini"** - Nilai KHS per semester.
* **"Apa saja mata kuliah KRS saya?"** - Rencana studi semester aktif.

Silakan masukkan pertanyaan atau pilih salah satu saran di atas.`;
  }

  if (role === 'dosen') {
    return `Halo Bapak/Ibu **${user.name}**! Saya SIAKAD Bot, asisten virtual STMIK IKMI Cirebon.

Saya siap membantu Anda menyajikan data perkuliahan:
* **"Tampilkan profil saya"** - Biodata & NIDN Anda.
* **"Tampilkan statistik SIAKAD"** - Jumlah mahasiswa, dosen, & prodi.
* **"Cari mahasiswa [Nama/NIM]"** - Pencarian data mahasiswa.
* **"Berapa jumlah mahasiswa per prodi?"** - Statistik per prodi.

Silakan pilih atau ketikkan kata kunci pencarian Anda.`;
  }

  return `Halo **${user.name}**! Saya SIAKAD Bot, asisten virtual STMIK IKMI Cirebon.

Berikut adalah informasi akademik yang dapat saya tampilkan:
* **"Tampilkan statistik SIAKAD"** - Ringkasan data umum kampus.
* **"Cari mahasiswa dengan IPK tertinggi"** - Daftar mahasiswa berprestasi.
* **"Berapa jumlah mahasiswa per prodi?"** - Sebaran mahasiswa per prodi.
* **"Cari mata kuliah Algoritma"** - Pencarian mata kuliah.

Silakan masukkan pertanyaan akademik yang Anda butuhkan.`;
}
