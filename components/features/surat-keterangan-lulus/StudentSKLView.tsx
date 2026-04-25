"use client";

import React, { useState, useMemo, useRef } from "react";
import { type StudentData, type Official, type SidangSkripsi, type PredikatYudisium, type TranscriptItem } from "@/lib/types";
import { useLayout } from "@/app/context/LayoutContext";
import { usePdfPrint } from "@/hooks/use-pdf-print";
import { calculateIPK } from "@/lib/grade-calculations";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Printer, Loader2, GraduationCap, Award, BookOpen, CalendarDays } from "lucide-react";
import PrintableSKL from "@/components/features/surat-keterangan-lulus/PrintableSKL";

interface StudentSKLViewProps {
  initialStudentData: StudentData | null;
  initialOfficialKaprodi: Official | null;
  initialOfficialKetua: Official | null;
  sidang: SidangSkripsi | null;
  predikatList: PredikatYudisium[];
}

function getNilaiSkripsi(student: StudentData): string {
  const smt8 = student.transcript.filter((t) => Number(t.smt) === 8 && t.hm !== "-");
  const skripsi = smt8.find(
    (t) =>
      t.matkul.toLowerCase().includes("skripsi") ||
      t.matkul.toLowerCase().includes("tugas akhir") ||
      t.matkul.toLowerCase().includes("ta")
  );
  return skripsi?.hm || smt8[0]?.hm || "-";
}

function getPredikat(ipk: number, list: PredikatYudisium[]): string {
  const found = list.find((p) => ipk >= p.ipk_min && ipk <= p.ipk_max);
  return found?.label || "-";
}

export default function StudentSKLView({
  initialStudentData,
  initialOfficialKaprodi,
  initialOfficialKetua,
  sidang,
  predikatList,
}: StudentSKLViewProps) {
  const { isCollapsed } = useLayout();
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [signatureType, setSignatureType] = useState<"basah" | "digital" | "none">("none");
  const [nomorSurat, setNomorSurat] = useState("");
  const { isPrinting, printPdf } = usePdfPrint();
  const printRef = useRef<HTMLDivElement>(null);

  const student = initialStudentData;

  const ipk = useMemo(() => {
    if (!student) return "0.00";
    const graded = student.transcript.filter((t) => t.hm !== "-");
    return calculateIPK(graded);
  }, [student]);

  const nilaiSkripsi = useMemo(() => (student ? getNilaiSkripsi(student) : "-"), [student]);
  const predikat = useMemo(() => getPredikat(parseFloat(ipk), predikatList), [ipk, predikatList]);

  const hasSmt8 = useMemo(
    () => !!student?.transcript.some((t) => Number(t.smt) === 8 && t.hm !== "-"),
    [student]
  );

  const tanggalSidangDisplay = sidang
    ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(
        new Date(sidang.tanggal_sidang)
      )
    : "";

  const handlePrint = async () => {
    await printPdf({
      elementRef: printRef,
      fileName: `SKL_${student?.profile?.nim || "Mahasiswa"}.pdf`,
      pdfFormat: "a4",
      pdfOrientation: "portrait",
    });
    setIsPrintModalOpen(false);
  };

  const hasAnySignature =
    initialOfficialKaprodi?.ttd_basah_url || initialOfficialKaprodi?.ttd_digital_url ||
    initialOfficialKetua?.ttd_basah_url || initialOfficialKetua?.ttd_digital_url;

  if (!student || !hasSmt8) {
    return (
      <Card className="border-none shadow-sm ring-1 ring-gray-200">
        <CardContent className="p-8 text-center text-muted-foreground">
          <GraduationCap className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">SKL belum tersedia</p>
          <p className="text-sm mt-1">Surat Keterangan Lulus hanya dapat dicetak setelah nilai semester 8 telah diinput.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* HIDDEN PRINT */}
      <div className="absolute top-0 left-[-9999px] w-[210mm]">
        {isPrintModalOpen && (
          <PrintableSKL
            ref={printRef}
            loading={false}
            currentStudent={student}
            officialKaprodi={initialOfficialKaprodi}
            officialKetua={initialOfficialKetua}
            nomorSurat={nomorSurat}
            hariSidang={sidang?.hari_sidang || ""}
            tanggalSidang={tanggalSidangDisplay}
            nilaiSidang={nilaiSkripsi}
            ipkYudisium={ipk}
            predikat={predikat}
            signatureType={signatureType}
            isCollapsed={true}
          />
        )}
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none shadow-md text-white bg-gradient-to-br from-blue-700 to-blue-900">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-xl"><Award className="h-7 w-7" /></div>
            <div>
              <p className="text-blue-100 text-xs">IPK Yudisium</p>
              <p className="text-3xl font-extrabold">{parseFloat(ipk).toFixed(2)}</p>
              <p className="text-blue-200 text-xs">{predikat}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md text-white bg-gradient-to-br from-emerald-600 to-emerald-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-xl"><BookOpen className="h-7 w-7" /></div>
            <div>
              <p className="text-emerald-100 text-xs">Nilai Skripsi</p>
              <p className="text-3xl font-extrabold">{nilaiSkripsi}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md text-white bg-gradient-to-br from-violet-600 to-violet-900">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-xl"><CalendarDays className="h-7 w-7" /></div>
            <div>
              <p className="text-violet-100 text-xs">Tanggal Sidang</p>
              {sidang ? (
                <>
                  <p className="font-bold text-sm leading-tight">{sidang.hari_sidang}</p>
                  <p className="text-violet-200 text-xs">{tanggalSidangDisplay}</p>
                </>
              ) : (
                <p className="text-violet-200 text-xs">Belum dijadwalkan</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CETAK BUTTON */}
      <Card className="border-none shadow-sm ring-1 ring-gray-200">
        <CardContent className="p-6 flex items-center justify-between">
          <div>
            <p className="font-semibold">Surat Keterangan Lulus</p>
            <p className="text-sm text-muted-foreground">Data diambil otomatis dari nilai dan jadwal sidang.</p>
          </div>
          <Button onClick={() => setIsPrintModalOpen(true)} className="gap-2">
            <Printer className="h-4 w-4" />
            Cetak SKL
          </Button>
        </CardContent>
      </Card>

      {/* MODAL */}
      <Dialog open={isPrintModalOpen} onOpenChange={setIsPrintModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Opsi Cetak SKL</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-4">
            <div className="space-y-1.5">
              <Label>Nomor Surat</Label>
              <Input value={nomorSurat} onChange={(e) => setNomorSurat(e.target.value)} placeholder="Contoh: 001" className="h-9" />
            </div>
            {hasAnySignature && (
              <div className="space-y-1.5">
                <Label>Tanda Tangan</Label>
                <Select value={signatureType} onValueChange={(v) => setSignatureType(v as "basah" | "digital" | "none")}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tanpa tanda tangan</SelectItem>
                    {(initialOfficialKaprodi?.ttd_basah_url || initialOfficialKetua?.ttd_basah_url) && (
                      <SelectItem value="basah">Tanda tangan basah</SelectItem>
                    )}
                    {(initialOfficialKaprodi?.ttd_digital_url || initialOfficialKetua?.ttd_digital_url) && (
                      <SelectItem value="digital">Tanda tangan digital (QR)</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsPrintModalOpen(false)} disabled={isPrinting}>Batal</Button>
            <Button onClick={handlePrint} disabled={isPrinting}>
              {isPrinting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Memproses...</> : <><Printer className="w-4 h-4 mr-2" /> Cetak PDF</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
