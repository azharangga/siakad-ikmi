"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import { useToastMessage } from "@/hooks/use-toast-message";
import { Pencil, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { FormModal } from "@/components/shared/FormModal";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { AcademicYearForm } from "@/components/features/academic-year/AcademicYearForm";
import { AcademicYear, AcademicYearFormValues } from "@/lib/types";
import { createAcademicYear, updateAcademicYear, deleteAcademicYear } from "@/app/actions/academic-years";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface listProps {
  initialData: AcademicYear[];
}

export default function AcademicYearClient({ initialData }: listProps) {
  const { successAction, confirmDeleteMessage, showError, showLoading } = useToastMessage();
  const router = useRouter();

  const [dataList, setDataList] = useState<AcademicYear[]>(initialData); 
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Pagination, Search, & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [semesterFilter, setSemesterFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal States
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState<string>(""); 
  const [formData, setFormData] = useState<AcademicYearFormValues | undefined>(undefined);

  React.useEffect(() => {
    setDataList(initialData);
  }, [initialData]);

  // --- FILTER LOGIC ---
  const filteredData = useMemo(() => {
    return dataList.filter((item) => {
      // 1. Filter Search
      const matchSearch = 
        item.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.semester.toLowerCase().includes(searchQuery.toLowerCase());
      
      // 2. Filter Status (Dropdown)
      let matchStatus = true;
      if (statusFilter === "active") {
        matchStatus = item.is_active === true;
      } else if (statusFilter === "inactive") {
        matchStatus = item.is_active === false;
      }

      const matchSemester = semesterFilter === "ALL" || item.semester === semesterFilter;

      return matchSearch && matchStatus && matchSemester;
    });
  }, [dataList, searchQuery, statusFilter, semesterFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage; 
  const currentData = filteredData.slice(startIndex, endIndex);

  // --- HANDLERS ---
  const handleOpenAdd = () => {
    setFormData(undefined);
    setSelectedId(null);
    setIsEditing(false);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (item: AcademicYear) => {
    setSelectedId(item.id); 
    setFormData({
      nama: item.nama,
      semester: item.semester,
      is_active: item.is_active
    });
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const handleDelete = (item: AcademicYear) => {
    setSelectedId(item.id);
    setDeleteName(`${item.nama} - ${item.semester}`);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedId) {
      const toastId = showLoading("Menghapus data..."); 
      try {
        await deleteAcademicYear(selectedId);
        successAction("Tahun Akademik", "delete", toastId);
        
        setDataList(prev => prev.filter(p => p.id !== selectedId));

        if (currentData.length === 1 && currentPage > 1) {
          setCurrentPage((prev) => prev - 1);
        }
      } catch (error: any) {
        showError("Gagal Menghapus", error.message, toastId);
      }
    }
    setIsDeleteOpen(false);
  };

  const handleFormSubmit = async (values: AcademicYearFormValues) => {
    setIsSaving(true);
    const toastId = showLoading("Menyimpan data...");

    try {
      if (isEditing && selectedId) {
        await updateAcademicYear(selectedId, values);
        successAction("Tahun Akademik", "update", toastId);
      } else {
        await createAcademicYear(values);
        successAction("Tahun Akademik", "create", toastId);
      }
      setIsDialogOpen(false);
      router.refresh();
    } catch (error: any) {
      showError("Gagal Menyimpan", error.message, toastId);
    } finally {
      setIsSaving(false);
    }
  };

  // --- COLUMNS ---
  const columns: Column<AcademicYear>[] = [
    { 
      header: "#", 
      className: "w-[50px] text-center", 
      render: (_, index) => <span className="text-muted-foreground font-medium">{startIndex + index + 1}</span> 
    },
    { 
      header: "Tahun Akademik", 
      accessorKey: "nama", 
      className: "font-medium" 
    },
    { 
      header: "Semester", 
      accessorKey: "semester",
      className: "w-[150px]",
    },
    {
      header: "Status",
      accessorKey: "is_active",
      className: "text-center w-[120px]",
      render: (row) => (
        <Badge 
          variant={row.is_active ? "default" : "destructive"} 
          className={`font-normal ${row.is_active ? "bg-green-600" : ""}`}
        >
          {row.is_active ? (
            <CheckCircle2 className="mr-1 h-3 w-3" />
          ) : (
            <XCircle className="mr-1 h-3 w-3" />
          )}
          {row.is_active ? "Aktif" : "Non-Aktif"}
        </Badge>
      )
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
    statusFilter !== "ALL",
    semesterFilter !== "ALL"
  ].filter(Boolean).length;

  const filterContent = (
    <div className="space-y-4 text-left">
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-slate-700">Status Tahun Akademik</Label>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-full h-9">
            <SelectValue placeholder="Semua Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua Status</SelectItem>
            <SelectItem value="active">Aktif</SelectItem>
            <SelectItem value="inactive">Non-Aktif</SelectItem>
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
            <SelectItem value="Ganjil">Ganjil</SelectItem>
            <SelectItem value="Genap">Genap</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 pb-10 animate-in fade-in duration-500">
      <PageHeader title="Tahun Akademik" breadcrumb={["Beranda", "Tahun Akademik"]} />

      <Card className="border-none shadow-sm ring-1 ring-gray-200">
        <CardContent className="p-4 sm:p-6">
          <DataTable 
            data={currentData}
            columns={columns}
            isLoading={isLoading}
            searchQuery={searchQuery}
            onSearchChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            searchPlaceholder="Cari Tahun/Semester..."
            onAdd={handleOpenAdd}
            
            // Props untuk Filter
            filterContent={filterContent}
            isFilterActive={activeFilterCount > 0}
            activeFilterCount={activeFilterCount}
            onResetFilter={() => {
              setStatusFilter("ALL");
              setSemesterFilter("ALL");
              setSearchQuery("");
              setCurrentPage(1);
            }}

            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            startIndex={startIndex}
            endIndex={endIndex} 
            totalItems={filteredData.length}
          />
        </CardContent>
      </Card>

      <FormModal
        isOpen={isDialogOpen}
        onClose={setIsDialogOpen}
        title={isEditing ? "Edit Tahun Akademik" : "Tambah Tahun Akademik"}
        description={isEditing ? "Perbarui informasi tahun akademik." : "Tambahkan periode tahun akademik baru."}
        maxWidth="sm:max-w-[500px]"
      >
        <AcademicYearForm
            key={isEditing && selectedId ? `edit-${selectedId}` : "create-new"} 
            initialData={formData}
            isEditing={isEditing}
            isLoading={isSaving}
            onSubmit={handleFormSubmit}
            onCancel={() => setIsDialogOpen(false)}
        />
      </FormModal>

      <ConfirmModal 
        isOpen={isDeleteOpen}
        onClose={setIsDeleteOpen}
        onConfirm={confirmDelete}
        title="Hapus Tahun Akademik?"
        description={confirmDeleteMessage("Tahun Akademik", deleteName)}
        confirmLabel="Hapus Permanen"
        variant="destructive"
      />
    </div>
  );
}
