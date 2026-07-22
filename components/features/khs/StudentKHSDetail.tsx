"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { type StudentData, type TranscriptItem, type Official } from "@/lib/types";
import { useSignature } from "@/hooks/useSignature";
import { useToastMessage } from "@/hooks/use-toast-message";

import PrintableKHS from "@/components/features/khs/PrintableKHS";
import KHSTable from "@/components/features/khs/KHSTable";
import { calculateIPS, calculateIPK, calculateTotalSKSLulus, calculateTotalMutu } from "@/lib/grade-calculations";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Printer, Trophy, BookOpen, GraduationCap, FileText } from "lucide-react";

interface StudentKHSDetailProps {
    student: StudentData;
    official: Official | null;
    isCollapsed?: boolean;
}

export default function StudentKHSDetail({ student, official, isCollapsed = false }: StudentKHSDetailProps) {
  const [selectedSemester, setSelectedSemester] = useState<number>(0);
  const [printSemester, setPrintSemester] = useState<number>(0);
  const { signatureType, setSignatureType, secureImage, isLoading: isSigLoading } = useSignature("none");
  const { showLoading, dismiss } = useToastMessage();
  
  const [totalPages, setTotalPages] = useState(1);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

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
  }, [isSigLoading, showLoading, dismiss]);

  // === LOGIC SEMESTER ===
  const availableSemesters = useMemo<number[]>(() => {
    if (!student) return [];
    const currentSem = student.profile?.semester || 1;
    const transcriptSmts = student.transcript?.map((t: TranscriptItem) => Number(t.smt)) || [];
    const maxDataSem = Math.max(0, ...transcriptSmts);
    const limit = Math.max(currentSem, maxDataSem);
    return Array.from({ length: limit }, (_, i) => i + 1);
  }, [student]);

  // Auto-select latest semester for printing
  useEffect(() => {
    if (isPrintModalOpen && availableSemesters.length > 0) {
        if (selectedSemester !== 0) {
            setPrintSemester(selectedSemester);
        } else {
            setPrintSemester(availableSemesters[availableSemesters.length - 1]);
        }
    }
  }, [isPrintModalOpen, selectedSemester, availableSemesters]);

  const semesterData = useMemo(() => {
    if (!student?.transcript) return [];
    if (selectedSemester === 0) return student.transcript;
    return student.transcript.filter((t: TranscriptItem) => Number(t.smt) === selectedSemester);
  }, [student, selectedSemester]);

  const cumulativeData = useMemo(() => {
    if (!student?.transcript) return [];
    if (selectedSemester === 0) {
         return student.transcript.filter((t: TranscriptItem) => t.hm !== '-');
    }
    return student.transcript.filter((t: TranscriptItem) => Number(t.smt) <= selectedSemester && t.hm !== '-');
  }, [student, selectedSemester]);

  const ipk = useMemo(() => {
     return calculateIPK(cumulativeData).replace('.', ',');
  }, [cumulativeData]);

  const totalSKS = useMemo(() => {
    return calculateTotalSKSLulus(cumulativeData);
  }, [cumulativeData]);

  const totalMutu = useMemo(() => {
    return calculateTotalMutu(cumulativeData);
  }, [cumulativeData]);

  const totalCourses = useMemo(() => {
    return cumulativeData.length;
  }, [cumulativeData]);

  const handlePrintProcess = () => {
    setIsPrintModalOpen(false);
    setTimeout(() => {
        window.print();
    }, 300);
  };

  // Printing Data
  const printSemesterData = useMemo(() => {
    if (!student?.transcript) return [];
    return student.transcript.filter((t: TranscriptItem) => Number(t.smt) === printSemester);
  }, [student, printSemester]);

  const printIPS = useMemo(() => {
    return calculateIPS(student?.transcript || [], printSemester).replace('.', ',');
  }, [student, printSemester]);

  const printCumulativeData = useMemo(() => {
    if (!student?.transcript) return [];
    return student.transcript.filter((t: TranscriptItem) => Number(t.smt) <= printSemester && t.hm !== '-');
  }, [student, printSemester]);

  const printIPK = useMemo(() => {
    return calculateIPK(printCumulativeData).replace('.', ',');
  }, [printCumulativeData]);

  return (
    <>
      {/* HIDDEN PRINT COMPONENT */}
      <div className="hidden print:block print:absolute print:top-0 print:left-0 print:w-full print:z-[9999]">
          <PrintableKHS 
            loading={false}
            currentStudent={student}
            selectedSemester={printSemester}
            semesterData={printSemesterData}
            ips={printIPS}
            ipk={printIPK}
            signatureType={signatureType}
            signatureBase64={secureImage}
            official={official}
            isCollapsed={isCollapsed}
            setTotalPages={setTotalPages}
          />
      </div>

      <div className="space-y-6 print:hidden py-4">
         {/* SUMMARY CARDS */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <Card className="col-span-1 md:col-span-2 border-none shadow-md text-white overflow-hidden relative bg-gradient-to-br from-blue-800 to-blue-900">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Trophy size={120} />
                </div>
                <CardContent className="p-6 relative z-10 flex flex-col justify-between h-full">
                     <div>
                        <p className="text-blue-100 font-medium text-sm mb-1">Indeks Prestasi Kumulatif</p>
                        <div className="flex items-baseline gap-2">
                            <h2 className="text-4xl font-extrabold tracking-tight">{ipk}</h2>
                            <span className="text-lg text-blue-200 font-medium">/ 4.00</span>
                        </div>
                    </div>
                    
                    <div className="mt-6 flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-md border border-white/10 backdrop-blur-sm">
                            <GraduationCap className="w-4 h-4 text-blue-50" />
                            <span className="text-sm font-medium text-blue-50">Total Nilai Mutu: {totalMutu}</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-md border border-white/10 backdrop-blur-sm">
                            <FileText className="w-4 h-4 text-blue-50" />
                            <span className="text-sm font-medium text-blue-50">Total Mata Kuliah: {totalCourses}</span>
                        </div>
                    </div>
                </CardContent>
             </Card>

             <Card className="border-none shadow-md text-white overflow-hidden relative bg-gradient-to-br from-cyan-600 to-blue-600">
                <div className="absolute -bottom-6 -right-6 opacity-20 rotate-12">
                    <BookOpen size={140} />
                </div>
                <CardContent className="p-6 relative z-10 flex flex-col justify-between h-full">
                     <div>
                        <div className="flex items-center gap-2 text-cyan-50 mb-1">
                            <span className="text-sm font-medium">Total SKS Lulus</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <h2 className="text-4xl font-extrabold tracking-tight">{totalSKS}</h2>
                            <span className="text-lg text-cyan-100 font-medium">/ 144 SKS</span>
                        </div>
                    </div>
                    
                    <div className="mt-4">
                        <div className="w-full bg-black/20 rounded-full h-3 mb-3 overflow-hidden backdrop-blur-sm">
                            <div 
                                className="h-full rounded-full transition-all duration-1000 ease-out bg-white/90 shadow-[0_0_10px_rgba(255,255,255,0.5)]" 
                                style={{ width: `${Math.min((totalSKS / 144) * 100, 100)}%` }} 
                            />
                        </div>
                        <p className="text-xs text-cyan-50/90 leading-relaxed font-medium">
                            {Math.round((totalSKS / 144) * 100)}% dari minimal 144 SKS.
                        </p>
                    </div>
                </CardContent>
             </Card>
         </div>

         {/* TABLE SECTION */}
         <Card className="border-none shadow-sm ring-1 ring-slate-200">
            <CardContent className="p-6">
                 <KHSTable 
                     data={semesterData} 
                     loading={false}
                     onPrint={() => setIsPrintModalOpen(true)}
                     availableSemesters={availableSemesters}
                     selectedSemester={selectedSemester}
                     onSemesterChange={setSelectedSemester}
                 />
            </CardContent>
         </Card>

         {/* PRINT MODAL */}
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
                                  <SelectItem value="basah">Tanda Tangan Basah</SelectItem>
                                  <SelectItem value="digital">Tanda Tangan Digital</SelectItem>
                              </SelectContent>
                          </Select>
                      </div>
                  </div>

                  <div className="flex justify-end gap-3">
                      <Button variant="outline" onClick={() => setIsPrintModalOpen(false)}>Batal</Button>
                      <Button onClick={handlePrintProcess} className="bg-primary text-white">
                          <Printer className="mr-2 h-4 w-4" /> Cetak PDF
                      </Button>
                  </div>
              </DialogContent>
         </Dialog>
      </div>
    </>
  );
}
