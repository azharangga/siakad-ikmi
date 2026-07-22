"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useToastMessage } from "@/hooks/use-toast-message";
import { useSignature } from "@/hooks/useSignature";
import { usePdfPrint } from "@/hooks/use-pdf-print";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"; 
import { Label } from "@/components/ui/label"; 
import { 
    Send, AlertTriangle, BookOpen, CalendarDays, PieChart, Printer, Loader2, RotateCcw,
    CheckCircle, Clock, XCircle, Info 
} from "lucide-react";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { StatusBadge } from "./StatusBadge";
import { Skeleton } from "@/components/ui/skeleton"; 

// Import DataTable
import { DataTable, type Column } from "@/components/ui/data-table";

// Import Dokumen Components
import DocumentHeader from "@/components/features/document/DocumentHeader";
import StudentInfo from "@/components/features/document/StudentInfo";
import DocumentFooter from "@/components/features/document/DocumentFooter";

import { 
  getStudentCourseOfferings, createKRS, deleteKRS, submitKRS, resetKRS,
  CourseOffering 
} from "@/app/actions/krs";
import { getAcademicYears } from "@/app/actions/academic-years";
import { getActiveOfficial } from "@/app/actions/students"; 
import { AcademicYear, Official } from "@/lib/types";
import PrintableKRS from "./PrintableKRS";

interface StudentKRSViewProps {
  user: any;
  initialAcademicYears: AcademicYear[];
  initialOfficial: Official | null;
  initialSelectedYear: string;
  initialData: {
    offerings: CourseOffering[];
    student_semester: number;
    student_profile: any;
    mbkm_data: any;
  } | null;
}

