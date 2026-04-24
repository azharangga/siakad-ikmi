import React, { useRef, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import DocumentHeader from "@/components/features/document/DocumentHeader";
import { Official, StudentData } from "@/lib/types";

interface PrintableSKLProps {
  loading: boolean;
  currentStudent: StudentData | null;
  officialKaprodi: Official | null;
  officialKetua: Official | null;
  nomorSurat: string;
  tanggalSidang: string;
  hariSidang: string;
  nilaiSidang: string;
  ipkYudisium: string;
  predikat: string;
  signatureType: "basah" | "digital" | "none";
  isCollapsed: boolean;
  setTotalPages?: (pages: number) => void;
}

export default function PrintableSKL({
  loading,
  currentStudent,
  officialKaprodi,
  officialKetua,
  nomorSurat,
  tanggalSidang,
  hariSidang,
  nilaiSidang,
  ipkYudisium,
  predikat,
  signatureType,
  isCollapsed,
  setTotalPages,
}: PrintableSKLProps) {
  const paperRef = useRef<HTMLDivElement>(null);

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
  }, [currentStudent, setTotalPages]);

  const getRomanMonth = () =>
    ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"][new Date().getMonth()];

  const fullNomorSurat = `${nomorSurat || "..."}/SKL/STMIK-IKMI/${getRomanMonth()}/${new Date().getFullYear()}`;

  const [tanggalDisplay, setTanggalDisplay] = React.useState("");
  useEffect(() => {
    setTanggalDisplay(
      new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date())
    );
  }, []);

  const labelStyle = { width: "140px", verticalAlign: "top", padding: "2px 0" };
  const colonStyle = { width: "15px", verticalAlign: "top", padding: "2px 0", textAlign: "center" as const };
  const valueStyle = { verticalAlign: "top", padding: "2px 4px" };

  const getSignatureUrl = (official: Official | null) => {
    if (!official) return null;
    if (signatureType === "basah") return official.ttd_basah_url || null;
    if (signatureType === "digital") return official.ttd_digital_url || null;
    return null;
  };

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
                  </div>
                </div>
                <Skeleton className="w-[250px] h-[78px]" />
              </div>
              <div className="space-y-4 mt-8 px-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ) : !currentStudent ? (
            <div className="flex flex-col h-full items-center justify-center text-slate-400">
              <p>Data Mahasiswa Kosong</p>
            </div>
          ) : (
            <>
              <DocumentHeader title="" />
              <div className="text-center mt-[-10px] mb-6 font-caladea text-black leading-snug">
                <h2 className="font-bold text-[14px] underline uppercase mb-0">
                  SURAT KETERANGAN LULUS
                </h2>
                <p className="text-[11px]">Nomor : {fullNomorSurat}</p>
              </div>

              <div className="text-[11px] font-caladea text-black px-4">
                <p className="mb-4">Yang bertanda tangan di bawah ini, menerangkan bahwa :</p>

                <div className="ml-4 mb-6">
                  <table className="w-full" style={{ tableLayout: "fixed" }}>
                    <tbody>
                      <tr>
                        <td style={labelStyle}>Nama</td>
                        <td style={colonStyle}>:</td>
                        <td style={valueStyle} className="font-bold uppercase break-words">
                          {currentStudent.profile.nama}
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
                        <td style={labelStyle}>Program Studi</td>
                        <td style={colonStyle}>:</td>
                        <td style={valueStyle} className="break-words">
                          {currentStudent.profile.study_program?.nama || "-"}
                        </td>
                      </tr>
                      <tr>
                        <td style={labelStyle}>Jenjang Program</td>
                        <td style={colonStyle}>:</td>
                        <td style={valueStyle} className="font-bold break-words">
                          {currentStudent.profile.study_program?.jenjang === "S1"
                            ? "SARJANA (S1)"
                            : currentStudent.profile.study_program?.jenjang === "D3"
                            ? "DIPLOMA TIGA (D3)"
                            : currentStudent.profile.study_program?.jenjang || "-"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <p className="mb-4 text-justify leading-relaxed">
                  &nbsp;&nbsp;&nbsp;&nbsp;Setelah yang bersangkutan mengikuti dan melaksanakan sebagaimana diatur dalam tata
                  laksana Ujian Sidang Skripsi di STMIK IKMI Cirebon, pada hari ini{" "}
                  <strong>
                    {hariSidang || "..."} tanggal {tanggalSidang || "..."}
                  </strong>{" "}
                  dihadapan Penguji Sidang Skripsi, yang bersangkutan dinyatakan{" "}
                  <strong className="tracking-widest">L u l u s</strong> dengan nilai Sidang Skripsi{" "}
                  <strong>{nilaiSidang || "..."}</strong> dan{" "}
                  <strong>IPK YUDISIUM : {ipkYudisium || "..."}</strong> dengan predikat{" "}
                  <strong className="tracking-widest">{predikat || "..."}</strong>.
                </p>

                <p className="mb-8 text-justify leading-relaxed">
                  &nbsp;&nbsp;&nbsp;&nbsp;Surat Keterangan Lulus berlaku hingga Ijazah, Transkrip Nilai dan SKPI diterbitkan oleh
                  STMIK IKMI Cirebon serta dapat digunakan sebagaimana mestinya. Demikian Surat
                  Keterangan Lulus ini dikeluarkan.
                </p>
              </div>

              {/* FOOTER 2 TANDA TANGAN */}
              <div className="flex justify-between items-start mt-4 text-[10px] font-caladea px-4">
                {/* Kiri: Ketua Prodi */}
                <div className="flex flex-col items-center w-[45%]">
                  <p className="mb-0 leading-tight">Cirebon, {tanggalDisplay || "..."}</p>
                  <p className="font-normal mb-1 leading-tight text-center">
                    {officialKaprodi?.jabatan || "Ketua Prodi"}
                  </p>
                  <div
                    className="relative w-32 h-24 my-1 flex items-center justify-center select-none"
                    onContextMenu={(e) => e.preventDefault()}
                  >
                    {signatureType !== "none" && getSignatureUrl(officialKaprodi) && (
                      <img
                        src={getSignatureUrl(officialKaprodi)!}
                        alt="TTD Kaprodi"
                        className={`absolute w-full h-full object-contain z-10 top-0 left-0 mix-blend-multiply translate-y-[-20px] pointer-events-none select-none ${
                          signatureType === "basah" ? "scale-[1.6]" : "scale-[1.3]"
                        }`}
                        draggable={false}
                      />
                    )}
                  </div>
                  <div className="text-center z-20 mt-[-35px] relative">
                    <p className="font-bold underline text-[11px] leading-none uppercase">
                      {officialKaprodi?.lecturer?.nama || "..."}
                    </p>
                    <p className="font-bold text-[10px] leading-tight">
                      NIDN. {officialKaprodi?.lecturer?.nidn || "..."}
                    </p>
                  </div>
                </div>

                {/* Kanan: Ketua STMIK */}
                <div className="flex flex-col items-center w-[45%]">
                  <p className="mb-0 leading-tight">Mengetahui,</p>
                  <p className="font-normal mb-1 leading-tight text-center">
                    {officialKetua?.jabatan || "Ketua STMIK IKMI Cirebon"}
                  </p>
                  <div
                    className="relative w-32 h-24 my-1 flex items-center justify-center select-none"
                    onContextMenu={(e) => e.preventDefault()}
                  >
                    {signatureType !== "none" && getSignatureUrl(officialKetua) && (
                      <img
                        src={getSignatureUrl(officialKetua)!}
                        alt="TTD Ketua STMIK"
                        className={`absolute w-full h-full object-contain z-10 top-0 left-0 mix-blend-multiply translate-y-[-20px] pointer-events-none select-none ${
                          signatureType === "basah" ? "scale-[1.6]" : "scale-[1.3]"
                        }`}
                        draggable={false}
                      />
                    )}
                  </div>
                  <div className="text-center z-20 mt-[-35px] relative">
                    <p className="font-bold underline text-[11px] leading-none uppercase">
                      {officialKetua?.lecturer?.nama || "..."}
                    </p>
                    <p className="font-bold text-[10px] leading-tight">
                      NIDN. {officialKetua?.lecturer?.nidn || "..."}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
