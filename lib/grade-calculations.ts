// lib/grade-calculations.ts

import { TranscriptItem } from "@/lib/types";

// ==========================================
// 1. KONFIGURASI BOBOT NILAI
// ==========================================
export const GRADE_WEIGHTS: Record<string, number> = {
  'A': 4.00,
  'B': 3.00,
  'C': 2.00,
  'D': 1.00,
  'E': 0.00,
  'T': 0.00, // Tunda
};

/**
 * Mengubah Huruf Mutu (HM) ke Angka Mutu (AM).
 * Case-insensitive. Default 0 jika tidak dikenali.
 */
export function getGradePoint(hm: string): number {
  if (!hm) return 0;
  return GRADE_WEIGHTS[hm.toUpperCase()] ?? 0;
}

// ==========================================
// 2. HELPER UTAMA (Deduplikasi & Sortir)
// ==========================================

/**
 * Mengambil daftar mata kuliah unik berdasarkan Nilai Tertinggi (Best Grade).
 * Digunakan untuk perhitungan IPK agar matkul mengulang tidak dihitung ganda.
 */
function getBestUniqueCourses(transcript: TranscriptItem[]) {
  const uniqueMap = new Map<string, { sks: number; am: number; hm: string }>();

  if (!transcript) return [];

  transcript.forEach((course) => {
    // Normalisasi Kode MK (hapus spasi, uppercase)
    const kode = course.kode?.trim().toUpperCase();
    if (!kode) return;

    // Pastikan AM ada, jika tidak, hitung dari HM
    const currentAM = course.am ?? getGradePoint(course.hm);
    const currentSKS = Number(course.sks) || 0;

    // Filter nilai kosong/strip
    if (course.hm === '-') return;

    const existing = uniqueMap.get(kode);

    if (!existing) {
      // Belum ada, masukkan
      uniqueMap.set(kode, { sks: currentSKS, am: currentAM, hm: course.hm });
    } else {
      // Sudah ada, cek apakah nilai sekarang lebih besar? (Perbaikan Nilai)
      if (currentAM > existing.am) {
        uniqueMap.set(kode, { sks: currentSKS, am: currentAM, hm: course.hm });
      }
    }
  });

  return Array.from(uniqueMap.values());
}

// ==========================================
// 3. FUNGSI PERHITUNGAN PUBLIK
// ==========================================

/**
 * Menghitung IPK (Indeks Prestasi Kumulatif)
 * Rumus: Total (SKS x AM) / Total SKS (dari mata kuliah unik terbaik)
 */
export function calculateIPK(transcript: TranscriptItem[]): string {
  if (!transcript || transcript.length === 0) return "0.00";

  const bestCourses = getBestUniqueCourses(transcript);

  let totalSKS = 0;
  let totalBobot = 0; // SKS * AM

  bestCourses.forEach((c) => {
    // Hitung bobot untuk semua matkul yang diambil (termasuk E jika kebijakan menghitung E di pembagi IPK)
    // Sesuai standar umum: Total Mutu / Total SKS
    if (c.sks > 0) {
      totalSKS += c.sks;
      totalBobot += (c.sks * c.am);
    }
  });

  if (totalSKS === 0) return "0.00";
  // Ganti replace('.', ',') di UI saja agar data raw tetap float string standar
  return (totalBobot / totalSKS).toFixed(2);
}

/**
 * Menghitung Total SKS Lulus
 * Aturan: Nilai E (0.00) dianggap TIDAK lulus (SKS tidak dihitung).
 * Nilai D (1.00) ke atas dianggap Lulus.
 */
export function calculateTotalSKSLulus(transcript: TranscriptItem[]): number {
  const bestCourses = getBestUniqueCourses(transcript);

  return bestCourses.reduce((total, course) => {
    // Asumsi: AM >= 1.00 (D) adalah Lulus
    if (course.am >= 1.00) {
      return total + course.sks;
    }
    return total;
  }, 0);
}

/**
 * Menghitung Total Angka Mutu (Total Bobot)
 * Digunakan untuk tabel summary
 */
export function calculateTotalMutu(transcript: TranscriptItem[]): number {
  const bestCourses = getBestUniqueCourses(transcript);
  return bestCourses.reduce((total, c) => total + (c.sks * c.am), 0);
}

/**
 * Menghitung IPS (Indeks Prestasi Semester)
 * Tanpa deduplikasi (apa yang diambil semester itu, itu yang dihitung).
 */
export function calculateIPS(transcript: TranscriptItem[], semester: number): string {
  if (!transcript) return "0.00";
  const semesterCourses = transcript.filter((t) => Number(t.smt) === semester && t.hm !== '-');

  if (!semesterCourses || semesterCourses.length === 0) return "0.00";

  let totalSKS = 0;
  let totalBobot = 0;

  semesterCourses.forEach((course) => {
    const am = course.am ?? getGradePoint(course.hm);
    const sks = Number(course.sks) || 0;

    if (sks > 0) {
      totalSKS += sks;
      totalBobot += (sks * am);
    }
  });

  return totalSKS > 0 ? (totalBobot / totalSKS).toFixed(2) : "0.00";
}

/**
 * Menghitung Tren IPS per Semester untuk Chart
 */
export function calculateSemesterTrend(transcript: TranscriptItem[], currentSemester?: number) {
  const safeTranscript = transcript || [];

  // Selalu tampilkan minimal 8 semester (S1 - S8), jika ada semester di atas 8 ikuti semester tertinggi
  const maxSemester = Math.max(8, currentSemester || 0, safeTranscript.length > 0 ? Math.max(...safeTranscript.map((t) => Number(t.smt) || 0)) : 8);

  const trend = [];

  for (let i = 1; i <= maxSemester; i++) {
    const ipsString = calculateIPS(safeTranscript, i);
    const ipsVal = parseFloat(ipsString);

    trend.push({
      label: `Smt ${i}`,
      val: ipsVal,
      height: `${Math.min((ipsVal / 4) * 100, 100)}%`
    });
  }
  return trend;
}