export default function StudentKRSView({ 
  user, 
  initialAcademicYears, 
  initialOfficial, 
  initialSelectedYear,
  initialData
}: StudentKRSViewProps) {
  const { successAction, showError, showLoading, dismiss } = useToastMessage();
  const { signatureType, setSignatureType, setSignaturePath, secureImage, isLoading: isSigLoading } = useSignature("none");
  const { isPrinting, printPdf } = usePdfPrint();
  const printRef = useRef<HTMLDivElement>(null);

  const [offerings, setOfferings] = useState<CourseOffering[]>(initialData?.offerings || []);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>(initialAcademicYears);
  const [selectedYear, setSelectedYear] = useState<string>(initialSelectedYear);
  const [studentSemester, setStudentSemester] = useState<number>(initialData?.student_semester || 0);
  const [isLoading, setIsLoading] = useState(false);
  
  const [official, setOfficial] = useState<Official | null>(initialOfficial);
  const [studentProfile, setStudentProfile] = useState<any>(initialData?.student_profile || null);
  const [mbkmData, setMbkmData] = useState<any>(initialData?.mbkm_data || null);

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);

  const studentId = user.student_id;
  const MAX_SKS = useMemo(() => {
    if (mbkmData && mbkmData.jenis_mbkm === 'Pertukaran Mahasiswa Merdeka') return 24;
    if (studentSemester === 7) return 14;
    if (studentSemester === 8) return 10;
    return 20;
  }, [mbkmData, studentSemester]); 

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSigLoading]);

  // Initial Data is passed via props, so no init useEffect needed EXCEPT for year change logic
  
  // This effect handles fetching ONLY when selectedYear changes from the initial one OR if user switches back and forth
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
    }
    if (!selectedYear || !studentId) return;
    fetchData();
  }, [selectedYear, studentId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await getStudentCourseOfferings(studentId, selectedYear);
      setOfferings(res.offerings);
      setStudentSemester(res.student_semester);
      setStudentProfile(res.student_profile);
      setMbkmData(res.mbkm_data);
    } catch (error: any) {
      showError("Gagal", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // === STATS & DATA ===
  const totalSKS = offerings.filter(c => c.is_taken).reduce((acc, curr) => acc + curr.sks, 0);
  const hasDraft = offerings.some(c => c.is_taken && c.krs_status === 'DRAFT');
  const krsGlobalStatus = offerings.find(c => c.is_taken)?.krs_status || "NOT_TAKEN";
  const progressPercent = Math.min((totalSKS / MAX_SKS) * 100, 100);

  const takenCourses = useMemo(() => offerings.filter(c => c.is_taken), [offerings]);
  const selectedAcademicYearName = useMemo(() => {
      const ay = academicYears.find(y => y.id === selectedYear);
      return ay ? `${ay.nama} ${ay.semester}` : "";
  }, [academicYears, selectedYear]);

  // === FILTER & SORT TAHUN AKADEMIK ===
  const filteredAcademicYears = useMemo(() => {
    if (!studentProfile || !academicYears.length) return academicYears;
    const angkatan = Number(studentProfile.angkatan);
    let data = [...academicYears];

    if (angkatan && !isNaN(angkatan)) {
        data = data.filter((ay) => {
            const startYear = parseInt(ay.nama.split('/')[0]);
            if (isNaN(startYear)) return true;
            return startYear >= angkatan;
        });
    }

    return data.sort((a, b) => {
        const yearA = parseInt(a.nama.split('/')[0]) || 0;
        const yearB = parseInt(b.nama.split('/')[0]) || 0;
        if (yearA !== yearB) return yearB - yearA; 
        const isGenapA = a.semester.toLowerCase().includes('genap');
        const isGenapB = b.semester.toLowerCase().includes('genap');
        if (isGenapA && !isGenapB) return -1;
        if (!isGenapA && isGenapB) return 1;
        return 0;
    });
  }, [academicYears, studentProfile]);

  const StatusIcon = useMemo(() => {
    switch (krsGlobalStatus) {
        case 'APPROVED': return CheckCircle;
        case 'SUBMITTED': return Clock;
        case 'REJECTED': return XCircle;
        default: return BookOpen;
    }
  }, [krsGlobalStatus]);

  // Filter & Pagination Logic
  const filteredData = useMemo(() => {
    let data = offerings;
    if (krsGlobalStatus !== 'DRAFT' && krsGlobalStatus !== 'NOT_TAKEN') {
        data = data.filter(row => row.is_taken);
    }
    if (!searchQuery) return data;
    const lower = searchQuery.toLowerCase();
    return data.filter(c => 
        c.matkul.toLowerCase().includes(lower) || 
        c.kode.toLowerCase().includes(lower)
    );
  }, [offerings, searchQuery, krsGlobalStatus]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredData.slice(startIndex, endIndex);

  const editableRows = useMemo(() => {
    return currentData.filter(row => {
        const isLocked = row.is_taken && row.krs_status !== 'DRAFT';
        return !isLocked;
    });
  }, [currentData]);

  const isAllTaken = editableRows.length > 0 && editableRows.every(row => row.is_taken);
  
  // === ACTIONS ===
  const handleToggleCourse = async (course: CourseOffering, isChecked: boolean) => {
    if (isChecked) {
        if (totalSKS + course.sks > MAX_SKS) {
            showError("Batas SKS", `Gagal mengambil mata kuliah. Total SKS akan melebihi batas (${MAX_SKS}).`);
            return;
        }
        
        // Optimistic Update: Set taken immediately
        setOfferings(prev => prev.map(o => o.id === course.id ? { ...o, is_taken: true, krs_status: 'DRAFT' } : o));
        
        try {
            const res = await createKRS({ student_id: studentId, academic_year_id: selectedYear, course_id: course.id });
            // Update with real KRS ID
            if (res.data?.id) {
                const newKrsId = res.data.id;
                setOfferings(prev => prev.map(o => o.id === course.id ? { ...o, krs_id: newKrsId } : o));
            }
        } catch (e: any) { 
            // Revert state on error
            setOfferings(prev => prev.map(o => o.id === course.id ? { ...o, is_taken: false, krs_status: undefined } : o));
            showError("Gagal", e.message); 
        }
    } else {
        if (!course.krs_id) return;
        const currentKrsId = course.krs_id;

        // Optimistic Update: Set untaken immediately
        setOfferings(prev => prev.map(o => o.id === course.id ? { ...o, is_taken: false, krs_status: undefined, krs_id: undefined } : o));

        try {
            await deleteKRS(course.krs_id);
        } catch (e: any) { 
            // Revert state on error
             setOfferings(prev => prev.map(o => o.id === course.id ? { ...o, is_taken: true, krs_status: 'DRAFT', krs_id: currentKrsId } : o));
            showError("Gagal", e.message); 
        }
    }
  };

  const handleSelectAll = async () => {
    if (isLoading || editableRows.length === 0) return;
    if (isAllTaken) {
        // Optimistic: Remove all
        const toRemove = editableRows.filter(row => row.krs_id);
        setOfferings(prev => prev.map(o => toRemove.some(r => r.id === o.id) ? { ...o, is_taken: false, krs_id: undefined, krs_status: undefined } : o));

        try {
            const promises = toRemove.map(row => deleteKRS(row.krs_id!));
            await Promise.all(promises);
        } catch (e: any) { 
            // Revert is hard here, better refresh or show error.
            fetchData();
            showError("Gagal", e.message); 
        }
    } else {
        // Optimistic: Take all
        const toTake = editableRows.filter(row => !row.is_taken);
        const sKsToAdd = toTake.reduce((sum, row) => sum + row.sks, 0);
        if (totalSKS + sKsToAdd > MAX_SKS) {
            showError("Batas SKS", `Total SKS akan menjadi ${totalSKS + sKsToAdd}. Batas maksimal adalah ${MAX_SKS}.`);
            return;
        }
        
        setOfferings(prev => prev.map(o => toTake.some(r => r.id === o.id) ? { ...o, is_taken: true, krs_status: 'DRAFT' } : o));

        try {
             // We need to associate new IDs. This is complex for bulk optimistic.
             // Strategy: Do optimistic visual update, but fetch data silently after to sync IDs.
             // OR: run sequential creates and update IDs one by one? slightly slower but safer.
             // OR: Promise.all then fetch data silent.
             const promises = toTake.map(row => 
                createKRS({ student_id: studentId, academic_year_id: selectedYear, course_id: row.id })
             );
             await Promise.all(promises);
             
             // For bulk add, we DO need to fetch to get the IDs correctly for next interactions, 
             // BUT we can do it without triggering global loading
             const res = await getStudentCourseOfferings(studentId, selectedYear);
             setOfferings(res.offerings); // Silent sync
        } catch(e: any) { 
             fetchData(); // Scan back to original state
             showError("Gagal", e.message); 
        }
    }
  };

  const confirmSubmit = async () => {
    const toastId = showLoading("Mengajukan KRS...");
    try {
        await submitKRS(studentId, selectedYear);
        successAction("KRS", "update", toastId);
        await fetchData();
    } catch (e: any) { showError("Gagal", e.message, toastId); }
    finally { setIsSubmitOpen(false); }
  };

  const handleReset = async () => {
    const toastId = showLoading("Mereset KRS...");
    try {
        await resetKRS(studentId, selectedYear);
        successAction("KRS", "delete", toastId);
        await fetchData();
    } catch (e: any) { showError("Gagal", e.message, toastId); }
    finally { setIsResetOpen(false); }
  };
  
  const handlePrintProcess = async () => {
    await printPdf({
      elementRef: printRef,
      fileName: `KRS_SMT${studentSemester}_${user.name}_${user.username}.pdf`,
      pdfFormat: "a4",
      pdfOrientation: "portrait",
    });
    setIsPrintModalOpen(false);
  };

  const columns: Column<CourseOffering>[] = [
    {
      header: () => (
          <div className="flex justify-center">
            <Checkbox 
                checked={isAllTaken}
                onCheckedChange={handleSelectAll}
                disabled={isLoading || editableRows.length === 0}
                className="data-[state=checked]:bg-blue-800 data-[state=checked]:border-blue-800"
            />
          </div>
      ),
      className: "w-[50px] text-center",
      render: (row) => {
        const isLocked = row.is_taken && row.krs_status !== 'DRAFT';
        return (
            <div className="flex justify-center">
                <Checkbox 
                    checked={row.is_taken}
                    disabled={isLocked || isLoading}
                    onCheckedChange={(checked) => handleToggleCourse(row, checked as boolean)}
                    className="data-[state=checked]:bg-blue-800 data-[state=checked]:border-blue-800"
                />
            </div>
        );
      },
    },
    {
      header: "Kode",
      className: "w-[100px]",
      render: (row) => <span className="font-mono text-slate-600">{row.kode}</span>
    },
    {
      header: "Mata Kuliah",
      render: (row) => (
        <div>
            <div className="font-semibold text-sm text-slate-800">{row.matkul}</div>
            <div className="text-xs text-slate-400 mt-0.5">{row.kategori || "Reguler"}</div>
        </div>
      )
    },
    {
        header: "SKS",
        className: "text-center w-[60px]",
        render: (row) => <span className="text-sm font-medium text-slate-600">{row.sks}</span>
    },
    {
        header: "Semester",
        className: "text-center w-[60px]",
        render: (row) => <span className="text-sm font-medium text-slate-600">{row.smt_default}</span>
    },
    {
        header: "Status",
        className: "text-center w-[140px]",
        render: (row) => row.is_taken ? (<div className="flex justify-center scale-90"><StatusBadge status={row.krs_status} /></div>) : <span className="text-xs text-slate-400 italic">-</span>
    }
  ];

  const isPrintButtonDisabled = isSigLoading || (signatureType !== 'none' && !secureImage);

  return (
    <>
    {/* --- LAYOUT PRINT (HIDDEN FOR PDF CAPTURE) --- */}
    <div className="absolute top-0 left-[-9999px] w-[210mm]">
      <PrintableKRS 
          ref={printRef}
          className="block"
          studentProfile={studentProfile || { 
              nama: user?.name || "-", nim: user?.username || "-", 
              semester: studentSemester, study_program: { nama: "-", jenjang: "-" } 
          }}
          studentSemester={studentSemester}
          selectedAcademicYearName={selectedAcademicYearName}
          takenCourses={takenCourses}
          totalSKS={totalSKS}
          official={official}
          signatureType={signatureType}
          signatureBase64={secureImage}
      />
    </div>

    {/* --- LAYOUT WEB --- */}
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 mt-4 print:hidden">
      
      {studentProfile?.status_mahasiswa === 'LULUS' && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-4 flex items-center gap-3 shadow-sm">
          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
          <div>
            <p className="font-semibold text-sm">Selamat! Anda Telah Dinyatakan Lulus</p>
            <p className="text-xs text-emerald-700 mt-0.5">Seluruh kegiatan akademik dan pengisian Kartu Rencana Studi (KRS) Anda telah dinyatakan selesai secara resmi.</p>
          </div>
        </div>
      )}

      {/* 1. HEADER STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CARD 1: STATUS KRS */}
        <Card className={`col-span-1 md:col-span-2 border-none shadow-md text-white overflow-hidden relative
            ${studentProfile?.status_mahasiswa === 'LULUS' || krsGlobalStatus === 'APPROVED' ? 'bg-gradient-to-br from-emerald-600 to-teal-700' : 
              krsGlobalStatus === 'SUBMITTED' ? 'bg-gradient-to-br from-blue-800 to-blue-900' : 
              krsGlobalStatus === 'REJECTED' ? 'bg-gradient-to-br from-red-600 to-rose-700' : 
              'bg-gradient-to-br from-slate-700 to-slate-800' }`}>
            
            <div className="absolute top-0 right-0 p-8 opacity-10">
                <StatusIcon size={120} />
            </div>

            <CardContent className="p-4 sm:p-6 relative z-10 flex flex-col justify-between h-full">
                {isLoading ? (
                    <div className="flex flex-col justify-between h-full gap-6">
                        <div className="flex justify-between items-start">
                            <div className="space-y-3">
                                <Skeleton className="h-4 w-32 opacity-25" />
                                <Skeleton className="h-8 w-48 opacity-25" />
                            </div>

                        </div>
                        <div className="flex flex-wrap items-center gap-4">
                            <Skeleton className="h-10 w-[240px] opacity-25" />
                            <Skeleton className="h-10 w-32 opacity-25" />
                        </div>
                    </div>
                ) : (
                    <>
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div>
                            <p className="text-white/80 font-medium text-sm mb-1">Status Pengisian KRS</p>
                            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                                {studentProfile?.status_mahasiswa === 'LULUS' ? "Studi Selesai (LULUS)" :
                                 krsGlobalStatus === 'APPROVED' ? "KRS Disetujui" : 
                                 krsGlobalStatus === 'SUBMITTED' ? "Menunggu Validasi" :
                                 krsGlobalStatus === 'REJECTED' ? "KRS Ditolak" :
                                 krsGlobalStatus === 'NOT_TAKEN' ? "Belum Mengisi" : "Belum Diajukan"}
                            </h2>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                            {krsGlobalStatus === 'REJECTED' && (
                                <Button size="sm" variant="outline" className="bg-white/10 border-white/20 text-white hover:opacity-25 hover:text-white"
                                    onClick={() => setIsResetOpen(true)}>
                                    <RotateCcw className="w-4 h-4 mr-2" /> Isi Ulang
                                </Button>
                            )}
                            {krsGlobalStatus === 'DRAFT' && (
                                <Badge className="bg-amber-400 text-amber-900 hover:bg-amber-500 border-none">Perlu Tindakan</Badge>
                            )}
                        </div>
                    </div>
                    <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-4">
                        <Select value={selectedYear} onValueChange={setSelectedYear}>
                            <SelectTrigger className="w-full sm:w-[240px] h-10 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:ring-0 [&_svg]:text-white [&_svg]:stroke-white [&_svg]:opacity-100">
                                <SelectValue placeholder="Pilih Tahun Akademik" />
                            </SelectTrigger>
                            <SelectContent>
                                {filteredAcademicYears.map((ay) => (
                                    <SelectItem key={ay.id} value={ay.id}>
                                        TA {ay.nama} - {ay.semester}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {studentSemester > 0 && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-md border border-white/10">
                                <CalendarDays className="w-4 h-4" />
                                <span className="text-sm font-medium">Semester {studentSemester}</span>
                            </div>
                        )}
                    </div>
                    </>
                )}
            </CardContent>
        </Card>

        {/* CARD 2: TOTAL SKS */}
        <Card className="border-none shadow-md text-white overflow-hidden relative bg-gradient-to-br from-cyan-600 to-blue-600">
            <div className="absolute -bottom-6 -right-6 opacity-20 rotate-12"><PieChart size={140} /></div>
            <CardContent className="p-4 sm:p-6 relative z-10 flex flex-col justify-between h-full">
                {isLoading ? (
                    <div className="space-y-6">
                        <div className="space-y-3">
                             <Skeleton className="h-4 w-32 opacity-25" />
                             <div className="flex items-baseline gap-2">
                                <Skeleton className="h-10 w-16 opacity-25" />
                                <Skeleton className="h-6 w-12 opacity-25" />
                             </div>
                        </div>
                        <div className="space-y-2">
                            <Skeleton className="h-3 w-full opacity-25 rounded-full" />
                            <Skeleton className="h-3 w-3/4 opacity-25 rounded-full" />
                        </div>
                    </div>
                ) : (
                    <>
                    <div>
                        <div className="flex items-center gap-2 text-cyan-50 mb-1"><span className="text-sm font-medium">Total SKS Diambil</span></div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl sm:text-4xl font-extrabold tracking-tight">{totalSKS}</span>
                            <span className="text-lg text-cyan-100 font-medium">/ {MAX_SKS} SKS</span>
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="w-full bg-black/20 rounded-full h-3 mb-3 overflow-hidden backdrop-blur-sm">
                            <div className="h-full rounded-full transition-all duration-1000 ease-out bg-white/90 shadow-[0_0_10px_rgba(255,255,255,0.5)]" style={{ width: `${progressPercent}%` }} />
                        </div>
                        <p className="text-xs text-cyan-50/90 leading-relaxed font-medium">
                            {totalSKS < 10 ? "SKS masih sedikit. Maksimalkan jatah SKS Anda." : totalSKS > 20 ? "Beban studi tinggi. Semangat!" : "Beban studi cukup optimal."}
                        </p>
                    </div>
                    </>
                )}
            </CardContent>
        </Card>
      </div>

      {/* 2. ALERT MBKM (DIBAWAH HEADER) */}
      
      {/* ALERT KHUSUS PMM (Warna Biru/Info) */}
      {!isLoading && mbkmData && mbkmData.jenis_mbkm === 'Pertukaran Mahasiswa Merdeka' && (
           <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex flex-col sm:flex-row items-start gap-4 shadow-sm animate-in slide-in-from-top-2">
              <div className="p-2 bg-blue-100 rounded-full text-blue-700 mt-1 shrink-0">
                  <Info className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-blue-900">Mahasiswa Program PMM</h4>
                <p className="text-sm text-blue-800/80 mt-1 max-w-3xl">
                  Anda terdaftar mengikuti program <strong>{mbkmData.jenis_mbkm}</strong> di <strong>{mbkmData.mitra}</strong>. 
                  Sistem telah menyesuaikan daftar mata kuliah yang dapat Anda ambil (Mata Kuliah Konversi/MBKM). 
                  Silakan ambil mata kuliah konversi yang tersedia di bawah ini sesuai arahan Kaprodi.
                </p>
              </div>
           </div>
      )}

      {/* ALERT KHUSUS MBKM NON-PMM (Warna Biru/Info) */}
      {!isLoading && mbkmData && mbkmData.jenis_mbkm !== 'Pertukaran Mahasiswa Merdeka' && (
           <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex flex-col sm:flex-row items-start gap-4 shadow-sm animate-in slide-in-from-top-2">
              <div className="p-2 bg-blue-100 rounded-full text-blue-700 mt-1 shrink-0">
                  <Info className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-blue-900">Mahasiswa Program {mbkmData.jenis_mbkm}</h4>
                <p className="text-sm text-blue-800/80 mt-1 max-w-3xl">
                  Anda terdaftar mengikuti program <strong>{mbkmData.jenis_mbkm}</strong> di <strong>{mbkmData.mitra}</strong>. 
                  Silakan lakukan pengisian KRS reguler seperti biasa atau konsultasikan dengan Ketua Program Studi mengenai konversi nilai dan pengambilan mata kuliah yang sesuai.
                </p>
              </div>
           </div>
      )}

      {/* 3. ALERT & ACTION BUTTON */}
      {!isLoading && hasDraft && (
           <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-in slide-in-from-top-2">
              <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-100 rounded-full text-amber-700 shrink-0"><AlertTriangle className="h-5 w-5" /></div>
                  <div>
                    <h4 className="font-semibold text-amber-900 text-sm">Selesaikan Pengisian KRS</h4>
                    <p className="text-sm text-amber-800/80 mt-1 max-w-2xl">Anda memiliki mata kuliah berstatus <strong>Belum Diajukan</strong>. Harap ajukan segera.</p>
                  </div>
              </div>
              <Button onClick={() => setIsSubmitOpen(true)} className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white shadow-sm border-0 font-medium">
                  <Send className="w-4 h-4 mr-2" /> Ajukan KRS
              </Button>
           </div>
      )}

      {/* TABLE */}
      <Card className="border-none shadow-sm ring-1 ring-slate-200">
        <CardContent className="p-4 sm:p-6">
            <DataTable
                data={currentData}
                columns={columns}
                isLoading={isLoading}
                searchQuery={searchQuery}
                onSearchChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                searchPlaceholder="Cari Matkul atau Kode..."
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                startIndex={startIndex}
                endIndex={endIndex}
                totalItems={filteredData.length}
                onAdd={
                    (krsGlobalStatus === 'SUBMITTED' || krsGlobalStatus === 'APPROVED') 
                    ? () => setIsPrintModalOpen(true) 
                    : undefined
                }
                addLabel="Cetak KRS"
                addIcon={<Printer className="w-4 h-4 mr-2" />}
            />
        </CardContent>
      </Card>

      {/* MODAL PRINT OPTIONS */}
      <Dialog open={isPrintModalOpen} onOpenChange={setIsPrintModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
            <DialogHeader><DialogTitle>Opsi Cetak KRS</DialogTitle></DialogHeader>
            <div className="py-4 space-y-4">
                <div className="space-y-2">
                    <Label className="text-sm font-medium">Pilih Jenis Tanda Tangan</Label>
                    <Select value={signatureType} onValueChange={(val: any) => {
                        setSignatureType(val);
                        if (val === 'basah' && official?.ttd_basah_url) setSignaturePath(official.ttd_basah_url);
                        else if (val === 'digital' && official?.ttd_digital_url) setSignaturePath(official.ttd_digital_url);
                        else setSignaturePath(null);
                    }}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="Pilih Tanda Tangan" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Tanpa Tanda Tangan</SelectItem>
                            {official?.ttd_basah_url && <SelectItem value="basah">Tanda Tangan Basah</SelectItem>}
                            {official?.ttd_digital_url && <SelectItem value="digital">Tanda Tangan Digital</SelectItem>}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsPrintModalOpen(false)} disabled={isPrinting}>Batal</Button>
                <Button onClick={handlePrintProcess} disabled={isPrinting || isSigLoading}>
                    {isPrinting || isSigLoading ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {isPrinting ? "Memproses..." : "Memuat..."}</>
                    ) : (
                        <><Printer className="w-4 h-4 mr-2" /> Cetak PDF</>
                    )}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmModal isOpen={isSubmitOpen} onClose={setIsSubmitOpen} onConfirm={confirmSubmit}
        title="Ajukan KRS?" description="Setelah diajukan, KRS akan dikunci dan menunggu persetujuan BAAK atau Dosen Wali." confirmLabel="Ajukan Sekarang" variant="default" />
      
      {/* MODAL RESET (Isi Ulang) */}
      <ConfirmModal isOpen={isResetOpen} onClose={setIsResetOpen} onConfirm={handleReset}
        title="Isi Ulang KRS?" description="Tindakan ini akan menghapus semua pilihan mata kuliah Anda untuk semester ini. Anda harus memilih ulang dari awal. Lanjutkan?" confirmLabel="Ya, Reset Data" variant="destructive" />
    </div>
    </>
  );
}