import React, { useState, useEffect } from "react";
import { Official } from "@/lib/types";

interface DocumentFooterProps {
  signatureType: "basah" | "digital" | "none";
  signatureBase64: string | null;
  mode?: "transkrip" | "khs" | "surat" | "krs"; // Tambahkan mode 'krs'
  official?: Official | null; 
}

export default function DocumentFooter({ 
  signatureType, 
  signatureBase64, 
  mode = "transkrip",
  official
}: DocumentFooterProps) {
  const [tanggal, setTanggal] = useState("");

  useEffect(() => {
    setTanggal(new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date()));
  }, []);

  const namaPejabat = official?.lecturer?.nama || "...";
  const nidnPejabat = official?.lecturer?.nidn || "...";
  const jabatanPejabat = official?.jabatan || "Ketua Program Studi";

  return (
    <div className="flex justify-between items-start mt-6 text-[10px] w-full font-caladea">
      
      {/* Keterangan Kiri */}
      {mode === "surat" ? (
        <div /> 
      ) : (
        <div className="mt-0 pl-1">
          <p className="font-bold underline mb-1">Keterangan</p>
          <div className="grid grid-cols-[70px_10px_1fr] leading-tight">
            {/* SMT muncul di Transkrip dan KRS */}
            {(mode === "transkrip" || mode === "krs") && (
              <>
                <div>SMT</div> <div>:</div> <div>Semester</div>
              </>
            )}
            
            {/* SKS muncul di semua (Transkrip, KHS, KRS) */}
            <div>SKS</div> <div>:</div> <div>Satuan Kredit Semester</div>

            {/* HM, AM, NM TIDAK muncul di KRS */}
            {mode !== "krs" && (
                <>
                    <div>HM</div> <div>:</div> <div>Huruf Mutu</div>
                    <div>AM</div> <div>:</div> <div>Angka Mutu</div>
                    <div>NM</div> <div>:</div> <div>Nilai Mutu</div>
                </>
            )}
          </div>
        </div>
      )}

      {/* Area Tanda Tangan Kanan */}
      <div className="flex flex-col items-center w-fit mt-0 pr-1">
        <p className="mb-0 leading-tight">
          Cirebon, {tanggal || "..."}
        </p>
        <p className="font-normal mb-1 leading-tight text-center max-w-[200px]">
          {jabatanPejabat}
        </p>

        <div 
          className="relative w-32 h-24 my-1 flex items-center justify-center select-none"
          onContextMenu={(e) => e.preventDefault()} 
        >
          {signatureType !== "none" && signatureBase64 && (
            <img
              src={signatureBase64}
              alt="Tanda Tangan"
              className={`absolute w-full h-full object-contain z-10 top-0 left-0 mix-blend-multiply translate-y-[-20px] pointer-events-none select-none ${
                signatureType === "basah" ? "scale-[1.6]" : "scale-[1.3]"
              }`} 
              draggable={false}
            />
          )}
        </div>

        <div className="text-center z-20 mt-[-35px] relative">
          <p className="font-bold underline text-[11px] leading-none">
            {namaPejabat}
          </p>
          <p className="font-bold text-[10px] leading-tight">
            NIDN. {nidnPejabat}
          </p>
        </div>
      </div>
    </div>
  );
}