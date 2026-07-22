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
import { Printer, Loader2 } from "lucide-react";

import { getStudents, getStudyPrograms, getOfficialForDocument } from "@/app/actions/students";
import { StudentData, StudyProgram, Official, TranscriptItem } from "@/lib/types";
import { StudentTable } from "@/components/features/nilai/StudentTable";
import { useLayout } from "@/app/context/LayoutContext";
import { useSignature } from "@/hooks/useSignature";
import { usePdfPrint } from "@/hooks/use-pdf-print";
import { useToastMessage } from "@/hooks/use-toast-message";
import PrintableTranskrip from "@/components/features/transkrip/PrintableTranskrip";
import { calculateIPK, calculateTotalSKSLulus, calculateTotalMutu } from "@/lib/grade-calculations";

interface AdminTranskripViewProps {
  initialStudents: StudentData[];
  initialStudyPrograms: StudyProgram[];
}

export default function AdminTranskripView({ initialStudents, initialStudyPrograms }: AdminTranskripViewProps) {
  const { isCollapsed } = useLayout();
  // --- STATE ---
  const [studentList, setStudentList] = useState<StudentData[]>(initialStudents || []);
  const [studyPrograms, setStudyPrograms] = useState<StudyProgram[]>(initialStudyPrograms || []);
  const [official, setOfficial] = useState<Official | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);

  // Modal Cetak State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
  
  // Print Configuration State
  const { signatureType, setSignatureType, isLoading: isSigLoading } = useSignature("none");
  const { isPrinting, printPdf } = usePdfPrint();
  const printRef = useRef<HTMLDivElement>(null);
  const { showLoading, dismiss } = useToastMessage();
  // const [totalPages, setTotalPages] = useState(1);
  
  // Derive Signature from Official
  const secureImage = useMemo(() => {
      if (!official) return null;
      if (signatureType === "basah") return official.ttd_basah_url || null;
      if (signatureType === "digital") return official.ttd_digital_url || null;
      return null;
  }, [official, signatureType]);
  
  const toastIdRef = useRef<string | number | null>(null);

  // === LOADING TOAST SIGNATURE ===
  // === LOADING TOAST ===
  useEffect(() => {
    // Optional loading state
    if (isSigLoading) {
        if (!toastIdRef.current) toastIdRef.current = showLoading("Menyiapkan dokumen...");
    } else {
        if (toastIdRef.current) {
            dismiss(toastIdRef.current);
            toastIdRef.current = null;
        }
    }
  }, [isSigLoading]);

  // === DATA TRANSKRIP (Clean Data) ===
  const transcriptData = useMemo(() => {
    if (!selectedStudent?.transcript) return [];
    // Filter mata kuliah yang nilainya belum ada (-)
    return selectedStudent.transcript.filter((item: TranscriptItem) => item.hm !== '-');
  }, [selectedStudent]);

  const summaryData = useMemo(() => {
      if (!transcriptData) return { ipk: "0,00", totalSKS: 0, totalNM: 0 };
      
      const ipkVal = calculateIPK(transcriptData).replace('.', ',');
      const sksVal = calculateTotalSKSLulus(transcriptData);
      const mutuVal = calculateTotalMutu(transcriptData);

      return { ipk: ipkVal, totalSKS: sksVal, totalNM: mutuVal };
  }, [transcriptData]);

  // === HANDLERS ===
  const handleOpenPrintModal = async (student: StudentData) => {
    setSelectedStudent(student);
    setIsPrintModalOpen(true);

    // Fetch dynamic official based on student's prodi
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
      fileName: `Transkrip_${selectedStudent?.profile?.nama || 'Mahasiswa'}_${selectedStudent?.profile?.nim || ''}.pdf`,
      pdfFormat: "a4",
      pdfOrientation: "portrait",
    });
    setIsPrintModalOpen(false);
  };

  return (
    <>
      {/* HIDDEN PRINT COMPONENT */}
      {selectedStudent && (
        <div className="absolute top-0 left-[-9999px] w-[210mm]">
             <PrintableTranskrip
                ref={printRef}
                loading={false}
                currentStudent={selectedStudent}
                transcriptData={transcriptData}
                ipk={summaryData.ipk}
                totalSKS={summaryData.totalSKS}
                totalNM={summaryData.totalNM}
                signatureType={signatureType}
                signatureBase64={secureImage}
                official={official}
                isCollapsed={true} // Force full width
                // setTotalPages={setTotalPages}
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
            actionLabel="Cetak Transkrip"
            actionIcon={<Printer className="w-3.5 h-3.5 mr-2" />}
          />
        </CardContent>
      </Card>

      {/* MODAL OPSI CETAK */}
      <Dialog open={isPrintModalOpen} onOpenChange={setIsPrintModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Opsi Cetak Transkrip</DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
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
