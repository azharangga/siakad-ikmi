import React, { useRef, useEffect, forwardRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import DocumentHeader from "@/components/features/document/DocumentHeader";
import { Official, StudentData } from "@/lib/types";

interface PrintableSKLProps {
  loading: boolean;
  currentStudent: StudentData | null;
  officialKaprodi: Official | null;
  officialKetua: Official | null;
  nomorSurat: string;
  tanggalSidang: string;   // "12 Maret 2026"
  hariSidang: string;      // "Kamis"
  nilaiSidang: string;     // "B"
  ipkYudisium: string;     // "3.45"
  predikat: string;        // "Memuaskan"
  signatureType: "basah" | "digital" | "none";
  isCollapsed: boolean;
}

const PrintableSKL = forwardRef<HTMLDivElement, PrintableSKLProps>(({
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
}, ref) => {
  const localRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref) return;
    if (typeof ref === "function") {
      ref(localRef.current);
    } else {
      (ref as React.MutableRefObject<HTMLDivElement | null>).current = localRef.current;
    }
  }, [ref]);

  const getRomanMonth = () =>
    ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"][new Date().getMonth()];

  const fullNomorSurat = nomorSurat || "...";

  const getEffectiveTanggalSidang = () => {
    if (tanggalSidang && tanggalSidang.trim() !== "" && tanggalSidang !== "...") {
      return tanggalSidang;
    }
    const angkatan = currentStudent?.profile?.angkatan || 2022;
    const jenjang = currentStudent?.profile?.study_program?.jenjang || "S1";
    const year = Number(angkatan) + (jenjang.includes("D3") ? 3 : 4);
    return `15 Februari ${year}`;
  };

  const getEffectiveHariSidang = () => {
    if (hariSidang && hariSidang.trim() !== "" && hariSidang !== "...") {
      return hariSidang;
    }
    return "Jumat";
  };

  const [tanggalDisplay, setTanggalDisplay] = React.useState("");
  useEffect(() => {
    setTanggalDisplay(
      new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date())
    );
  }, []);

  const labelStyle = { width: "150px", verticalAlign: "top", padding: "3px 0" };
  const colonStyle = { width: "20px", verticalAlign: "top", padding: "3px 0", textAlign: "center" as const };
  const valueStyle = { verticalAlign: "top", padding: "3px 4px" };

  const getSignatureUrl = (official: Official | null) => {
    if (!official) return null;
    if (signatureType === "basah") return official.ttd_basah_url || null;
    if (signatureType === "digital") return official.ttd_digital_url || null;
    return null;
  };

  const getCleanIPK = (val: string | number) => {
    if (val === undefined || val === null || val === "") return "0,00";
    const str = String(val).replace(/&nbsp;/g, "").replace(/\s+/g, "");
    const num = parseFloat(str.replace(",", "."));
    if (isNaN(num)) return "0,00";
    return num.toFixed(2).replace(".", ",");
  };

  return (
    <div className="flex print:flex print:w-full print:justify-center shrink-0 justify-start w-full w-[210mm] overflow-visible mb-0">
      <div
        ref={localRef}
        className={`bg-white p-8 shadow-2xl border border-gray-300 print:shadow-none print:border-none print:m-0 w-[210mm] min-h-[297mm] origin-top-left transform transition-transform duration-300 ${
          isCollapsed ? "xl:scale-100" : "xl:scale-[0.9]"
        } print:scale-100`}
      >
        {loading ? (
          <div className="animate-pulse flex flex-col h-full space-y-4">
            <Skeleton className="w-full h-32" />
            <Skeleton className="w-full h-64" />
          </div>
        ) : !currentStudent ? (
          <div className="flex flex-col h-full items-center justify-center text-slate-400">
            <p>Data Mahasiswa Kosong</p>
          </div>
        ) : (
          <>
            <DocumentHeader title="" />
            <div className="text-center mt-[-10px] mb-8 font-caladea text-black leading-snug">
              <h2 className="font-bold text-[16px] underline uppercase mb-1">SURAT KETERANGAN LULUS</h2>
              <p className="text-[13px]">Nomor : {fullNomorSurat}</p>
            </div>

            <div className="text-[13px] font-caladea text-black px-4">
              <p className="mb-5">Yang bertanda tangan di bawah ini, menerangkan bahwa :</p>

              <div className="ml-4 mb-7">
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
                      <td style={valueStyle} className="break-words">{currentStudent.profile.nim}</td>
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

              <p className="mb-5 text-justify leading-[1.7]">
                &nbsp;&nbsp;&nbsp;&nbsp;Setelah yang bersangkutan mengikuti dan melaksanakan sebagaimana diatur dalam tata
                laksana Ujian Sidang Skripsi di STMIK IKMI Cirebon, pada hari{" "}
                <strong>{getEffectiveHariSidang()}</strong> tanggal{" "}
                <strong>{getEffectiveTanggalSidang()}</strong>{" "}
                dihadapan Penguji Sidang Skripsi, yang bersangkutan dinyatakan{" "}
                <strong className="tracking-[0.45em] whitespace-nowrap -mr-[0.45em]">Lulus</strong> dengan nilai Sidang Skripsi{" "}
                <strong>{nilaiSidang || "A"}</strong> dan{" "}
                <strong className="whitespace-nowrap">IPK YUDISIUM : {getCleanIPK(ipkYudisium)}</strong> dengan predikat{" "}
                <strong>{predikat || "-"}</strong>.
              </p>

              <p className="mb-10 text-justify leading-[1.7]">
                &nbsp;&nbsp;&nbsp;&nbsp;Surat Keterangan Lulus berlaku hingga Ijazah, Transkrip Nilai dan SKPI diterbitkan oleh
                STMIK IKMI Cirebon serta dapat digunakan sebagaimana mestinya. Demikian Surat
                Keterangan Lulus ini dikeluarkan.
              </p>
            </div>

            {/* FOOTER 2 TANDA TANGAN */}
            <div className="flex justify-between items-start mt-6 text-[11px] font-caladea px-4">
              {/* Kiri: Ketua Prodi */}
              <div className="flex flex-col items-center w-[45%] text-center">
                <p className="mb-0 leading-tight">Cirebon, {tanggalDisplay || "..."}</p>
                <p className="font-normal mb-1 leading-tight text-center">
                  {officialKaprodi?.jabatan || "Ketua Prodi"}
                </p>
                <div
                  className="relative w-full h-20 my-1 flex items-center justify-center select-none"
                  onContextMenu={(e) => e.preventDefault()}
                >
                  {signatureType !== "none" && getSignatureUrl(officialKaprodi) && (
                    <img
                      src={getSignatureUrl(officialKaprodi)!}
                      alt="TTD Kaprodi"
                      className={`absolute max-h-24 object-contain z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mix-blend-multiply pointer-events-none select-none ${
                        signatureType === "basah" ? "scale-[1.5]" : "scale-[1.2]"
                      }`}
                      draggable={false}
                    />
                  )}
                </div>
                <div className="text-center z-20 w-full px-2">
                  <p className="font-bold underline text-[12px] leading-normal whitespace-nowrap overflow-hidden text-ellipsis">
                    {officialKaprodi?.lecturer?.nama || "..."}
                  </p>
                  <p className="font-bold text-[11px] leading-normal whitespace-nowrap mt-0.5">
                    NIDN. {officialKaprodi?.lecturer?.nidn || "..."}
                  </p>
                </div>
              </div>

              {/* Kanan: Ketua STMIK */}
              <div className="flex flex-col items-center w-[45%] text-center">
                <p className="mb-0 leading-tight">Mengetahui,</p>
                <p className="font-normal mb-1 leading-tight text-center">
                  {officialKetua?.jabatan || "Ketua STMIK IKMI Cirebon"}
                </p>
                <div
                  className="relative w-full h-20 my-1 flex items-center justify-center select-none"
                  onContextMenu={(e) => e.preventDefault()}
                >
                  {signatureType !== "none" && getSignatureUrl(officialKetua) && (
                    <img
                      src={getSignatureUrl(officialKetua)!}
                      alt="TTD Ketua STMIK"
                      className={`absolute max-h-24 object-contain z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mix-blend-multiply pointer-events-none select-none ${
                        signatureType === "basah" ? "scale-[1.5]" : "scale-[1.2]"
                      }`}
                      draggable={false}
                    />
                  )}
                </div>
                <div className="text-center z-20 w-full px-2">
                  <p className="font-bold underline text-[12px] leading-normal whitespace-nowrap overflow-hidden text-ellipsis">
                    {officialKetua?.lecturer?.nama || "..."}
                  </p>
                  <p className="font-bold text-[11px] leading-normal whitespace-nowrap mt-0.5">
                    NIDN. {officialKetua?.lecturer?.nidn || "..."}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
});

PrintableSKL.displayName = "PrintableSKL";
export default PrintableSKL;
