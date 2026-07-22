"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useToastMessage } from "@/hooks/use-toast-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { 
  CheckCircle2, Eye, XCircle, GraduationCap, CalendarDays, AlertCircle, ListTodo, BookOpen, Users, Lock, ChevronRight, FileText, LayoutDashboard, Check, ChevronsUpDown, Pencil, Trash2, Plus
} from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import BulkKRSInputModal from "./BulkKRSInputModal"; // Import Modal
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"; 
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Import DataTable dan Column
import { DataTable, type Column } from "@/components/ui/data-table";

import { 
  getStudentsWithSubmittedKRS, getKRSByStudent, approveKRS, rejectKRS, approveAllKRS 
} from "@/app/actions/krs";
import { getAcademicYears } from "@/app/actions/academic-years";
import { AcademicYear, KRS } from "@/lib/types";
import { ConfirmModal } from "@/components/shared/ConfirmModal";

interface AdminKRSValidationViewProps {
  initialAcademicYears: AcademicYear[];
  initialSelectedYear: string;
  initialStudents: any[];
}

export default function AdminKRSValidationView({
  initialAcademicYears,
  initialSelectedYear,
  initialStudents
}: AdminKRSValidationViewProps) {
  const { successAction, showError, showLoading } = useToastMessage();

  const [academicYears, setAcademicYears] = useState<AcademicYear[]>(initialAcademicYears);
  const [selectedYear, setSelectedYear] = useState<string>(initialSelectedYear);
  const [students, setStudents] = useState<any[]>(initialStudents || []);
  const [isLoading, setIsLoading] = useState(false);

  const sortedAcademicYears = useMemo(() => {
    return [...academicYears].sort((a, b) => {
        const yearA = parseInt(a.nama.split('/')[0]) || 0;
        const yearB = parseInt(b.nama.split('/')[0]) || 0;
        if (yearA !== yearB) return yearB - yearA; // Descending Year

        // Prioritize Genap over Ganjil
        const isGenapA = a.semester.toLowerCase().includes('genap');
        const isGenapB = b.semester.toLowerCase().includes('genap');
        if (isGenapA && !isGenapB) return -1;
        if (!isGenapA && isGenapB) return 1;
        return 0;
    });
  }, [academicYears]);

  // State untuk DataTable & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Detail Modal State
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [studentKRS, setStudentKRS] = useState<KRS[]>([]);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isApproveAllOpen, setIsApproveAllOpen] = useState(false);
  const [isBulkInputOpen, setIsBulkInputOpen] = useState(false); // State Modal Bulk Input

  // Filter & Fetch when selectedYear changes from initial
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
    }
    if (!selectedYear) return;
    fetchStudents();
  }, [selectedYear]);

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const data = await getStudentsWithSubmittedKRS(selectedYear);
      setStudents(data);
    } catch (error) { console.error(error); } 
    finally { setIsLoading(false); }
  };

  const filteredData = useMemo(() => {
    let res = students;
    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      res = res.filter(s => 
        s.nama.toLowerCase().includes(lower) || 
        s.nim.toLowerCase().includes(lower) ||
        s.study_program?.nama?.toLowerCase().includes(lower)
      );
    }
    if (statusFilter !== "ALL") {
      res = res.filter(s => s.status === statusFilter);
    }
    return res;
  }, [students, searchQuery, statusFilter]);

  const pendingCount = useMemo(() => {
    return students.filter(s => s.status === 'SUBMITTED').length;
  }, [students]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredData.slice(startIndex, endIndex);

  // === ACTIONS ===
  const openDetail = async (mhs: any) => {
    setSelectedStudent(mhs);
    setIsDetailOpen(true);
    setStudentKRS([]);
    setIsLoadingDetail(true);
    try {
        const krs = await getKRSByStudent(mhs.id, selectedYear);
        setStudentKRS(krs);
    } catch (e) { showError("Error", "Gagal load detail"); }
    finally { setIsLoadingDetail(false); }
  };

  const handleAction = async (action: "APPROVE" | "REJECT") => {
    if (!selectedStudent) return;
    const toastId = showLoading(action === "APPROVE" ? "Menyetujui KRS..." : "Menolak KRS...");
    setIsProcessing(true);
    try {
        if (action === "APPROVE") await approveKRS(selectedStudent.id, selectedYear);
        else await rejectKRS(selectedStudent.id, selectedYear);
        
        successAction("KRS", "update", toastId);
        setIsDetailOpen(false);
        fetchStudents();
    } catch (e: any) { showError("Gagal", e.message, toastId); }
    finally { setIsProcessing(false); }
  };

  const handleApproveAll = async () => {
    const toastId = showLoading("Menyetujui semua KRS...");
    setIsProcessing(true);
    try {
        await approveAllKRS(selectedYear);
        successAction("KRS", "update", toastId);
        setIsApproveAllOpen(false);
        await fetchStudents();
    } catch (e: any) { showError("Gagal", e.message, toastId); }
    finally { setIsProcessing(false); }
  };

  // Definisi Kolom DataTable
  const columns: Column<any>[] = [
    {
      header: "#",
      className: "w-[50px] text-center",
      render: (_, index) => <span className="text-muted-foreground">{startIndex + index + 1}</span>,
    },
    {
      header: "Mahasiswa",
      render: (row) => (
        <div>
            <p className="font-medium text-slate-900 text-sm">{row.nama}</p>
            <p className="text-xs text-slate-500 font-mono">{row.nim}</p>
        </div>
      ),
    },
    {
        header: "Program Studi",
        render: (row) => (
            <span className="text-sm text-slate-700">
                {row.study_program?.nama} ({row.study_program?.jenjang})
            </span>
        )
    },
    {
        header: "Semester",
        className: "text-center w-[80px]",
        render: (row) => (
            <div className="text-center font-medium text-slate-700">
                {row.semester}
            </div>
        )
    },
    {
        header: "Status",
        className: "text-center w-[120px]",
        render: (row) => (
            <div className="flex justify-center scale-90">
                <StatusBadge status={row.status} />
            </div>
        )
    },
    {
        header: "Aksi",
        className: "text-center w-[100px]", 
        render: (row) => {
            const isLocked = row.status !== 'SUBMITTED';

            if (isLocked) {
                return (
                    <div className="flex justify-center">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-500 cursor-not-allowed hover:bg-transparent hover:text-slate-500"
                            title="Sudah Diproses"
                            onClick={(e) => e.preventDefault()}
                        >
                            <Lock className="w-4 h-4" />
                        </Button>
                    </div>
                );
            }

            return (
                <div className="flex justify-center">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => openDetail(row)} 
                        className="h-8 w-8 text-indigo-600 hover:bg-indigo-50"
                        title="Tinjau KRS"
                    >
                        <Eye className="w-4 h-4" />
                    </Button>
                </div>
            );
        }
    }
  ];

  const totalSKS = studentKRS.reduce((acc, curr) => acc + (curr.course?.sks || 0), 0);
  const currentAcademicYearName = academicYears.find(y => y.id === selectedYear)?.nama;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 mt-6">
      
      {/* --- Section Filter & Stats --- */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        
        {/* Card Filter */}
        <Card className="md:col-span-8 border-none shadow-md text-white overflow-hidden relative bg-slate-900">
            <div className="absolute top-0 right-0 p-8 opacity-5 text-white"><BookOpen size={150} /></div>
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 to-indigo-600/20" />
            
            <CardContent className="p-4 sm:p-6 relative z-10 flex flex-col justify-between h-full">
                {isLoading ? (
                    <div className="flex flex-col justify-between h-full gap-6">
                        <div className="space-y-2">
                             <Skeleton className="h-4 w-32 opacity-25" />
                             <Skeleton className="h-8 w-64 opacity-25" />
                        </div>
                        <div className="flex gap-4">
                            <Skeleton className="h-10 w-[240px] opacity-25" />
                            <Skeleton className="h-10 w-32 opacity-25 hidden sm:block" />
                        </div>
                    </div>
                ) : (
                    <>
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div>
                            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Validasi KRS Mahasiswa</h2>
                            <p className="text-slate-400 text-sm mt-1">Kelola persetujuan rencana studi mahasiswa untuk semester aktif.</p>
                        </div>
                        <Button 
                            variant="secondary" 
                            className="w-full sm:w-auto flex bg-white/10 hover:bg-white/20 text-white border border-white/10"
                            onClick={() => setIsBulkInputOpen(true)}
                        >
                            <Users className="w-4 h-4 mr-2" />
                            Input Kolektif
                        </Button>
                    </div>
                    <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <Select value={selectedYear} onValueChange={(val) => { setSelectedYear(val); setCurrentPage(1); }}>
                            <SelectTrigger className="w-full sm:w-[240px] h-10 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:ring-0 [&_svg]:text-white [&_svg]:stroke-white [&_svg]:opacity-100">
                                <SelectValue placeholder="Pilih Tahun Akademik" />
                            </SelectTrigger>
                            <SelectContent>
                                {sortedAcademicYears.map((ay) => (
                                <SelectItem key={ay.id} value={ay.id}>TA {ay.nama} - {ay.semester}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <div className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-md border border-white/10">
                            <CalendarDays className="w-4 h-4" />
                            <span className="text-sm font-medium">Semester {academicYears.find(y => y.id === selectedYear)?.semester || '-'}</span>
                        </div>
                    </div>
                    </>
                )}
            </CardContent>
        </Card>

        {/* Card Summary Stats */}
        <Card className="md:col-span-4 border-none shadow-md text-white overflow-hidden relative bg-gradient-to-br from-teal-600 to-emerald-600">
            <div className="absolute -bottom-6 -right-6 opacity-5 rotate-12"><ListTodo size={140} /></div>
            <CardContent className="p-4 sm:p-6 relative z-10 flex flex-col justify-center h-full">
                 {isLoading ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3"><Skeleton className="h-9 w-9 rounded-lg" /><Skeleton className="h-4 w-24" /></div>
                        <div className="space-y-2"><Skeleton className="h-10 w-16" /><Skeleton className="h-3 w-32" /></div>
                    </div>
                 ) : (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                             <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-indigo-50 rounded-xl"><Users className="h-5 w-5 text-indigo-600" /></div>
                                <span className="text-sm font-semibold text-white">Antrean Validasi</span>
                             </div>
                             <Badge className={cn(
                                "rounded-full px-3",
                                pendingCount > 0 ? "bg-orange-100 text-orange-700 hover:bg-orange-100" : "bg-green-100 text-green-700 hover:bg-green-100"
                             )}>
                                {pendingCount > 0 ? "Perlu Tindakan" : "Selesai"}
                             </Badge>
                        </div>
                        <div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">{pendingCount}</span>
                                <span className="text-sm font-medium text-white">Mahasiswa</span>
                            </div>
                            <p className="text-slate-200 text-xs mt-2 mb-4">Menunggu persetujuan KRS untuk TA {currentAcademicYearName}.</p>
                        </div>
                    </div>
                 )}
            </CardContent>
        </Card>
      </div>

      {/* --- Section Table --- */}
      {(() => {
        const activeFilterCount = statusFilter !== "ALL" ? 1 : 0;
        const filterContent = (
          <div className="space-y-4 text-left">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Status Persetujuan KRS</Label>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="w-full h-9">
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Status</SelectItem>
                  <SelectItem value="SUBMITTED">Menunggu Persetujuan</SelectItem>
                  <SelectItem value="APPROVED">Disetujui</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

        return (
          <Card id="krs-table" className="border-none shadow-sm ring-1 ring-gray-200 bg-white">
            <CardContent className="p-4 sm:p-6">
                <DataTable
                    data={currentData}
                    columns={columns}
                    isLoading={isLoading}
                    searchQuery={searchQuery}
                    onSearchChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    startIndex={startIndex}
                    endIndex={endIndex}
                    totalItems={filteredData.length}
                    filterContent={filterContent}
                    isFilterActive={activeFilterCount > 0}
                    activeFilterCount={activeFilterCount}
                    onResetFilter={() => { setStatusFilter("ALL"); setSearchQuery(""); }}
                    onAdd={pendingCount > 0 ? () => setIsApproveAllOpen(true) : undefined}
                    addLabel={`Setujui Semua`}
                    addIcon={<CheckCircle2 className="w-4 h-4 mr-2" />}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                />
            </CardContent>
          </Card>
        );
      })()}

      {/* --- Detail Modal Redesigned --- */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="p-0 gap-0 w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-hidden bg-slate-50/50 flex flex-col border-0 shadow-2xl">
            {/* Header / Hero Section */}
            <div className="relative bg-slate-900 text-white shrink-0 overflow-hidden">
                {/* Decoration */}
                <div className="absolute top-0 right-0 p-12 opacity-10 transform translate-x-1/3 -translate-y-1/3">
                    <GraduationCap size={200} />
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 via-indigo-600/10 to-transparent pointer-events-none" />

                <div className="relative z-10 p-4 sm:p-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
                        {/* Student Info - Rearranged */}
                        <div className="space-y-2">
                            {/* Nama sebagai Judul Utama */}
                            <h2 className="text-2xl sm:text-3xl font-bold leading-tight text-white">
                                {selectedStudent?.nama}
                            </h2>
                            
                            {/* Meta info (NIM, Prodi, Semester) di bawah nama */}
                            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
                                 <div className="bg-white/10 px-3 py-0.5 rounded-full border border-white/10 text-indigo-50 font-mono text-xs">
                                    {selectedStudent?.nim}
                                 </div>
                                 
                                 <span className="text-white/20">|</span>
                                 
                                 {/* Format: Prodi (Jenjang) */}
                                 <span>{selectedStudent?.study_program?.nama} ({selectedStudent?.study_program?.jenjang})</span>
                                 
                                 <span className="text-white/20">|</span>

                                 {/* Semester tanpa titik biru */}
                                 <span>Semester {selectedStudent?.semester}</span>
                            </div>
                        </div>

                        {/* Quick Stats in Header */}
                        <div className="flex gap-3 w-full sm:w-auto">
                            <div className="flex-1 sm:flex-none bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-3 px-4 text-center min-w-[100px]">
                                <p className="text-xs text-slate-300 font-medium uppercase tracking-wider mb-1">Total SKS</p>
                                <p className={cn(
                                    "text-2xl font-bold", 
                                    totalSKS > 24 ? "text-red-300" : "text-white"
                                )}>{totalSKS}</p>
                            </div>
                             <div className="flex-1 sm:flex-none bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-3 px-4 text-center min-w-[100px]">
                                <p className="text-xs text-slate-300 font-medium uppercase tracking-wider mb-1">Matkul</p>
                                <p className="text-2xl font-bold text-white">{studentKRS.length}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto bg-white relative">
                <div className="p-6 pb-24 sm:pb-6 space-y-6">
                    
                    {/* Warning if SKS overload */}
                    {totalSKS > 24 && (
                        <div className="flex gap-3 p-4 rounded-xl bg-red-50 text-red-900 border border-red-100 items-start shadow-sm">
                            <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
                            <div>
                                <p className="font-bold text-sm">Peringatan Kelebihan SKS</p>
                                <p className="text-sm opacity-90 mt-1">
                                    Mahasiswa ini mengambil <strong>{totalSKS} SKS</strong>, yang melebihi batas wajar (biasanya 24 SKS). Mohon tinjau dengan seksama sebelum menyetujui.
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="rounded-xl border border-slate-200 shadow-sm overflow-hidden bg-white">
                        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <LayoutDashboard className="w-4 h-4 text-slate-500" />
                                <h4 className="font-semibold text-slate-800 text-sm">Rencana Studi Diajukan</h4>
                            </div>
                            <span className="text-xs text-slate-500 font-medium bg-white px-3 py-1 rounded-full border">
                                TA {currentAcademicYearName}
                            </span>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-white hover:bg-white border-b-slate-100">
                                        <TableHead className="w-[50px] text-center font-semibold text-slate-600 text-xs uppercase tracking-wider bg-slate-50/50">No</TableHead>
                                        <TableHead className="w-[100px] font-semibold text-slate-600 text-xs uppercase tracking-wider bg-slate-50/50">Kode</TableHead>
                                        <TableHead className="font-semibold text-slate-600 text-xs uppercase tracking-wider bg-slate-50/50">Mata Kuliah</TableHead>
                                        <TableHead className="text-center w-[80px] font-semibold text-slate-600 text-xs uppercase tracking-wider bg-slate-50/50">SKS</TableHead>
                                        <TableHead className="text-center w-[80px] font-semibold text-slate-600 text-xs uppercase tracking-wider bg-slate-50/50">Smt</TableHead>
                                        <TableHead className="text-center w-[140px] font-semibold text-slate-600 text-xs uppercase tracking-wider bg-slate-50/50">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoadingDetail ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <TableRow key={i}>
                                                <TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell>
                                            </TableRow>
                                        ))
                                    ) : studentKRS.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-48 text-center">
                                                <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
                                                    <FileText className="w-10 h-10 opacity-20" />
                                                    <p>Tidak ada data mata kuliah</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        studentKRS.map((k, idx) => (
                                        <TableRow key={k.id} className="hover:bg-slate-50 transition-colors group">
                                            <TableCell className="text-center text-xs text-slate-400">{idx + 1}</TableCell>
                                            <TableCell className="font-mono text-xs font-medium text-slate-600">{k.course?.kode}</TableCell>
                                            <TableCell className="font-medium text-slate-900 group-hover:text-indigo-700 transition-colors">{k.course?.matkul}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="secondary" className="bg-slate-100 text-slate-700 border-0 font-mono font-normal rounded-full px-2.5">
                                                    {k.course?.sks}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center text-xs text-muted-foreground">{k.course?.smt_default}</TableCell>
                                            <TableCell className="text-center">
                                                <StatusBadge status={k.status} />
                                            </TableCell>
                                        </TableRow>
                                    )))}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end items-center gap-6 text-sm">
                            <span className="text-slate-500">Total Beban Studi:</span>
                            <div className="flex items-baseline gap-1">
                                <span className="font-bold text-slate-900 text-lg">{totalSKS}</span>
                                <span className="text-xs text-slate-500">SKS</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Actions */}
            <DialogFooter className="p-4 bg-white border-t border-slate-100 shrink-0 shadow-[0_-5px_20px_rgba(0,0,0,0.02)] z-20">
                <div className="flex w-full flex-col-reverse sm:flex-row justify-between items-center gap-3">
                    <Button 
                        variant="ghost" 
                        onClick={() => setIsDetailOpen(false)}
                        className="text-slate-500 hover:text-slate-800 hover:bg-slate-100 w-full sm:w-auto rounded-full"
                    >
                        Batal
                    </Button>
                    <div className="flex gap-3 w-full sm:w-auto">
                        <Button 
                            variant="outline" 
                            className="flex-1 sm:flex-none border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800 hover:border-rose-300 rounded-full" 
                            onClick={() => handleAction("REJECT")} 
                            disabled={isProcessing}
                        >
                            {isProcessing ? "..." : <><XCircle className="w-4 h-4 mr-2" /> Tolak Ajuan</>}
                        </Button>
                        <Button 
                            className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 rounded-full" 
                            onClick={() => handleAction("APPROVE")} 
                            disabled={isProcessing}
                        >
                            {isProcessing ? "Memproses..." : (
                                <>
                                    <CheckCircle2 className="w-4 h-4 mr-2" /> Setujui KRS
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmModal 
        isOpen={isApproveAllOpen} 
        onClose={setIsApproveAllOpen}
        onConfirm={handleApproveAll}
        title="Setujui Semua Ajuan?"
        description={`Anda akan menyetujui ${pendingCount} pengajuan KRS mahasiswa sekaligus. Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel={isProcessing ? "Memproses..." : "Ya, Setujui Semua"}
        variant="default"
      />

      <BulkKRSInputModal 
        isOpen={isBulkInputOpen} 
        onClose={() => {
            setIsBulkInputOpen(false);
            fetchStudents(); // Refresh data setelah input
        }} 
        initialAcademicYearId={selectedYear}
        availableAcademicYears={sortedAcademicYears}
      />
    </div>
  );
}