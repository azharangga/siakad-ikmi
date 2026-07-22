"use client";

import React, { useState, useMemo, useRef } from "react";
import { type StudentData, type Official, type SidangSkripsi, type PredikatYudisium } from "@/lib/types";
import { useLayout } from "@/app/context/LayoutContext";
import { usePdfPrint } from "@/hooks/use-pdf-print";
import { calculateIPK, calculateTotalSKSLulus } from "@/lib/grade-calculations";
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
import { Printer, Loader2, GraduationCap, Award, BookOpen, Lock, Sparkles, PenTool, CheckCircle } from "lucide-react";
import PrintableSKL from "@/components/features/surat-keterangan-lulus/PrintableSKL";
import { generateNomorSuratSKL } from "@/components/features/surat-keterangan-lulus/AdminSKLView";

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
  const { isPrinting, printPdf } = usePdfPrint();
  const printRef = useRef<HTMLDivElement>(null);

  const student = initialStudentData;

  const autoNomorSurat = useMemo(() => {
    if (!student) return "";
    return generateNomorSuratSKL(student, 0);
  }, [student]);

  const ipk = useMemo(() => {
    if (!student) return "0.00";
    const graded = student.transcript.filter((t) => t.hm !== "-");
    return calculateIPK(graded);
  }, [student]);

  const nilaiSkripsi = useMemo(() => (student ? getNilaiSkripsi(student) : "-"), [student]);
  const predikat = useMemo(() => getPredikat(parseFloat(ipk), predikatList), [ipk, predikatList]);

  const totalSksLulus = useMemo(() => {
    if (!student) return 0;
    return calculateTotalSKSLulus(student.transcript);
  }, [student]);

  const jenjang = student?.profile?.study_program?.jenjang || "S1";
  const targetSKS = jenjang.includes("D3") ? 108 : 144;
  const hasEnoughSKS = totalSksLulus >= targetSKS;

  const hasSmt8 = useMemo(
    () => !!student?.transcript.some((t) => Number(t.smt) === 8 && t.hm && t.hm !== "-"),
    [student]
  );

  const isLulus = useMemo(
    () => (student?.profile?.status || "").toUpperCase().trim() === "LULUS",
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
          <GraduationCap className="h-12 w-12 mx-auto mb-3 text-gray-400 opacity-60" />
          <p className="font-semibold text-lg text-foreground">Surat Keterangan Lulus (SKL) Belum Tersedia</p>
          <p className="text-sm mt-2 max-w-lg mx-auto leading-relaxed text-muted-foreground">
            Surat Keterangan Lulus (SKL) belum dapat diakses. SKL baru dapat diakses dan dicetak secara mandiri setelah seluruh nilai mata kuliah Semester 8 telah diinputkan oleh Bagian Administrasi Akademik (BAAK).
          </p>
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
            nomorSurat={autoNomorSurat}
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

      <div className="space-y-6">
        {/* HERO BANNER KELULUSAN */}
        <div className="bg-gradient-to-r from-blue-700 via-primary to-indigo-800 text-white rounded-2xl p-6 sm:p-8 shadow-md relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold tracking-wide text-white border border-white/20">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Kelulusan Resmi Terverifikasi
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Selamat Atas Kelulusan Anda!</h2>
            <p className="text-sm text-blue-100 max-w-2xl leading-relaxed">
              Anda telah menyelesaikan seluruh rangkaian studi akademik di STMIK IKMI Cirebon dengan predikat <strong className="text-white underline decoration-amber-400 decoration-2">{predikat}</strong>. Surat Keterangan Lulus (SKL) resmi dapat diunduh dan dicetak secara mandiri di bawah ini.
            </p>
          </div>
          <Button onClick={() => setIsPrintModalOpen(true)} size="lg" className="bg-white text-primary hover:bg-blue-50 font-bold shadow-lg gap-2 shrink-0 h-12 px-6 rounded-xl transition-all border border-white/30">
            <Printer className="w-4 h-4 text-primary" /> Cetak SKL
          </Button>
        </div>

        {/* CARD DETAIL SKL MAHASISWA */}
        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardContent className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800">{student.profile.nama}</h2>
                <p className="text-sm text-slate-500 font-mono">NIM: {student.profile.nim}</p>
                <p className="text-sm text-primary font-semibold mt-0.5">
                  {student.profile.study_program?.nama || "-"} ({student.profile.study_program?.jenjang || "-"})
                </p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" /> Status: Tamat / Lulus Studi
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border bg-slate-50 flex flex-col items-center text-center">
                <BookOpen className="w-5 h-5 text-primary mb-1" />
                <span className="text-xs text-slate-500 uppercase font-semibold">Nilai Skripsi</span>
                <span className="text-xl font-extrabold text-slate-800 mt-1">{nilaiSkripsi}</span>
              </div>
              <div className="p-4 rounded-xl border bg-slate-50 flex flex-col items-center text-center">
                <Award className="w-5 h-5 text-emerald-600 mb-1" />
                <span className="text-xs text-slate-500 uppercase font-semibold">IPK Yudisium</span>
                <span className="text-xl font-extrabold text-slate-800 mt-1">{ipk}</span>
              </div>
              <div className="p-4 rounded-xl border bg-slate-50 flex flex-col items-center text-center">
                <GraduationCap className="w-5 h-5 text-amber-600 mb-1" />
                <span className="text-xs text-slate-500 uppercase font-semibold">Predikat</span>
                <span className="text-base font-extrabold text-slate-800 mt-1 truncate max-w-full">{predikat}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MODAL CETAK MAHASISWA */}
      <Dialog open={isPrintModalOpen} onOpenChange={setIsPrintModalOpen}>
        <DialogContent className="sm:max-w-md border border-border shadow-xl">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <Printer className="w-5 h-5 text-primary" />
              Cetak Surat Keterangan Lulus
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">
            {/* Nomor Surat Readonly */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-primary" /> Nomor Surat
              </Label>
              <Input
                value={autoNomorSurat}
                readOnly
                disabled
                className="h-10 font-mono text-xs font-bold bg-slate-50 border-slate-200 text-slate-700 cursor-not-allowed select-all w-full"
              />
            </div>

            {hasAnySignature && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <PenTool className="w-3.5 h-3.5 text-primary" /> Opsi Tanda Tangan
                </Label>
                <Select value={signatureType} onValueChange={(v) => setSignatureType(v as "basah" | "digital" | "none")}>
                  <SelectTrigger className="w-full h-10 text-xs font-medium border-slate-200">
                    <SelectValue placeholder="Pilih Opsi Tanda Tangan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tanpa tanda tangan</SelectItem>
                    {(initialOfficialKaprodi?.ttd_basah_url || initialOfficialKetua?.ttd_basah_url) && (
                      <SelectItem value="basah">Tanda tangan basah</SelectItem>
                    )}
                    {(initialOfficialKaprodi?.ttd_digital_url || initialOfficialKetua?.ttd_digital_url) && (
                      <SelectItem value="digital">Tanda tangan digital</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t mt-2">
            <Button variant="outline" size="sm" onClick={() => setIsPrintModalOpen(false)} disabled={isPrinting}>
              Batal
            </Button>
            <Button size="sm" onClick={handlePrint} disabled={isPrinting} className="gap-1.5">
              {isPrinting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Memproses...</>
              ) : (
                <><Printer className="w-4 h-4" /> Cetak PDF</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
