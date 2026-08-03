export function calculateStudentSemester(
  angkatan: number | string | null | undefined,
  activeYear: { nama: string; semester: string } | null,
  statusMahasiswa?: string
): number {
  if (statusMahasiswa === 'LULUS') return 8;
  if (!angkatan || !activeYear) return 1;

  const angkatanNum = typeof angkatan === "string" ? parseInt(angkatan) : angkatan;
  const currentStartYear = parseInt((activeYear.nama || "").split('/')[0].split('-')[0].trim());

  if (isNaN(currentStartYear) || isNaN(angkatanNum)) return 1;

  const yearDiff = currentStartYear - angkatanNum;
  let sem = yearDiff * 2;

  const semStr = (activeYear.semester || "").toString().trim().toLowerCase();
  if (semStr.includes("ganjil") || semStr === "1") {
    sem += 1;
  } else if (semStr.includes("genap") || semStr === "2") {
    sem += 2;
  }

  const resultSem = sem > 0 ? sem : 1;
  return resultSem > 8 ? 8 : resultSem;
}
