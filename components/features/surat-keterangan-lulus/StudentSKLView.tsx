"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
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
import { Printer, Loader2, GraduationCap, Award, BookOpen, Lock, PenTool, CheckCircle, FileText, User } from "lucide-react";
import { useSignature } from "@/hooks/useSignature";
import { useToastMessage } from "@/hooks/use-toast-message";
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
  const { signatureType, setSignatureType, isLoading: isSigLoading } = useSignature("none");
  const { showLoading, dismiss } = useToastMessage();
  const toastIdRef = useRef<string | number | null>(null);

  useEffect(() => {
    if (isSigLoading) {
      if (!toastIdRef.current) toastIdRef.current = showLoading("Menyiapkan dokumen...");
    } else {
      if (toastIdRef.current) {
        dismiss(toastIdRef.current);
        toastIdRef.current = null;
      }
    }
  }, [isSigLoading]);

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
        {/* HEADER HERO BANNER */}
        <div className="bg-gradient-to-br from-blue-800 to-blue-900 text-white rounded-2xl p-6 sm:p-8 shadow-md relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-blue-700/50">
          <div className="absolute -bottom-8 -right-8 opacity-15 rotate-12 pointer-events-none text-white">
            <GraduationCap size={200} className="text-white" />
          </div>
          <div className="space-y-2 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-md text-xs font-medium text-white border border-white/15">
              <CheckCircle className="w-3.5 h-3.5 text-white" /> Status Kelulusan Resmi
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">Selamat Atas Kelulusan Anda!</h2>
            <p className="text-sm text-blue-100 max-w-2xl leading-relaxed font-normal">
              Anda telah menyelesaikan seluruh rangkaian studi akademik di STMIK IKMI Cirebon dengan predikat{" "}
              <strong className="text-white underline decoration-amber-400 decoration-2 underline-offset-4 font-bold">{predikat}</strong>. Dokumen Surat Keterangan Lulus (SKL) dapat diunduh dan dicetak secara mandiri.
            </p>
          </div>
          <Button onClick={() => setIsPrintModalOpen(true)} size="lg" className="bg-white text-blue-950 hover:bg-blue-50 font-bold shadow-md gap-2 shrink-0 h-11 px-6 rounded-xl transition-all border border-white/30 relative z-10">
            <Printer className="w-4 h-4 text-blue-950" /> Cetak SKL
          </Button>
        </div>

        {/* SUMMARY METRICS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: IPK Yudisium */}
          <Card className="border-none shadow-md text-white overflow-hidden relative bg-gradient-to-br from-blue-800 to-blue-900">
            <div className="absolute -bottom-6 -right-6 opacity-15 rotate-12 pointer-events-none text-white">
              <Award size={130} className="text-white" />
            </div>
            <CardContent className="p-5 flex flex-col justify-between h-full relative z-10">
              <div>
                <p className="text-blue-100 text-xs font-semibold uppercase tracking-wider mb-1">IPK Yudisium</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-extrabold text-white tracking-tight">{ipk.replace('.', ',')}</h3>
                  <span className="text-sm text-blue-200 font-medium">/ 4,00</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-white" />
                <span className="text-xs font-medium text-blue-100">Predikat: <strong className="text-white font-bold">{predikat}</strong></span>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Nilai Sidang & Skripsi */}
          <Card className="border-none shadow-md text-white overflow-hidden relative bg-gradient-to-br from-blue-800 to-blue-900">
            <div className="absolute -bottom-6 -right-6 opacity-15 rotate-12 pointer-events-none text-white">
              <BookOpen size={130} className="text-white" />
            </div>
            <CardContent className="p-5 flex flex-col justify-between h-full relative z-10">
              <div>
                <p className="text-blue-100 text-xs font-semibold uppercase tracking-wider mb-1">Nilai Sidang Skripsi</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-extrabold text-white tracking-tight">{nilaiSkripsi}</h3>
                  <span className="text-xs text-blue-200 font-medium">(Ujian Sidang Skripsi)</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2">
                <FileText className="w-4 h-4 text-white" />
                <span className="text-xs font-medium text-blue-100">Tgl Sidang: {tanggalSidangDisplay || "-"}</span>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Total SKS Lulus */}
          <Card className="border-none shadow-md text-white overflow-hidden relative bg-gradient-to-br from-emerald-600 to-teal-700">
            <div className="absolute -bottom-6 -right-6 opacity-15 rotate-12 pointer-events-none text-white">
              <CheckCircle size={130} className="text-white" />
            </div>
            <CardContent className="p-5 flex flex-col justify-between h-full relative z-10">
              <div>
                <p className="text-emerald-100 text-xs font-semibold uppercase tracking-wider mb-1">Total SKS Lulus</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-extrabold text-white tracking-tight">{totalSksLulus}</h3>
                  <span className="text-sm text-emerald-100 font-medium">/ {targetSKS} SKS</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-white" />
                <span className="text-xs font-medium text-emerald-100">Syarat Kelulusan Terpenuhi</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* DETAIL BIODATA MAHASISWA & SKL */}
        <Card className="border-none shadow-sm ring-1 ring-slate-200">
          <CardContent className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800">{student.profile.nama}</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">NIM: {student.profile.nim}</p>
                <p className="text-xs text-primary font-semibold mt-0.5">
                  {student.profile.study_program?.nama || "-"} ({student.profile.study_program?.jenjang || "-"})
                </p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold shrink-0 shadow-xs">
                <CheckCircle className="w-4 h-4 text-white shrink-0" /> Status: Tamat / Lulus Studi
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
                <h4 className="font-semibold text-xs text-slate-500 uppercase tracking-wider">Informasi Surat</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Nomor Surat SKL:</span>
                    <span className="font-mono font-bold text-slate-800">{autoNomorSurat}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Tanggal Sidang:</span>
                    <span className="font-semibold text-slate-800">{tanggalSidangDisplay || "-"}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Hari Sidang:</span>
                    <span className="font-semibold text-slate-800">{sidang?.hari_sidang || "Jumat"}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
                <h4 className="font-semibold text-xs text-slate-500 uppercase tracking-wider">Hasil Akademik</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Indeks Prestasi Kumulatif:</span>
                    <span className="font-bold text-emerald-700">{ipk.replace('.', ',')} / 4,00</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Predikat Yudisium:</span>
                    <span className="font-semibold text-slate-800">{predikat}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Nilai Skripsi / TA:</span>
                    <span className="font-bold text-blue-700">{nilaiSkripsi}</span>
                  </div>
                </div>
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
              <div className="p-1.5 bg-blue-600 rounded-md flex items-center justify-center shrink-0">
                <Printer className="w-4 h-4 text-white" />
              </div>
              Cetak Surat Keterangan Lulus
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">
            {/* Nomor Surat Readonly */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <span className="p-1 bg-blue-600 rounded-sm text-white flex items-center justify-center">
                  <Lock className="w-3 h-3 text-white" />
                </span>
                Nomor Surat
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
                  <span className="p-1 bg-blue-600 rounded-sm text-white flex items-center justify-center">
                    <PenTool className="w-3 h-3 text-white" />
                  </span>
                  Opsi Tanda Tangan
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
            <Button size="sm" onClick={handlePrint} disabled={isPrinting || isSigLoading} className="gap-1.5">
              {isPrinting || isSigLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> {isPrinting ? "Memproses..." : "Memuat..."}</>
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
