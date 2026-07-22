"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import { useToastMessage } from "@/hooks/use-toast-message";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, type Column } from "@/components/ui/data-table";
import { FormModal } from "@/components/shared/FormModal";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import Tooltip from "@/components/shared/Tooltip";
import { CourseForm } from "@/components/features/matakuliah/CourseForm";
import { type Course as CourseData, type CourseFormValues, type CourseCategory, type StudyProgram } from "@/lib/types";
import { createCourse, updateCourse, deleteCourse } from "@/app/actions/courses";

interface MataKuliahClientProps {
  initialData: CourseData[];
  studyPrograms: StudyProgram[];
}

export default function MataKuliahClient({ initialData, studyPrograms }: MataKuliahClientProps) {
  const { successAction, confirmDeleteMessage, showError, showLoading } = useToastMessage();
  const router = useRouter();

  // State data lokal diinisialisasi dari props server
  const [courses, setCourses] = useState<CourseData[]>(initialData); 
  const [isLoading, setIsLoading] = useState(false); // Default false karena data sudah ada
  const [isSaving, setIsSaving] = useState(false);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CourseCategory | "ALL">("ALL");
  const [semesterFilter, setSemesterFilter] = useState<string>("ALL");
  const [prodiFilter, setProdiFilter] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal States
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState<string>(""); 
  const [formData, setFormData] = useState<CourseFormValues | undefined>(undefined);

  // Jika props berubah (misal shallow routing), update state
  // (Opsional, tergantung kebutuhan real-time)
  React.useEffect(() => {
    setCourses(initialData);
  }, [initialData]);

  // --- FILTER LOGIC ---
  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const matchSearch = 
        course.matkul.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.kode.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCategory = categoryFilter === "ALL" || course.kategori === categoryFilter;
      const matchSemester = semesterFilter === "ALL" || course.smt_default.toString() === semesterFilter;
      const matchProdi = prodiFilter === "ALL" || (course.study_programs && course.study_programs.some(sp => sp.nama === prodiFilter));
      
      return matchSearch && matchCategory && matchSemester && matchProdi;
    });
  }, [courses, searchQuery, categoryFilter, semesterFilter, prodiFilter]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredCourses.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage; 
  const currentData = filteredCourses.slice(startIndex, endIndex);

  // --- HANDLERS ---
  const handleOpenAdd = () => {
    setFormData(undefined);
    setSelectedId(null);
    setIsEditing(false);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (course: CourseData) => {
    setSelectedId(course.id); 
    setFormData({
      kode: course.kode,
      matkul: course.matkul,
      sks: course.sks,
      smt_default: course.smt_default,
      kategori: course.kategori as CourseCategory,
      study_program_ids: course.study_programs?.map(sp => sp.id) || []
    });
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const handleDelete = (course: CourseData) => {
    setSelectedId(course.id);
    setDeleteName(course.matkul);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedId) {
      const toastId = showLoading("Menghapus data..."); 
      try {
        await deleteCourse(selectedId);
        successAction("Mata Kuliah", "delete", toastId);
        
        // Optimistic Update atau Refresh
        // Disini kita bisa refresh via router.refresh() agar SC merender ulang
        // Atau manual update state lokal untuk feedback instan:
        setCourses(prev => prev.filter(c => c.id !== selectedId));
        
        if (currentData.length === 1 && currentPage > 1) {
          setCurrentPage((prev) => prev - 1);
        }
      } catch (error: any) {
        showError("Gagal Menghapus", error.message, toastId);
      }
    }
    setIsDeleteOpen(false);
  };

  const handleFormSubmit = async (values: CourseFormValues) => {
    setIsSaving(true);
    const toastId = showLoading("Menyimpan data...");

    try {
      if (isEditing && selectedId) {
        await updateCourse(selectedId, values);
        successAction("Mata Kuliah", "update", toastId);
        // Manual update state jika tidak ingin full reload
        // Tapi untuk konsistensi data SC, sebaiknya router.refresh()
      } else {
        await createCourse(values);
        successAction("Mata Kuliah", "create", toastId);
      }
      
      router.refresh();
      setIsDialogOpen(false);
    } catch (error: any) {
      showError("Gagal Menyimpan", error.message, toastId);
    } finally {
      setIsSaving(false);
    }
  };

  // --- COLUMNS ---
  const columns: Column<CourseData>[] = [
    { 
      header: "#", 
      className: "w-[50px] text-center", 
      render: (_, index) => <span className="text-muted-foreground font-medium">{startIndex + index + 1}</span> 
    },
    { 
      header: "Kode MK", 
      accessorKey: "kode", 
      className: "font-medium" 
    },
    { 
      header: "Mata Kuliah", 
      className: "max-w-[250px]",
      render: (row) => <Tooltip content={row.matkul} position="top"><div className="truncate text-gray-700 font-medium cursor-default">{row.matkul}</div></Tooltip>
    },
    { 
      header: "SKS", 
      accessorKey: "sks", 
      className: "text-center w-[100px] text-gray-700" 
    },
    { 
      header: "Semester", 
      accessorKey: "smt_default", 
      className: "text-center w-[100px] text-gray-700" 
    },
    {
      header: "Kategori",
      accessorKey: "kategori",
      className: "w-[100px]",
      render: (row) => <Badge variant="outline" className="font-normal border-gray-300 text-gray-600">{row.kategori}</Badge>
    },
    {
      header: "Program Studi",
      className: "max-w-[200px]",
      render: (row) => {
        const programs = row.study_programs || [];
        if (programs.length === 0) {
          return <span className="text-xs text-muted-foreground">-</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {programs.slice(0, 2).map((sp) => (
              <Badge key={sp.id} variant="secondary" className="text-xs font-normal">
                {sp.nama}
              </Badge>
            ))}
            {programs.length > 2 && (
              <Tooltip content={programs.slice(2).map(sp => sp.nama).join(", ")} position="top">
                <Badge variant="secondary" className="text-xs font-normal cursor-default">
                  +{programs.length - 2}
                </Badge>
              </Tooltip>
            )}
          </div>
        );
      }
    },
    {
      header: "Aksi",
      className: "text-center w-[100px]",
      render: (row) => (
        <div className="flex items-center justify-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50" onClick={() => handleOpenEdit(row)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" 
            onClick={() => handleDelete(row)} 
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  const activeFilterCount = [
    categoryFilter !== "ALL",
    semesterFilter !== "ALL",
    prodiFilter !== "ALL"
  ].filter(Boolean).length;

  const filterContent = (
    <div className="space-y-4 text-left">
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-slate-700">Program Studi</Label>
        <Select value={prodiFilter} onValueChange={(v) => { setProdiFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-full h-9">
            <SelectValue placeholder="Semua Program Studi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua Program Studi</SelectItem>
            {studyPrograms.map(p => (
              <SelectItem key={p.id} value={p.nama}>{p.nama}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-700">Kategori</Label>
          <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v as any); setCurrentPage(1); }}>
            <SelectTrigger className="w-full h-9">
              <SelectValue placeholder="Semua Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Kategori</SelectItem>
              <SelectItem value="Reguler">Reguler</SelectItem>
              <SelectItem value="MBKM">MBKM</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-700">Semester</Label>
          <Select value={semesterFilter} onValueChange={(v) => { setSemesterFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-full h-9">
              <SelectValue placeholder="Semua Semester" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Semester</SelectItem>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <SelectItem key={i} value={i.toString()}>Semester {i}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 pb-10 animate-in fade-in duration-500">
      <PageHeader title="Mata Kuliah" breadcrumb={["Beranda", "Mata Kuliah"]} />

      <Card className="border-none shadow-sm ring-1 ring-gray-200">
        <CardContent className="p-4 sm:p-6">
          <DataTable 
            data={currentData}
            columns={columns}
            isLoading={isLoading}
            searchQuery={searchQuery}
            onSearchChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            searchPlaceholder="Cari Matkul..."
            onAdd={handleOpenAdd}
            filterContent={filterContent}
            isFilterActive={activeFilterCount > 0}
            activeFilterCount={activeFilterCount}
            onResetFilter={() => { setCategoryFilter("ALL"); setSemesterFilter("ALL"); setProdiFilter("ALL"); setSearchQuery(""); }}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            startIndex={startIndex}
            endIndex={endIndex} 
            totalItems={filteredCourses.length}
          />
        </CardContent>
      </Card>

      <FormModal
        isOpen={isDialogOpen}
        onClose={setIsDialogOpen}
        title={isEditing ? "Edit Mata Kuliah" : "Tambah Mata Kuliah"}
        description={isEditing ? `Edit data ${formData?.matkul}` : "Lengkapi detail mata kuliah di bawah ini."}
        maxWidth="sm:max-w-[600px]"
      >
        <CourseForm
            key={isEditing && selectedId ? `edit-${selectedId}` : "create-new"} 
            initialData={formData}
            isEditing={isEditing}
            isLoading={isSaving}
            studyPrograms={studyPrograms}
            onSubmit={handleFormSubmit}
            onCancel={() => setIsDialogOpen(false)}
        />
      </FormModal>

      <ConfirmModal 
        isOpen={isDeleteOpen}
        onClose={setIsDeleteOpen}
        onConfirm={confirmDelete}
        title="Hapus Mata Kuliah?"
        description={confirmDeleteMessage("Mata Kuliah", deleteName)}
        confirmLabel="Hapus Permanen"
        variant="destructive"
      />
    </div>
  );
}
