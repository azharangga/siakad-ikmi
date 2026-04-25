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
import { Printer, Loader2, GraduationCap, Users, Download } from "lucide-react";

import { getOfficialForDocument } from "@/app/actions/students";
import { StudentData, StudyProgram, Official, TranscriptItem, SidangSkripsi, PredikatYudisium } from "@/lib/types";
import { StudentTable } from "@/components/features/nilai/StudentTable";
import { useLayout } from "@/app/context/LayoutContext";
import { usePdfPrint } from "@/hooks/use-pdf-print";
import { calculateIPK } from "@/lib/grade-calculations";
import PrintableSKL from "@/components/features/surat-keterangan-lulus/PrintableSKL";

interface AdminSKLViewProps {
  initialStudents: StudentData[];          // sudah difilter: hanya yg ada nilai smt 8
  initialStudyPrograms: StudyProgram[];
  officialKetua: Official | null;
  sidangMap: Record<string, SidangSkripsi>; // student_id -> sidang
  predikatList: PredikatYudisium[];
}

// Ambil nilai huruf mata kuliah skripsi di semester 8
function getNilaiSkripsi(student: StudentData): string {
  const smt8 = student.transcript.filter((t) => Number(t.smt) === 8 && t.hm !== "-");
  // Cari matkul yang namanya mengandung "skripsi" atau "tugas akhir"
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
  const [studentList] = useState<StudentData[]>(initialStudents);
  const [studyPrograms] = useState<StudyProgram[]>(initialStudyPrograms);
  const [officialKaprodi, setOfficialKaprodi] = useState<Official | null>(null);

  // Modal state
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
  const [signatureType, setSignatureType] = useState<"basah" | "digital" | "none">("none");
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

      // Fetch kaprodi for this student
      let kaprodi: Official | null = null;
      if (student.profile.study_program_id) {
        kaprodi = await getOfficialForDocument(student.profile.study_program_id);
      }

      const sidang = sidangMap[student.id];
      const ipk = getIPKYudisium(student);
      const pred = getPredikat(parseFloat(ipk), predikatList);
      const nilai = getNilaiSkripsi(student);

      // Render hidden element
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
            nomorSurat: String(i + 1).padStart(3, "0"),
            hariSidang: sidang?.hari_sidang || "",
            tanggalSidang: sidang
              ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(sidang.tanggal_sidang))
              : "",
            nilaiSidang: nilai,
            ipkYudisium: ipk,
            predikat: pred,
            signatureType: signatureType,
            isCollapsed: true,
          })
        );
        setTimeout(resolve, 600);
      });

      const el = container.querySelector("[data-skl-paper]") as HTMLElement || container.firstElementChild as HTMLElement;

      try {
        const blob = await generatePdfBlob({
          elementRef: { current: el },
          fileName: `SKL_${student.profile.nim}.pdf`,
          pdfFormat: "a4",
          pdfOrientation: "portrait",
        });
        if (blob) {
          zip.file(`SKL_${student.profile.nim}_${student.profile.nama}.pdf`, blob);
        }
      } catch (e) {
        console.error("Error generating PDF for", student.profile.nim, e);
      }

      root.unmount();
      document.body.removeChild(container);
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `SKL_Semua_${new Date().toISOString().slice(0, 10)}.zip`;
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
        <Card className="border-none shadow-md text-white overflow-hidden relative bg-gradient-to-br from-emerald-700 to-emerald-900">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-xl">
              <GraduationCap className="h-8 w-8" />
            </div>
            <div>
              <p className="text-emerald-100 text-sm">Mahasiswa Lulus Semester 8</p>
              <p className="text-3xl font-extrabold">{studentList.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md text-white overflow-hidden relative bg-gradient-to-br from-blue-700 to-blue-900">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-xl">
              <Users className="h-8 w-8" />
            </div>
            <div>
              <p className="text-blue-100 text-sm">Sudah Ada Jadwal Sidang</p>
              <p className="text-3xl font-extrabold">
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
            actionIcon={<Printer className="w-3.5 h-3.5 mr-2" />}
            customActions={
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadAll}
                disabled={isDownloadingAll || studentList.length === 0}
                className="h-9 gap-2"
              >
                {isDownloadingAll ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {downloadProgress}%
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Unduh Semua
                  </>
                )}
              </Button>
            }
          />
        </CardContent>
      </Card>

      {/* MODAL CETAK */}
      <Dialog open={isPrintModalOpen} onOpenChange={setIsPrintModalOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Cetak Surat Keterangan Lulus</DialogTitle>
          </DialogHeader>

          {selectedStudent && (
            <div className="py-2 space-y-4">
              {/* Info Mahasiswa */}
              <div className="rounded-lg bg-muted/40 p-3 space-y-1 text-sm">
                <p className="font-semibold">{selectedStudent.profile.nama}</p>
                <p className="text-muted-foreground font-mono">{selectedStudent.profile.nim}</p>
                <p className="text-muted-foreground">{selectedStudent.profile.study_program?.nama}</p>
              </div>

              {/* Info Otomatis */}
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-lg border p-2 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Nilai Skripsi</p>
                  <p className="font-bold text-lg">{selectedNilaiSkripsi}</p>
                </div>
                <div className="rounded-lg border p-2 text-center">
                  <p className="text-xs text-muted-foreground mb-1">IPK Yudisium</p>
                  <p className="font-bold text-lg">{parseFloat(selectedIPK).toFixed(2)}</p>
                </div>
                <div className="rounded-lg border p-2 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Predikat</p>
                  <p className="font-bold text-xs leading-tight">{selectedPredikat}</p>
                </div>
              </div>

              {/* Info Sidang */}
              {selectedSidang ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm space-y-1">
                  <p className="font-medium text-emerald-800">Jadwal Sidang Tersedia</p>
                  <p className="text-emerald-700">
                    {selectedSidang.hari_sidang},{" "}
                    {new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(
                      new Date(selectedSidang.tanggal_sidang)
                    )}
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                  <p className="text-amber-700">Jadwal sidang belum diisi. Tanggal sidang akan kosong di SKL.</p>
                </div>
              )}

              {/* Nomor Surat */}
              <div className="space-y-1.5">
                <Label className="text-sm">Nomor Surat</Label>
                <Input
                  value={nomorSurat}
                  onChange={(e) => setNomorSurat(e.target.value)}
                  placeholder="Contoh: 001"
                  className="h-9"
                />
              </div>

              {/* Tanda Tangan */}
              {hasAnySignature && (
                <div className="space-y-1.5">
                  <Label className="text-sm">Tanda Tangan</Label>
                  <Select value={signatureType} onValueChange={(v) => setSignatureType(v as "basah" | "digital" | "none")}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Tanpa tanda tangan</SelectItem>
                      {(officialKaprodi?.ttd_basah_url || officialKetua?.ttd_basah_url) && (
                        <SelectItem value="basah">Tanda tangan basah</SelectItem>
                      )}
                      {(officialKaprodi?.ttd_digital_url || officialKetua?.ttd_digital_url) && (
                        <SelectItem value="digital">Tanda tangan digital (QR)</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setIsPrintModalOpen(false)} disabled={isPrinting}>Batal</Button>
            <Button onClick={handlePrintProcess} disabled={isPrinting}>
              {isPrinting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Memproses...</>
              ) : (
                <><Printer className="w-4 h-4 mr-2" /> Cetak PDF</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
