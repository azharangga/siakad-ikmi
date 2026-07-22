"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { toast } from "sonner";
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
import { Printer, Loader2, GraduationCap, Users, Lock, FileText, CheckCircle2, Download, AlertTriangle, PenTool } from "lucide-react";

import { getOfficialForDocument } from "@/app/actions/students";
import { StudentData, StudyProgram, Official, SidangSkripsi, PredikatYudisium } from "@/lib/types";
import { StudentTable } from "@/components/features/nilai/StudentTable";
import { useLayout } from "@/app/context/LayoutContext";
import { usePdfPrint } from "@/hooks/use-pdf-print";
import { calculateIPK, calculateTotalSKSLulus } from "@/lib/grade-calculations";
import PrintableSKL from "@/components/features/surat-keterangan-lulus/PrintableSKL";

import { useSignature } from "@/hooks/useSignature";
import { useToastMessage } from "@/hooks/use-toast-message";

interface AdminSKLViewProps {
  initialStudents: StudentData[];
  initialStudyPrograms: StudyProgram[];
  officialKetua: Official | null;
  sidangMap: Record<string, SidangSkripsi>;
  predikatList: PredikatYudisium[];
}

function getRomanMonth(monthIndex: number): string {
  const map = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  return map[monthIndex] || "I";
}

