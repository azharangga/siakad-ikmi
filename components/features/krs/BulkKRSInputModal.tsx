'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToastMessage } from '@/hooks/use-toast-message';
import { getStudentsWithoutKRS, createBulkKRS, getCoursesForAcademicYear } from '@/app/actions/krs-bulk';
import { getCourses } from '@/app/actions/courses';
import { Course } from '@/lib/types';
import { ChevronRight, ChevronLeft, CalendarDays, CheckCircle2, User, Loader2, ListFilter, UserMinus } from "lucide-react";
import { DataTable, type Column } from "@/components/ui/data-table";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface BulkKRSInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAcademicYearId: string;
  availableAcademicYears: any[];
}

export default function BulkKRSInputModal({
  isOpen,
  onClose,
  initialAcademicYearId,
  availableAcademicYears
}: BulkKRSInputModalProps) {
  const { showLoading, successAction, showError } = useToastMessage();

  // Wizard State
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [targetSemester, setTargetSemester] = useState<number | null>(null);
  
  // Selection State (Period)
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState(initialAcademicYearId);

  // Data State
  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingMsg, setLoadingMsg] = useState<string>('');
  
  // Selection State (Items)
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<string>>(new Set());
  
  // Filter & Pagination State (Students)
  const [studentSearch, setStudentSearch] = useState('');
  const [studentProdiFilter, setStudentProdiFilter] = useState<string[]>([]);
  const [studentMbkmFilter, setStudentMbkmFilter] = useState<boolean>(false); // false: Show All, true: Only MBKM? No, maybe simpler:
  // Let's use specific logic: null = all. But for UI simplicity, let's just toggle "Show Only MBKM" or have list of filters?
  // User asked for "filter button". Dropdown with checkboxes is good.
  // state for "MBKM Only"
  const [studentShowMbkmOnly, setStudentShowMbkmOnly] = useState(false);
  const [excludeMbkmStudents, setExcludeMbkmStudents] = useState(false);
  const [studentPage, setStudentPage] = useState(1);
  const itemsPerPage = 8; 

  // Filter & Pagination State (Courses)
  const [courseSearch, setCourseSearch] = useState('');
  const [courseProdiFilter, setCourseProdiFilter] = useState<string[]>([]);
  const [courseShowMbkmOnly, setCourseShowMbkmOnly] = useState(false);
  const [coursePage, setCoursePage] = useState(1);

  // Initial Sync
  useEffect(() => {
    if (isOpen) {
      if (initialAcademicYearId && !selectedAcademicYearId) {
        setSelectedAcademicYearId(initialAcademicYearId);
      }
      // Reset Wizard on open
      setStep(1);
      setTargetSemester(null);
      setSelectedStudentIds(new Set());
      setSelectedCourseIds(new Set());
      setExcludeMbkmStudents(false);
    }
  }, [isOpen, initialAcademicYearId]);

  // Fetch Data when Year Changes (Background)
  useEffect(() => {
    if (isOpen && selectedAcademicYearId) {
      loadData(selectedAcademicYearId);
    }
  }, [isOpen, selectedAcademicYearId]);

  const loadData = async (yearId: string) => {
    setLoadingMsg('Memuat data...');
    try {
      const [fetchedStudents, fetchedCourses] = await Promise.all([
        getStudentsWithoutKRS(yearId),
        getCoursesForAcademicYear(yearId)
      ]);
      setStudents(fetchedStudents);
      setCourses(fetchedCourses);
    } catch (error) {
      console.error(error);
      showError('Gagal memuat data', 'Terjadi kesalahan saat mengambil data.');
    } finally {
      setLoadingMsg('');
    }
  };

  // --- WIZARD HELPER LOGIC ---
  const currentAcademicYear = availableAcademicYears.find(y => y.id === selectedAcademicYearId);
  const isGanjil = currentAcademicYear?.semester.toLowerCase().includes('ganjil');
  
  // Generate valid semesters based on AY parity
  const availableSemesters = useMemo(() => {
      const semesterOptions = isGanjil ? [1, 3, 5, 7] : [2, 4, 6, 8];
      return semesterOptions;
  }, [isGanjil]);

  // Reset semester selection if AY changes and parity mismatches
  useEffect(() => {
    if (targetSemester && !availableSemesters.includes(targetSemester)) {
        setTargetSemester(null);
    }
  }, [availableSemesters, targetSemester]);

  // Reset pagination, search, and selections whenever targetSemester or step changes
  useEffect(() => {
    setStudentPage(1);
    setCoursePage(1);
    setStudentSearch('');
    setCourseSearch('');
    setStudentProdiFilter([]);
    setCourseProdiFilter([]);
    setSelectedStudentIds(new Set());
    setSelectedCourseIds(new Set());
  }, [targetSemester]);

  // --- DATA FILTERING LOGIC (Applied only in Step 2 & 3) ---
  const uniqueStudentProdis = useMemo(() => {
    const prodis = new Set<string>();
    students.forEach(s => {
        if(s.study_program?.nama) prodis.add(s.study_program.nama);
    });
    return Array.from(prodis).sort();
  }, [students]);

  const uniqueCourseProdis = useMemo(() => {
    const prodis = new Set<string>();
    courses.forEach(c => {
         c.study_programs?.forEach((sp: any) => {
             if(sp.nama) prodis.add(sp.nama);
         })
    });
    return Array.from(prodis).sort();
  }, [courses]);

  const filteredStudents = useMemo(() => {
    // Client-side filter: Match Student Semester to Target Semester
    let base = students;
    if (targetSemester) {
        base = base.filter(s => s.semester === targetSemester);
    }
    
    // Search
    base = base.filter(s => 
      s.nama.toLowerCase().includes(studentSearch.toLowerCase()) || 
      s.nim.toLowerCase().includes(studentSearch.toLowerCase())
    );

    // Filter Prodi
    if (studentProdiFilter.length > 0) {
        base = base.filter(s => s.study_program?.nama && studentProdiFilter.includes(s.study_program.nama));
    }

    // Filter MBKM
    if (studentShowMbkmOnly) {
        base = base.filter(s => s.is_mbkm);
    }

    return base;
  }, [students, studentSearch, targetSemester, studentProdiFilter, studentShowMbkmOnly]);

  const filteredCourses = useMemo(() => {
    // Client-side filter: Match Course Default Semester to Target Semester
    let base = courses;
    if (targetSemester) {
        base = base.filter(c => c.smt_default === targetSemester);
    }

    // Search
    base = base.filter(c => 
      c.matkul.toLowerCase().includes(courseSearch.toLowerCase()) || 
      c.kode.toLowerCase().includes(courseSearch.toLowerCase())
    );

    // Filter Prodi
    if (courseProdiFilter.length > 0) {
         base = base.filter(c => c.study_programs?.some((sp: any) => courseProdiFilter.includes(sp.nama)));
    }

    // Filter MBKM
    if (courseShowMbkmOnly) {
        base = base.filter(c => c.kategori === 'MBKM');
    }

    return base;
  }, [courses, courseSearch, targetSemester, courseProdiFilter, courseShowMbkmOnly]);


  // --- CROSS FILTERING (Reuse existing logic) ---
  const hasMbkmCourseSelected = useMemo(() => {
    return Array.from(selectedCourseIds).some(id => {
        const c = courses.find(course => course.id === id);
        return c?.kategori === 'MBKM';
    });
  }, [selectedCourseIds, courses]);

  const hasRegularStudentSelected = useMemo(() => {
    return Array.from(selectedStudentIds).some(id => {
        const s = students.find(student => student.id === id);
        return !s?.is_mbkm;
    });
  }, [selectedStudentIds, students]);


  // --- TABLE PAGINATION LOGIC ---
  const studentTotalPages = Math.ceil(filteredStudents.length / itemsPerPage) || 1;
  const studentStartIndex = (studentPage - 1) * itemsPerPage;
  const studentEndIndex = studentStartIndex + itemsPerPage;
  const currentStudents = filteredStudents.slice(studentStartIndex, studentEndIndex);

  const courseTotalPages = Math.ceil(filteredCourses.length / itemsPerPage) || 1;
  const courseStartIndex = (coursePage - 1) * itemsPerPage;
  const courseEndIndex = courseStartIndex + itemsPerPage;
  const currentCourses = filteredCourses.slice(courseStartIndex, courseEndIndex);

  // --- TABLE HANDLERS ---
  const toggleStudent = (id: string, allSelected: boolean = false) => {
    const newSet = new Set(selectedStudentIds);
    if(allSelected) {
        // Logic for bulk toggle is handled in render prop usually, but here helper
    }
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedStudentIds(newSet);
  };

  const toggleCourse = (id: string) => {
    const newSet = new Set(selectedCourseIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedCourseIds(newSet);
  };

  // --- COLUMNS DEFINITIONS ---
  const studentColumns: Column<any>[] = [
    {
        header: () => (
            <Checkbox 
                checked={
                    filteredStudents.length > 0 && 
                    filteredStudents.filter(s => {
                        if (hasMbkmCourseSelected && !s.is_mbkm) return false;
                        if (excludeMbkmStudents && s.is_mbkm) return false;
                        return true;
                    }).every(s => selectedStudentIds.has(s.id))
                }
                onCheckedChange={(checked) => {
                    const newSet = new Set(selectedStudentIds);
                    filteredStudents.forEach(s => {
                         if (hasMbkmCourseSelected && !s.is_mbkm) return;
                         if (excludeMbkmStudents && s.is_mbkm) return;
                        if (checked) newSet.add(s.id);
                        else newSet.delete(s.id);
                    });
                    setSelectedStudentIds(newSet);
                }}
                disabled={
                    (hasMbkmCourseSelected && filteredStudents.every(s => !s.is_mbkm)) ||
                    (excludeMbkmStudents && filteredStudents.every(s => s.is_mbkm))
                }
            />
        ),
        className: "w-[40px] text-center",
        render: (row) => {
            const isDisabled = (hasMbkmCourseSelected && !row.is_mbkm) || (excludeMbkmStudents && row.is_mbkm);
            return (
                 <Checkbox 
                    checked={selectedStudentIds.has(row.id)}
                    onCheckedChange={() => toggleStudent(row.id)}
                    disabled={isDisabled}
                    className={isDisabled ? "opacity-30 cursor-not-allowed" : ""}
                />
            );
        }
    },
    { header: "Mahasiswa", render: (row) => {
        const isDisabled = (hasMbkmCourseSelected && !row.is_mbkm) || (excludeMbkmStudents && row.is_mbkm);
        return (
            <div className={cn("flex items-center gap-3", isDisabled && "opacity-40 grayscale")}>
                <div className="relative h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 overflow-hidden shrink-0">
                    {row.avatar_url ? <Image src={row.avatar_url} alt={row.nama} fill className="object-cover" /> : <User className="h-4 w-4 text-slate-400" />}
                </div>
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 text-sm">{row.nama}</span>
                        {row.is_mbkm && <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-slate-100 text-slate-600 border border-slate-200 font-medium">MBKM</Badge>}
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">{row.nim}</span>
                </div>
            </div>
        );
    }},
    { header: "Prodi", render: (row) => {
        const isDisabled = (hasMbkmCourseSelected && !row.is_mbkm) || (excludeMbkmStudents && row.is_mbkm);
        return <span className={cn("text-xs text-slate-500", isDisabled && "opacity-40 grayscale")}>{row.study_program?.nama} ({row.study_program?.jenjang})</span>
    }}
  ];

  const courseColumns: Column<Course>[] = [
    {
        header: () => (
            <Checkbox 
                checked={filteredCourses.length > 0 && filteredCourses.filter(c => !(hasRegularStudentSelected && c.kategori === 'MBKM')).every(c => selectedCourseIds.has(c.id))}
                onCheckedChange={(checked) => {
                    const newSet = new Set(selectedCourseIds);
                    filteredCourses.forEach(c => {
                        if (hasRegularStudentSelected && c.kategori === 'MBKM') return;
                        if (checked) newSet.add(c.id);
                        else newSet.delete(c.id);
                    });
                    setSelectedCourseIds(newSet);
                }}
                disabled={hasRegularStudentSelected && filteredCourses.every(c => c.kategori === 'MBKM')}
            />
        ),
        className: "w-[40px] text-center",
        render: (row) => {
            const isDisabled = hasRegularStudentSelected && row.kategori === 'MBKM';
            return (
                <Checkbox checked={selectedCourseIds.has(row.id)} onCheckedChange={() => toggleCourse(row.id)} disabled={isDisabled} className={isDisabled ? "opacity-30" : ""}/>
            )
        }
    },
    { header: "Mata Kuliah", render: (row) => {
        const isDisabled = hasRegularStudentSelected && row.kategori === 'MBKM';
        return (
            <div className={cn("flex flex-col", isDisabled && "opacity-40 grayscale")}>
                <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900 text-sm">{row.matkul}</span>
                    {row.kategori === 'MBKM' && <Badge variant="secondary" className="text-[9px] h-4 bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0 font-medium">MBKM</Badge>}
                </div>
                <span className="text-xs text-slate-500 font-mono">{row.kode}</span>
            </div>
        );
    }},
    { header: "SKS", className: "text-center w-[60px]", render: (row) => {
        const isDisabled = hasRegularStudentSelected && row.kategori === 'MBKM';
        return <Badge variant="secondary" className={cn("font-mono text-[10px]", isDisabled && "opacity-40")}>{row.sks}</Badge>;
    }}
  ];


  // --- SUBMIT ---
  const handleSubmit = async () => {
    if (selectedStudentIds.size === 0 || selectedCourseIds.size === 0) return;
    const toastId = showLoading('Menyimpan KRS Kolektif...');
    try {
      await createBulkKRS({
        academicYearId: selectedAcademicYearId,
        studentIds: Array.from(selectedStudentIds),
        courseIds: Array.from(selectedCourseIds)
      });
      successAction('KRS Kolektif', 'create', toastId);
      onClose();
    } catch (error: any) {
      showError('Gagal menyimpan', error.message, toastId);
    }
  };

  const totalSKS = Array.from(selectedCourseIds).reduce((acc, cId) => acc + (courses.find(c => c.id === cId)?.sks || 0), 0);
  
  // --- LOADING SKELETON ---
  const renderLoading = () => {
    // Render Step 1 Skeleton usually, or generic
    if (step === 1) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50/50">
                <div className="w-full max-w-lg space-y-8">
                     <div className="flex flex-col items-center space-y-4">
                        <Skeleton className="w-12 h-12 rounded-full" />
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-4 w-96" />
                     </div>
                     <div className="bg-white p-6 rounded-xl border shadow-sm space-y-6">
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-6 w-32" />
                        <div className="grid grid-cols-4 gap-3">
                             {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
                        </div>
                     </div>
                </div>
            </div>
        )
    }
    // Generic table skeleton for Step 2
    return (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
             <div className="flex-1 border-r border-slate-200 bg-white p-4 space-y-4">
                 <div className="flex justify-between"><Skeleton className="h-6 w-32" /><Skeleton className="h-6 w-10" /></div>
                 <div className="space-y-3">
                    {[1,2,3,4,5].map(i => <div key={i} className="flex items-center gap-3"><Skeleton className="h-8 w-8 rounded-full" /><div className="space-y-1 flex-1"><Skeleton className="h-4 w-full" /><Skeleton className="h-3 w-20" /></div></div>)}
                 </div>
             </div>
             <div className="flex-[1.2] bg-slate-50/50 p-4 space-y-4">
                 <div className="flex justify-between"><Skeleton className="h-6 w-32" /><Skeleton className="h-6 w-20" /></div>
                  <div className="space-y-3">
                    {[1,2,3,4,5].map(i => <div key={i} className="flex items-center gap-3"><Skeleton className="h-4 w-4" /><div className="space-y-1 flex-1"><Skeleton className="h-4 w-full" /><Skeleton className="h-3 w-16" /></div><Skeleton className="h-5 w-10" /></div>)}
                 </div>
             </div>
        </div>
    )
  }

  // --- FILTER CONTENT ---
  const studentFilterContent = (
      <>
        <DropdownMenuLabel>Filter Mahasiswa</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
            checked={studentShowMbkmOnly}
            onCheckedChange={setStudentShowMbkmOnly}
        >
            MBKM Only
        </DropdownMenuCheckboxItem>
        {uniqueStudentProdis.length > 0 && (
            <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Prodi</DropdownMenuLabel>
                {uniqueStudentProdis.map(prodi => (
                    <DropdownMenuCheckboxItem
                        key={prodi}
                        checked={studentProdiFilter.includes(prodi)}
                        onCheckedChange={(checked) => {
                            setStudentProdiFilter(prev => 
                                checked ? [...prev, prodi] : prev.filter(p => p !== prodi)
                            );
                            setStudentPage(1);
                        }}
                    >
                        {prodi}
                    </DropdownMenuCheckboxItem>
                ))}
            </>
        )}
      </>
  );

  const courseFilterContent = (
      <>
        <DropdownMenuLabel>Filter Mata Kuliah</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
            checked={courseShowMbkmOnly}
            onCheckedChange={setCourseShowMbkmOnly}
        >
            MBKM Only
        </DropdownMenuCheckboxItem>
        {uniqueCourseProdis.length > 0 && (
            <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Prodi</DropdownMenuLabel>
                {uniqueCourseProdis.map(prodi => (
                    <DropdownMenuCheckboxItem
                        key={prodi}
                        checked={courseProdiFilter.includes(prodi)}
                        onCheckedChange={(checked) => {
                            setCourseProdiFilter(prev => 
                                checked ? [...prev, prodi] : prev.filter(p => p !== prodi)
                            );
                            setCoursePage(1);
                        }}
                    >
                        {prodi}
                    </DropdownMenuCheckboxItem>
                ))}
            </>
        )}
      </>
  );

  // --- RENDER STEPS ---
  
  // STEP 1: SELECT PERIOD & SEMESTER
  const renderStep1 = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50/50">
        <div className="w-full max-w-lg space-y-8">
            <div className="text-center space-y-2">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <CalendarDays className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Pilih Periode Akademik dan Semester</h2>
                <p className="text-slate-500">Tentukan Periode akademik dan semester untuk input KRS Kolektif.</p>
            </div>

            <div className="bg-white p-6 rounded-xl border shadow-sm space-y-6">
                <div className="space-y-3">
                    <Label>Periode Akademik</Label>
                    <Select value={selectedAcademicYearId} onValueChange={setSelectedAcademicYearId}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Pilih Tahun Akademik" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableAcademicYears.map(year => (
                                <SelectItem key={year.id} value={year.id}>{year.nama} ({year.semester})</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-3">
                    <Label>Semester ({isGanjil ? 'Ganjil' : 'Genap'})</Label>
                    {availableAcademicYears.length > 0 ? (
                        <div className="grid grid-cols-4 gap-3">
                            {availableSemesters.map(smt => (
                                <div 
                                    key={smt}
                                    onClick={() => setTargetSemester(smt)}
                                    className={cn(
                                        "cursor-pointer rounded-lg border-2 p-3 text-center transition-all hover:border-primary/30 hover:bg-primary/5",
                                        targetSemester === smt ? "border-primary bg-primary/10 text-primary font-bold" : "border-slate-100 bg-slate-50 text-slate-600"
                                    )}
                                >
                                    <span className="text-lg">{smt}</span>
                                    <span className="block text-[10px] uppercase text-muted-foreground font-normal">Semester</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                         <div className="text-sm text-red-500">Data Tahun Akademik tidak tersedia.</div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );

  // STEP 2: TABLES
  // (Reusing the dual pane layout)
  const renderStep2 = () => (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left: Students */}
        <div className="flex-1 border-r border-slate-200 bg-white flex flex-col min-w-0 h-full overflow-hidden">
            <div className="flex-1 p-4 overflow-y-auto">
                <h3 className="font-semibold text-slate-800 mb-4 flex justify-between items-center">
                    <span>Mahasiswa Semester {targetSemester}</span>
                    <Badge variant="secondary">{filteredStudents.length}</Badge>
                </h3>
                <DataTable
                    data={currentStudents}
                    columns={studentColumns}
                    isLoading={!!loadingMsg}
                    searchQuery={studentSearch}
                    onSearchChange={(e) => { setStudentSearch(e.target.value); setStudentPage(1); }}
                    searchPlaceholder="Cari Nama / NIM..."
                    customActions={
                        <Button
                            variant={excludeMbkmStudents ? "destructive" : "outline"}
                            size="icon"
                            onClick={() => {
                                const newValue = !excludeMbkmStudents;
                                setExcludeMbkmStudents(newValue);
                                if (newValue) {
                                    const newSet = new Set(selectedStudentIds);
                                    students.forEach(s => {
                                        if (s.is_mbkm) newSet.delete(s.id);
                                    });
                                    setSelectedStudentIds(newSet);
                                }
                            }}
                            className="h-9 w-9"
                            title={excludeMbkmStudents ? "Batalkan Pengecualian MBKM" : "Kecualikan Mahasiswa MBKM"}
                        >
                            <UserMinus className="h-4 w-4" />
                        </Button>
                    }
                    filterContent={studentFilterContent}
                    isFilterActive={studentProdiFilter.length > 0 || studentShowMbkmOnly}
                    onResetFilter={() => {
                        setStudentProdiFilter([]);
                        setStudentShowMbkmOnly(false);
                        setStudentSearch('');
                        setStudentPage(1);
                    }}
                    currentPage={studentPage}
                    totalPages={studentTotalPages}
                    onPageChange={setStudentPage}
                    startIndex={studentStartIndex}
                    endIndex={studentEndIndex}
                    totalItems={filteredStudents.length}
                />
            </div>
            <div className="p-3 border-t bg-slate-50 text-xs text-slate-500 text-center">
                {selectedStudentIds.size} mahasiswa dipilih
            </div>
        </div>

        {/* Right: Courses */}
        <div className="flex-1 bg-white flex flex-col min-w-0 h-full overflow-hidden">
            <div className="flex-1 p-4 overflow-y-auto">
                 <h3 className="font-semibold text-slate-800 mb-4 flex justify-between items-center">
                    <span>Matkul Semester {targetSemester}</span>
                    <div className="flex gap-2 items-center">
                        <span className={totalSKS > 24 ? "text-red-600 font-bold text-sm" : "text-slate-700 text-sm"}>
                            Total: {totalSKS} SKS
                        </span>
                    </div>
                </h3>
                <DataTable
                    data={currentCourses}
                    columns={courseColumns}
                    isLoading={!!loadingMsg}
                    searchQuery={courseSearch}
                    onSearchChange={(e) => { setCourseSearch(e.target.value); setCoursePage(1); }}
                    searchPlaceholder="Cari Matkul..."
                    customActions={undefined}
                    filterContent={courseFilterContent}
                    isFilterActive={courseProdiFilter.length > 0 || courseShowMbkmOnly}
                    onResetFilter={() => {
                         setCourseProdiFilter([]);
                         setCourseShowMbkmOnly(false);
                         setCourseSearch('');
                         setCoursePage(1);
                    }}
                    currentPage={coursePage}
                    totalPages={courseTotalPages}
                    onPageChange={setCoursePage}
                    startIndex={courseStartIndex}
                    endIndex={courseEndIndex}
                    totalItems={filteredCourses.length}
                />
            </div>
             <div className="p-3 border-t bg-slate-50 border-l border-slate-200 text-xs text-slate-500 text-center">
                {selectedCourseIds.size} mata kuliah dipilih
            </div>
        </div>
    </div>
  );

  // STEP 3: CONFIRM
  const renderStep3 = () => (
     <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50/50">
        <div className="w-full max-w-2xl bg-white p-8 rounded-2xl border shadow-sm text-center space-y-8">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center animate-in zoom-in duration-300">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            
            <div className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-900">Konfirmasi Input Kolektif</h2>
                <p className="text-slate-500">Pastikan data berikut sudah benar sebelum menyimpan.</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-left">
                <div className="p-4 bg-slate-50 rounded-xl border space-y-1">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Target</p>
                    <p className="text-lg font-bold text-slate-900">{selectedStudentIds.size} Mahasiswa</p>
                    <p className="text-sm text-slate-500">Semester {targetSemester}</p>
                </div>
                 <div className="p-4 bg-slate-50 rounded-xl border space-y-1">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Kontrak</p>
                    <p className="text-lg font-bold text-slate-900">{selectedCourseIds.size} Mata Kuliah</p>
                    <p className="text-sm text-slate-500">Total {totalSKS} SKS</p>
                </div>
            </div>

            <div className="text-sm text-slate-500 bg-yellow-50 text-yellow-700 p-3 rounded-lg border border-yellow-100">
                Data KRS akan disimpan dengan status <strong>APPROVED</strong> secara otomatis.
            </div>
        </div>
    </div>
  );


  // --- MAIN RENDER ---
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[95vw] w-[95vw] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-slate-50">
        <DialogHeader className="px-6 py-4 border-b bg-white shrink-0 relative flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="flex items-center gap-2">
            Input KRS Kolektif
            {step > 1 && <span className="font-normal text-slate-400">/ Langkah {step}</span>}
          </DialogTitle>
          
          {/* Step Indicator */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex items-center gap-2 text-sm text-slate-500">
             <span className={cn(step === 1 ? "text-primary font-bold" : step > 1 ? "text-slate-900 font-medium" : "")}>1. Periode</span>
             <ChevronRight className="w-4 h-4" />
             <span className={cn(step === 2 ? "text-primary font-bold" : step > 2 ? "text-slate-900 font-medium" : "")}>2. Seleksi</span>
             <ChevronRight className="w-4 h-4" />
             <span className={cn(step === 3 ? "text-primary font-bold" : "")}>3. Konfirmasi</span>
          </div>
        </DialogHeader>

        {loadingMsg ? renderLoading() : (
            <>
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
            </>
        )}

        <DialogFooter className="p-4 border-t bg-white shrink-0">
             <div className="flex w-full items-center justify-between">
                <Button variant="ghost" onClick={onClose}>Batal</Button>
                
                <div className="flex gap-2">
                    {step > 1 && (
                        <Button variant="outline" onClick={() => setStep(s => s - 1 as any)}>
                            <ChevronLeft className="w-4 h-4 mr-2" />
                            Kembali
                        </Button>
                    )}
                    
                    {step < 3 ? (
                        <Button 
                            onClick={() => setStep(s => s + 1 as any)} 
                            disabled={
                                (step === 1 && !targetSemester) ||
                                (step === 2 && (selectedStudentIds.size === 0 || selectedCourseIds.size === 0))
                            }
                        >
                            Lanjut
                            <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                    ) : (
                         <Button onClick={handleSubmit}>
                            Simpan Data
                        </Button>
                    )}
                </div>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
