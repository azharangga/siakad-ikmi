import React, { useRef, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import DocumentHeader from "@/components/features/document/DocumentHeader";
import DocumentFooter from "@/components/features/document/DocumentFooter";
import { Official, StudentData } from "@/lib/types";

interface PrintableSuratKeteranganProps {
  loading: boolean;
  currentStudent: StudentData | null;
  official: Official | null;
  nomorSurat: string;
  tahunAkademik: string;
  tempatLahir: string;
  tanggalLahir: string;
  alamat: string;
  namaOrangTua: string;
  pekerjaanOrangTua: string;
  signatureType: "basah" | "digital" | "none";
  signatureBase64: string | null;
  isCollapsed: boolean;
  setTotalPages?: (pages: number) => void;
}

export default function PrintableSuratKeterangan({
  loading,
  currentStudent,
  official,
  nomorSurat,
  tahunAkademik,
  tempatLahir,
  tanggalLahir,
  alamat,
  namaOrangTua,
  pekerjaanOrangTua,
  signatureType,
  signatureBase64,
  isCollapsed,
  setTotalPages,
}: PrintableSuratKeteranganProps) {
  const paperRef = useRef<HTMLDivElement>(null);

  // Observer untuk resize kertas
  useEffect(() => {
    if (!paperRef.current || !setTotalPages) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const pages = Math.ceil((entry.target.scrollHeight - 1) / 1122.5);
        setTotalPages(pages < 1 ? 1 : pages);
      }
    });
    observer.observe(paperRef.current);
    return () => observer.disconnect();
  }, [currentStudent, alamat, setTotalPages]);

  const getRomanMonth = () =>
    ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"][
      new Date().getMonth()
    ];
  const fullNomorSurat = `${
    nomorSurat || "..."
  }/A/S.KET/STMIK-IKMI/${getRomanMonth()}/${new Date().getFullYear()}`;
  const terbilangSemester = (num: number) =>
    [
      "Nol",
      "Satu",
      "Dua",
      "Tiga",
      "Empat",
      "Lima",
      "Enam",
      "Tujuh",
      "Delapan",
      "Sembilan",
      "Sepuluh",
      "Sebelas",
      "Dua Belas",
      "Tiga Belas",
      "Empat Belas",
    ][num] || num.toString();

  const labelStyle = { width: "150px", verticalAlign: "top", padding: "1px 0" };
  const colonStyle = {
    width: "15px",
    verticalAlign: "top",
    padding: "1px 0",
    textAlign: "center" as const,
  };
  const valueStyle = { verticalAlign: "top", padding: "1px 20px 1px 4px" };

  return (
    <div
      className={`hidden xl:flex print:flex print:w-full print:justify-center shrink-0 justify-start w-full transition-all duration-300 ${
        isCollapsed ? "xl:w-[210mm]" : "xl:w-[189mm]"
      }`}
    >
      <div
        ref={paperRef}
        className={`bg-white p-8 shadow-2xl border border-gray-300 print:shadow-none print:border-none print:m-0 w-[210mm] min-h-[297mm] origin-top-left transform transition-transform duration-300 ${
          isCollapsed ? "xl:scale-100" : "xl:scale-[0.9]"
        } print:scale-100 flex flex-col justify-between`}
      >
        <div>
          {loading ? (
            <div className="animate-pulse flex flex-col h-full">
              <div className="grid grid-cols-[1fr_auto] gap-4 mb-1">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-[80px] h-[80px]" />
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-3 w-48" />
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
                <Skeleton className="w-[250px] h-[78px]" />
              </div>
              <div className="space-y-4 mt-8 px-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ) : !currentStudent ? (
            <div className="flex flex-col h-full items-center justify-center text-slate-400">
              <p>Data Mahasiswa Kosong</p>
            </div>
          ) : (
            <>
              <DocumentHeader title="" />
              <div className="text-center mt-[-10px] mb-8 font-caladea text-black leading-snug">
                <h2 className="font-bold text-[14px] underline uppercase mb-0">
                  SURAT KETERANGAN
                </h2>
                <p className="text-[11px]">Nomor : {fullNomorSurat}</p>
              </div>

              <div className="text-[11px] font-caladea text-black px-4 min-h-[450px]">
                <p className="mb-2">Yang bertanda tangan di bawah ini :</p>
                <div className="ml-4 mb-4">
                  <table className="w-full" style={{ tableLayout: "fixed" }}>
                    <tbody>
                      {/* Menggunakan Data Pejabat dari Database */}
                      <tr>
                        <td style={labelStyle}>Nama</td>
                        <td style={colonStyle}>:</td>
                        <td
                          style={valueStyle}
                          className="font-bold break-words"
                        >
                          {official ? official.lecturer?.nama : "..."}
                        </td>
                      </tr>
                      <tr>
                        <td style={labelStyle}>NIDN</td>
                        <td style={colonStyle}>:</td>
                        <td style={valueStyle} className="break-words">
                          {official ? official.lecturer?.nidn || "-" : "..."}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <p className="mb-2">Menerangkan bahwa :</p>
                <div className="ml-4 mb-4">
                  <table className="w-full" style={{ tableLayout: "fixed" }}>
                    <tbody>
                      <tr>
                        <td style={labelStyle}>Nama</td>
                        <td style={colonStyle}>:</td>
                        <td
                          style={valueStyle}
                          className="font-bold uppercase break-words"
                        >
                          {currentStudent.profile.nama.toUpperCase()}
                        </td>
                      </tr>
                      <tr>
                        <td style={labelStyle}>NIM</td>
                        <td style={colonStyle}>:</td>
                        <td style={valueStyle} className="break-words">
                          {currentStudent.profile.nim}
                        </td>
                      </tr>
                      <tr>
                        <td style={labelStyle}>Tempat, tanggal lahir</td>
                        <td style={colonStyle}>:</td>
                        <td style={valueStyle} className="capitalize break-words">
                          {tempatLahir || "..."} , {tanggalLahir || "..."}
                        </td>
                      </tr>

                      <tr>
                        <td style={labelStyle}>Jurusan</td>
                        <td style={colonStyle}>:</td>
                        <td style={valueStyle} className="break-words">
                          {currentStudent.profile.study_program?.nama || "-"}{" "}
                          {currentStudent.profile.study_program?.jenjang
                            ? `(${currentStudent.profile.study_program.jenjang})`
                            : ""}
                        </td>
                      </tr>

                      <tr>
                        <td style={labelStyle}>Semester</td>
                        <td style={colonStyle}>:</td>
                        <td style={valueStyle} className="break-words">
                          {currentStudent.profile.semester} (
                          {terbilangSemester(currentStudent.profile.semester)})
                        </td>
                      </tr>
                      <tr>
                        <td style={labelStyle}>Tahun Akademik</td>
                        <td style={colonStyle}>:</td>
                        <td style={valueStyle} className="break-words">
                          {tahunAkademik || "..."}
                        </td>
                      </tr>
                      <tr>
                        <td style={labelStyle}>Alamat</td>
                        <td style={colonStyle}>:</td>
                        <td
                          style={valueStyle}
                          className="break-words whitespace-pre-wrap text-justify"
                        >
                          {alamat || "..."}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <p className="mb-2">
                  Dan orang tua dari mahasiswa tersebut adalah :
                </p>
                <div className="ml-4 mb-4">
                  <table className="w-full" style={{ tableLayout: "fixed" }}>
                    <tbody>
                      <tr>
                        <td style={labelStyle}>Nama Orang Tua</td>
                        <td style={colonStyle}>:</td>
                        <td
                          style={valueStyle}
                          className="font-bold break-words"
                        >
                          {namaOrangTua || "..."}
                        </td>
                      </tr>
                      <tr>
                        <td style={labelStyle}>Pekerjaan</td>
                        <td style={colonStyle}>:</td>
                        <td
                          style={valueStyle}
                          className="capitalize break-words"
                        >
                          {pekerjaanOrangTua || "..."}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <p className="mb-3 text-justify leading-relaxed">
                  Dengan ini menerangkan bahwa mahasiswa yang namanya tersebut di
                  atas adalah benar-benar tercatat sebagai mahasiswa aktif di
                  Sekolah Tinggi Manajemen Informatika dan Komputer (STMIK) IKMI
                  Cirebon. Pada saat surat ini diterbitkan, yang bersangkutan
                  sedang menempuh kegiatan perkuliahan secara aktif pada
                  semester {currentStudent.profile.semester} (
                  {terbilangSemester(currentStudent.profile.semester)}) Tahun
                  Akademik {tahunAkademik || "..."}.
                </p>

                <p className="mb-8 text-justify leading-relaxed">
                  Surat Keterangan ini dibuat dan diberikan kepada yang
                  bersangkutan untuk dapat dipergunakan sebagai bukti keaktifan
                  kuliah dan keperluan administrasi lainnya sebagaimana
                  mestinya. Demikian surat keterangan ini kami buat dengan
                  sebenarnya untuk dapat dipergunakan sesuai dengan ketentuan
                  yang berlaku.
                </p>
              </div>

              <DocumentFooter
                signatureType={signatureType}
                signatureBase64={signatureBase64}
                mode="surat"
                official={official}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
