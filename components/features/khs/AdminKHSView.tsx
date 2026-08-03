"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Printer, Loader2, FileArchive } from "lucide-react";

import { getStudents, getStudyPrograms, getOfficialForDocument } from "@/app/actions/students";
import { StudentData, StudyProgram, Official, TranscriptItem } from "@/lib/types";
import { StudentTable } from "@/components/features/nilai/StudentTable";
import { useLayout } from "@/app/context/LayoutContext";
import { useSignature } from "@/hooks/useSignature";
import { usePdfPrint } from "@/hooks/use-pdf-print";
import { useToastMessage } from "@/hooks/use-toast-message";
import PrintableKHS from "@/components/features/khs/PrintableKHS";
import { calculateIPS, calculateIPK } from "@/lib/grade-calculations";

interface AdminKHSViewProps {
  initialStudents: StudentData[];
  initialStudyPrograms: StudyProgram[];
}

export default function AdminKHSView({ initialStudents, initialStudyPrograms }: AdminKHSViewProps) {
  const { isCollapsed } = useLayout();
  // --- STATE ---
  const [studentList, setStudentList] = useState<StudentData[]>(initialStudents || []);
  const [studyPrograms, setStudyPrograms] = useState<StudyProgram[]>(initialStudyPrograms || []);
  const [official, setOfficial] = useState<Official | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);

  // Selection & Bulk ZIP State
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [isGeneratingZip, setIsGeneratingZip] = useState(false);

  // Modal Cetak State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
  
  // Print Configuration State
  const [printSemester, setPrintSemester] = useState<number>(0);

  const { signatureType, setSignatureType, isLoading: isSigLoading } = useSignature("none", official);
  const { showLoading, dismiss } = useToastMessage();
  
  // Derive Signature from Official
  const secureImage = useMemo(() => {
      if (!official) return null;
      if (signatureType === "basah") return official.ttd_basah_url || null;
      if (signatureType === "digital") return official.ttd_digital_url || null;
      return null;
  }, [official, signatureType]);
  const [totalPages, setTotalPages] = useState(1);
  
  const { isPrinting, printPdf, generatePdfBlob } = usePdfPrint();
  const printRef = useRef<HTMLDivElement>(null);

  const toastIdRef = useRef<string | number | null>(null);

  // === LOADING TOAST SIGNATURE ===
  // === LOADING TOAST ===
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

  // === LOGIC SEMESTERS ===
  const availableSemesters = useMemo<number[]>(() => {
    if (!selectedStudent) return [];
    const currentSem = selectedStudent.profile?.semester || 1;
    const transcriptSmts = selectedStudent.transcript?.map((t: TranscriptItem) => Number(t.smt)) || [];
    const maxDataSem = Math.max(0, ...transcriptSmts);
    const limit = Math.max(currentSem, maxDataSem);
    return Array.from({ length: limit }, (_, i) => i + 1);
  }, [selectedStudent]);

  // Auto-select latest semester when modal opens
  useEffect(() => {
    if (isPrintModalOpen && availableSemesters.length > 0) {
        setPrintSemester(availableSemesters[availableSemesters.length - 1]);
    }
  }, [isPrintModalOpen, availableSemesters]);

  // === CALCULATIONS FOR PRINT ===
  const printSemesterData = useMemo(() => {
    if (!selectedStudent?.transcript) return [];
    return selectedStudent.transcript.filter((t: TranscriptItem) => Number(t.smt) === printSemester);
  }, [selectedStudent, printSemester]);

  const printIPS = useMemo(() => {
    return calculateIPS(selectedStudent?.transcript || [], printSemester).replace('.', ',');
  }, [selectedStudent, printSemester]);

  const printCumulativeData = useMemo(() => {
    if (!selectedStudent?.transcript) return [];
    return selectedStudent.transcript.filter((t: TranscriptItem) => Number(t.smt) <= printSemester && t.hm !== '-');
  }, [selectedStudent, printSemester]);

  const printIPK = useMemo(() => {
    return calculateIPK(printCumulativeData).replace('.', ',');
  }, [printCumulativeData]);

  // === HANDLERS ===
  const handleOpenPrintModal = async (student: StudentData) => {
    setSelectedStudent(student);
    setIsPrintModalOpen(true);

    if (student.profile.study_program_id) {
       const off = await getOfficialForDocument(student.profile.study_program_id);
       setOfficial(off);
    } else {
       const off = await getOfficialForDocument();
       setOfficial(off);
    }
  };

  const handlePrintProcess = async () => {
    await printPdf({
      elementRef: printRef,
      fileName: `KHS_${selectedStudent?.profile?.nim || 'Mahasiswa'}.pdf`,
      pdfFormat: "a4",
      pdfOrientation: "portrait",
    });
    setIsPrintModalOpen(false);
  };

  // === BULK ZIP PRINT HANDLER ===
  const handlePrintBulk = async () => {
    if (selectedStudents.size === 0) {
      toast.error("Pilih minimal 1 mahasiswa untuk dicetak");
      return;
    }

    setIsGeneratingZip(true);
    const toastId = toast.loading("Memulai pembuatan ZIP KHS...");

    try {
      const JSZip = (await import("jszip")).default;
      const { createRoot } = await import("react-dom/client");
      const zip = new JSZip();
      const selectedList = Array.from(selectedStudents);
      let processedCount = 0;

      for (const studentId of selectedList) {
        const s = studentList.find((item) => item.id === studentId);
        if (!s) continue;

        toast.loading(`Memproses ${processedCount + 1}/${selectedList.length}: ${s.profile.nama}`, {
          id: toastId,
        });

        // Get kaprodi/official
        let off: Official | null = null;
        if (s.profile.study_program_id) {
          off = await getOfficialForDocument(s.profile.study_program_id);
        } else {
          off = await getOfficialForDocument();
        }

        const currentSem = s.profile?.semester || 1;
        const semData = (s.transcript || []).filter((t: TranscriptItem) => Number(t.smt) === currentSem);
        const ipsVal = calculateIPS(s.transcript || [], currentSem).replace('.', ',');
        const cumData = (s.transcript || []).filter((t: TranscriptItem) => Number(t.smt) <= currentSem && t.hm !== '-');
        const ipkVal = calculateIPK(cumData).replace('.', ',');

        // Create container
        const container = document.createElement("div");
        container.style.position = "absolute";
        container.style.top = "0";
        container.style.left = "-9999px";
        container.style.width = "210mm";
        document.body.appendChild(container);

        const root = createRoot(container);

        await new Promise<void>((resolve) => {
          root.render(
            React.createElement(PrintableKHS, {
              loading: false,
              currentStudent: s,
              selectedSemester: currentSem,
              semesterData: semData,
              ips: ipsVal,
              ipk: ipkVal,
              signatureType: "none",
              signatureBase64: null,
              official: off,
              isCollapsed: true,
            })
          );
          setTimeout(resolve, 300);
        });

        const pdfBlob = await generatePdfBlob({
          elementRef: { current: container },
          fileName: "",
          pdfFormat: "a4",
          pdfOrientation: "portrait",
        });

        if (pdfBlob) {
          const fileName = `KHS_${s.profile.nama.replace(/\s+/g, "_")}_${s.profile.nim}_Smt${currentSem}.pdf`;
          zip.file(fileName, pdfBlob);
        }

        root.unmount();
        document.body.removeChild(container);
        processedCount++;
      }

      toast.loading("Mengompresi file ZIP...", { id: toastId });

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `KHS_Mahasiswa_${new Date().toISOString().split('T')[0]}.zip`;
      link.click();
      URL.revokeObjectURL(url);

      setSelectedStudents(new Set());
      toast.success(`Berhasil membuat ZIP berisi ${processedCount} file KHS`, { id: toastId });
    } catch (error) {
      console.error("Error generating ZIP:", error);
      toast.error("Gagal membuat file ZIP", { id: toastId });
    } finally {
      setIsGeneratingZip(false);
    }
  };

  const customActions = selectedStudents.size > 0 && (
    <Button
      variant="outline" 
      onClick={handlePrintBulk}
      disabled={isGeneratingZip}
      className="ml-2 bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
    >
      {isGeneratingZip ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Membuat ZIP...
        </>
      ) : (
        <>
          <FileArchive className="mr-2 h-4 w-4" />
          Cetak ZIP
        </>
      )}
    </Button>
  );

  return (
    <>
      {/* HIDDEN PRINT COMPONENT */}
      {selectedStudent && (
        <div className="absolute top-0 left-[-9999px] w-[210mm]">
            <PrintableKHS 
                ref={printRef}
                loading={false}
                currentStudent={selectedStudent}
                selectedSemester={printSemester}
                semesterData={printSemesterData}
                ips={printIPS}
                ipk={printIPK}
                signatureType={signatureType}
                signatureBase64={secureImage}
                official={official}
                isCollapsed={true} // Force full width
                setTotalPages={setTotalPages}
            />
        </div>
      )}

      {/* MAIN TABLE VIEW */}
      <Card className="border-none shadow-sm ring-1 ring-gray-200">
        <CardContent className="p-4 sm:p-6">
          <StudentTable 
            data={studentList}
            studyPrograms={studyPrograms} 
            isLoading={isLoading}
            onEdit={handleOpenPrintModal}
            actionLabel="Cetak KHS"
            actionIcon={<Printer className="w-3.5 h-3.5 mr-2" />}
            selectedIds={selectedStudents}
            onSelectionChange={setSelectedStudents}
            customActions={customActions}
          />
        </CardContent>
      </Card>

      {/* MODAL OPSI CETAK */}
      <Dialog open={isPrintModalOpen} onOpenChange={setIsPrintModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Opsi Cetak KHS</DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
              <div className="space-y-2">
                  <label className="text-sm font-medium">Semester</label>
                  <Select
                      value={String(printSemester)}
                      onValueChange={(val) => setPrintSemester(Number(val))}
                  >
                      <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pilih Semester" />
                      </SelectTrigger>
                      <SelectContent>
                          {availableSemesters.map((smt) => (
                              <SelectItem key={smt} value={String(smt)}>
                                  Semester {smt}
                              </SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
              </div>

              <div className="space-y-2">
                  <label className="text-sm font-medium">Pilih Jenis Tanda Tangan</label>
                  <Select value={signatureType} onValueChange={(val) => setSignatureType(val as "basah" | "digital" | "none")}>
                      <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pilih Tanda Tangan" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="none">Tanpa Tanda Tangan</SelectItem>
                          {official?.ttd_basah_url && <SelectItem value="basah">Tanda Tangan Basah</SelectItem>}
                          {official?.ttd_digital_url && <SelectItem value="digital">Tanda Tangan Digital</SelectItem>}
                      </SelectContent>
                  </Select>
              </div>
          </div>

          <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsPrintModalOpen(false)} disabled={isPrinting}>Batal</Button>
              <Button onClick={handlePrintProcess} className="bg-primary text-white" disabled={isPrinting || isSigLoading}>
                  {isPrinting || isSigLoading ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {isPrinting ? "Memproses..." : "Memuat..."}</>
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