export function generateNomorSuratSKL(student: StudentData, index: number): string {
  const seq = String(index + 1).padStart(3, "0");
  const prodiKode = (student.profile?.study_program?.kode || "TI").toUpperCase().trim();
  const date = new Date();
  const romanMonth = getRomanMonth(date.getMonth());
  const year = date.getFullYear();

  return `${seq}/SKL/PRODI-${prodiKode}/STMIK-IKMI/${romanMonth}/${year}`;
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

function getIPKYudisium(student: StudentData): string {
  const allGraded = student.transcript.filter((t) => t.hm !== "-");
  return calculateIPK(allGraded);
}

function getPredikat(ipk: number, list: PredikatYudisium[]): string {
  const found = list.find((p) => ipk >= p.ipk_min && ipk <= p.ipk_max);
  return found?.label || "-";
}

export default function AdminSKLView({
  initialStudents,
  initialStudyPrograms,
  officialKetua,
  sidangMap,
  predikatList,
}: AdminSKLViewProps) {
  const { isCollapsed } = useLayout();

  const studentList = useMemo(() => {
    return initialStudents;
  }, [initialStudents]);

  const [studyPrograms] = useState<StudyProgram[]>(initialStudyPrograms);
  const [officialKaprodi, setOfficialKaprodi] = useState<Official | null>(null);

  // Modal state
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
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

  const [nomorSurat, setNomorSurat] = useState("");

  // Download all state
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const { isPrinting, printPdf, generatePdfBlob } = usePdfPrint();
  const printRef = useRef<HTMLDivElement>(null);

  // Derived data for selected student
  const selectedSidang = selectedStudent ? sidangMap[selectedStudent.id] : null;
  const selectedIPK = selectedStudent ? getIPKYudisium(selectedStudent) : "0.00";
  const selectedPredikat = selectedStudent ? getPredikat(parseFloat(selectedIPK), predikatList) : "-";
  const selectedNilaiSkripsi = selectedStudent ? getNilaiSkripsi(selectedStudent) : "-";

  const handleOpenPrintModal = async (student: StudentData) => {
    setSelectedStudent(student);
    const index = studentList.findIndex((s) => s.id === student.id);
    const autoNomor = generateNomorSuratSKL(student, index >= 0 ? index : 0);
    setNomorSurat(autoNomor);

    setIsPrintModalOpen(true);
    if (student.profile.study_program_id) {
      const off = await getOfficialForDocument(student.profile.study_program_id);
      setOfficialKaprodi(off);
    }
  };

  const handlePrintProcess = async () => {
    await printPdf({
      elementRef: printRef,
      fileName: `SKL_${selectedStudent?.profile?.nim || "Mahasiswa"}.pdf`,
      pdfFormat: "a4",
      pdfOrientation: "portrait",
    });
    setIsPrintModalOpen(false);
  };

  // Download semua SKL sekaligus
  const handleDownloadAll = async () => {
    if (studentList.length === 0) return;
    setIsDownloadingAll(true);
    setDownloadProgress(0);

    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();

    for (let i = 0; i < studentList.length; i++) {
      const student = studentList[i];
      setDownloadProgress(Math.round(((i + 1) / studentList.length) * 100));

      let kaprodi: Official | null = null;
      if (student.profile.study_program_id) {
        kaprodi = await getOfficialForDocument(student.profile.study_program_id);
      }

      const sidang = sidangMap[student.id];
      const ipk = getIPKYudisium(student);
      const pred = getPredikat(parseFloat(ipk), predikatList);
      const nilai = getNilaiSkripsi(student);
      const autoNomor = generateNomorSuratSKL(student, i);

      const container = document.createElement("div");
      container.style.position = "absolute";
      container.style.top = "0";
      container.style.left = "-9999px";
      container.style.width = "210mm";
      document.body.appendChild(container);

      const { createRoot } = await import("react-dom/client");
      const root = createRoot(container);

      await new Promise<void>((resolve) => {
        root.render(
          React.createElement(PrintableSKL, {
            loading: false,
            currentStudent: student,
            officialKaprodi: kaprodi,
            officialKetua: officialKetua,
            nomorSurat: autoNomor,
            hariSidang: sidang?.hari_sidang || "",
            tanggalSidang: sidang
              ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(
                  new Date(sidang.tanggal_sidang)
                )
              : "",
            nilaiSidang: nilai,
            ipkYudisium: ipk,
            predikat: pred,
            signatureType: "none",
            isCollapsed: true,
          })
        );
        setTimeout(resolve, 300);
      });

      const blob = await generatePdfBlob({
        elementRef: { current: container as HTMLDivElement },
        fileName: `SKL_${student.profile.nim}.pdf`,
        pdfFormat: "a4",
        pdfOrientation: "portrait",
      });

      if (blob) {
        zip.file(`SKL_${student.profile.nim}_${student.profile.nama.replace(/\s+/g, "_")}.pdf`, blob);
      }

      root.unmount();
      document.body.removeChild(container);
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `SKL_Mahasiswa_Lulus_${new Date().toISOString().slice(0, 10)}.zip`;
    link.click();
    URL.revokeObjectURL(url);

    setIsDownloadingAll(false);
    setDownloadProgress(0);
    toast.success(`Berhasil mengunduh ${studentList.length} SKL.`);
  };

  const hasAnySignature =
    officialKaprodi?.ttd_basah_url || officialKaprodi?.ttd_digital_url ||
    officialKetua?.ttd_basah_url || officialKetua?.ttd_digital_url;

  return (
    <>
      {/* HIDDEN PRINT ELEMENT */}
      {selectedStudent && (
        <div className="absolute top-0 left-[-9999px] w-[210mm]">
          <PrintableSKL
            ref={printRef}
            loading={false}
            currentStudent={selectedStudent}
            officialKaprodi={officialKaprodi}
            officialKetua={officialKetua}
            nomorSurat={nomorSurat}
            hariSidang={selectedSidang?.hari_sidang || ""}
            tanggalSidang={
              selectedSidang
                ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(
                    new Date(selectedSidang.tanggal_sidang)
                  )
                : ""
            }
            nilaiSidang={selectedNilaiSkripsi}
            ipkYudisium={selectedIPK}
            predikat={selectedPredikat}
            signatureType={signatureType}
            isCollapsed={true}
          />
        </div>
      )}

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-none shadow-md text-white overflow-hidden relative bg-gradient-to-br from-emerald-600 to-teal-800">
          <div className="absolute -bottom-6 -right-6 opacity-15 rotate-12 pointer-events-none">
            <GraduationCap size={140} />
          </div>
          <CardContent className="p-5 flex items-center gap-4 relative z-10">
            <div className="p-3.5 bg-white/10 rounded-xl border border-white/15 backdrop-blur-sm shrink-0">
              <GraduationCap className="h-7 w-7 text-white" />
            </div>
            <div>
              <p className="text-emerald-100 text-sm font-medium mb-0.5">Mahasiswa Lulus</p>
              <p className="text-3xl font-extrabold text-white tracking-tight">{studentList.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md text-white overflow-hidden relative bg-gradient-to-br from-blue-700 to-indigo-900">
          <div className="absolute -bottom-6 -right-6 opacity-15 rotate-12 pointer-events-none">
            <Users size={140} />
          </div>
          <CardContent className="p-5 flex items-center gap-4 relative z-10">
            <div className="p-3.5 bg-white/10 rounded-xl border border-white/15 backdrop-blur-sm shrink-0">
              <Users className="h-7 w-7 text-white" />
            </div>
            <div>
              <p className="text-blue-100 text-sm font-medium mb-0.5">Sudah Mengikuti Sidang</p>
              <p className="text-3xl font-extrabold text-white tracking-tight">
                {studentList.filter((s) => !!sidangMap[s.id]).length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TABLE */}
      <Card className="border-none shadow-sm ring-1 ring-gray-200">
        <CardContent className="p-4 sm:p-6">
          <StudentTable
            data={studentList}
            studyPrograms={studyPrograms}
            isLoading={false}
            onEdit={handleOpenPrintModal}
            actionLabel="Cetak SKL"
            actionIcon={<Printer className="w-3.5 h-3.5" />}
            customActions={
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-border text-foreground font-medium rounded-lg hover:bg-muted/80 bg-background shadow-2xs h-9 px-3.5"
                onClick={handleDownloadAll}
                disabled={isDownloadingAll || studentList.length === 0}
              >
                {isDownloadingAll ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    Memproses ({downloadProgress}%)
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-foreground" />
                    Unduh Semua
                  </>
                )}
              </Button>
            }
          />
        </CardContent>
      </Card>

      {/* MODAL CETAK SKL */}
      <Dialog open={isPrintModalOpen} onOpenChange={setIsPrintModalOpen}>
        <DialogContent className="sm:max-w-lg border border-border shadow-xl">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <FileText className="w-5 h-5 text-primary" />
              Cetak Surat Keterangan Lulus (SKL)
            </DialogTitle>
          </DialogHeader>

          {selectedStudent && (
            <div className="space-y-4 py-2 text-sm">
              {/* Card Ringkasan Mahasiswa */}
              {(() => {
                const totalSks = selectedStudent ? calculateTotalSKSLulus(selectedStudent.transcript) : 0;
                const jenjang = selectedStudent?.profile?.study_program?.jenjang || "S1";
                const targetSks = jenjang.includes("D3") ? 108 : 144;
                const hasEnough = totalSks >= targetSks;

                return (
                  <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-base text-foreground">{selectedStudent.profile.nama}</p>
                      {hasEnough ? (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> SKS Terpenuhi ({totalSks}/{targetSks})
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Belum Cukup SKS ({totalSks}/{targetSks})
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">NIM: {selectedStudent.profile.nim}</p>
                    <p className="text-xs font-medium text-primary">
                      {selectedStudent.profile.study_program?.nama || "-"} ({jenjang})
                    </p>
                  </div>
                );
              })()}

              {/* Rincian Nilai */}
              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="rounded-lg border bg-background p-2.5">
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground">Nilai Skripsi</p>
                  <p className="font-bold text-sm text-foreground mt-0.5">{selectedNilaiSkripsi}</p>
                </div>
                <div className="rounded-lg border bg-background p-2.5">
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground">IPK Yudisium</p>
                  <p className="font-bold text-sm text-primary mt-0.5">{selectedIPK}</p>
                </div>
                <div className="rounded-lg border bg-background p-2.5">
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground">Predikat</p>
                  <p className="font-bold text-xs text-foreground mt-0.5 truncate">{selectedPredikat}</p>
                </div>
              </div>

              {/* Info Sidang */}
              {selectedSidang ? (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs space-y-0.5 text-emerald-700 dark:text-emerald-300">
                  <p className="font-semibold">Tanggal Sidang Skripsi</p>
                  <p>
                    {selectedSidang.hari_sidang},{" "}
                    {new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(
                      new Date(selectedSidang.tanggal_sidang)
                    )}
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                  <p>Jadwal sidang skripsi belum diisi. Tanggal sidang akan kosong pada dokumen SKL.</p>
                </div>
              )}

              {/* Nomor Surat */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-primary" /> Nomor Surat
                </Label>
                <Input
                  value={nomorSurat}
                  readOnly
                  disabled
                  className="h-10 font-mono text-xs font-bold bg-slate-50 border-slate-200 text-slate-700 cursor-not-allowed select-all w-full"
                />
              </div>

              {/* Tanda Tangan */}
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
                      {(officialKaprodi?.ttd_basah_url || officialKetua?.ttd_basah_url) && (
                        <SelectItem value="basah">Tanda tangan basah</SelectItem>
                      )}
                      {(officialKaprodi?.ttd_digital_url || officialKetua?.ttd_digital_url) && (
                        <SelectItem value="digital">Tanda tangan digital</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-2 border-t mt-2">
            <Button variant="outline" size="sm" onClick={() => setIsPrintModalOpen(false)} disabled={isPrinting}>
              Batal
            </Button>
            <Button size="sm" onClick={handlePrintProcess} disabled={isPrinting || isSigLoading} className="gap-1.5">
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
