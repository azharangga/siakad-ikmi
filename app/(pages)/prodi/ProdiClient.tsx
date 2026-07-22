"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import { useToastMessage } from "@/hooks/use-toast-message";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { FormModal } from "@/components/shared/FormModal";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { ProdiForm } from "@/components/features/prodi/ProdiForm";
import { StudyProgram, StudyProgramFormValues } from "@/lib/types";
import { createStudyProgram, updateStudyProgram, deleteStudyProgram } from "@/app/actions/prodi";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProdiClientProps {
  initialData: StudyProgram[];
}

export default function ProdiClient({ initialData }: ProdiClientProps) {
  const { successAction, confirmDeleteMessage, showError, showLoading } = useToastMessage();
  const router = useRouter();

  const [prodiList, setProdiList] = useState<StudyProgram[]>(initialData); 
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [jenjangFilter, setJenjangFilter] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal States
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState<string>(""); 
  const [formData, setFormData] = useState<StudyProgramFormValues | undefined>(undefined);

  React.useEffect(() => {
    setProdiList(initialData);
  }, [initialData]);

  // --- FILTER LOGIC ---
  const filteredData = useMemo(() => {
    return prodiList.filter((item) => {
      const matchSearch = 
        item.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.kode.toLowerCase().includes(searchQuery.toLowerCase());
      const matchJenjang = jenjangFilter === "ALL" || item.jenjang === jenjangFilter;
      
      return matchSearch && matchJenjang;
    });
  }, [prodiList, searchQuery, jenjangFilter]);

  // Pagination Logic
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

  const handleOpenEdit = (item: StudyProgram) => {
    setSelectedId(item.id); 
    setFormData({
      kode: item.kode,
      nama: item.nama,
      jenjang: item.jenjang
    });
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const handleDelete = (item: StudyProgram) => {
    setSelectedId(item.id);
    setDeleteName(item.nama);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedId) {
      const toastId = showLoading("Menghapus data..."); 
      try {
        await deleteStudyProgram(selectedId);
        successAction("Program Studi", "delete", toastId);
        
        setProdiList(prev => prev.filter(p => p.id !== selectedId));
        
        if (currentData.length === 1 && currentPage > 1) {
          setCurrentPage((prev) => prev - 1);
        }
      } catch (error: any) {
        showError("Gagal Menghapus", error.message, toastId);
      }
    }
    setIsDeleteOpen(false);
  };

  const handleFormSubmit = async (values: StudyProgramFormValues) => {
    setIsSaving(true);
    const toastId = showLoading("Menyimpan data...");

    try {
      if (isEditing && selectedId) {
        await updateStudyProgram(selectedId, values);
        successAction("Program Studi", "update", toastId);
      } else {
        await createStudyProgram(values);
        successAction("Program Studi", "create", toastId);
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
  const columns: Column<StudyProgram>[] = [
    { 
      header: "#", 
      className: "w-[50px] text-center", 
      render: (_, index) => <span className="text-muted-foreground font-medium">{startIndex + index + 1}</span> 
    },
    { 
      header: "Kode", 
      accessorKey: "kode", 
      className: "font-medium w-[100px]" 
    },
    { 
      header: "Program Studi", 
      accessorKey: "nama",
      className: "min-w-[200px]",
      render: (row) => <span className="font-medium text-gray-700">{row.nama}</span>
    },
    {
      header: "Jenjang",
      accessorKey: "jenjang",
      className: "w-[100px] text-center font-medium text-gray-700", 
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

  const filterContent = (
    <div className="space-y-4 text-left">
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-slate-700">Jenjang Pendidikan</Label>
        <Select value={jenjangFilter} onValueChange={(v) => { setJenjangFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-full h-9">
            <SelectValue placeholder="Semua Jenjang" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua Jenjang</SelectItem>
            <SelectItem value="D3">D3</SelectItem>
            <SelectItem value="D4">D4</SelectItem>
            <SelectItem value="S1">S1</SelectItem>
            <SelectItem value="S2">S2</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 pb-10 animate-in fade-in duration-500">
      <PageHeader title="Program Studi" breadcrumb={["Beranda", "Program Studi"]} />

      <Card className="border-none shadow-sm ring-1 ring-gray-200">
        <CardContent className="p-4 sm:p-6">
          <DataTable 
            data={currentData}
            columns={columns}
            isLoading={isLoading}
            searchQuery={searchQuery}
            onSearchChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            searchPlaceholder="Cari Prodi..."
            onAdd={handleOpenAdd}
            filterContent={filterContent}
            isFilterActive={jenjangFilter !== "ALL"}
            activeFilterCount={jenjangFilter !== "ALL" ? 1 : 0}
            onResetFilter={() => { setJenjangFilter("ALL"); setSearchQuery(""); }}
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
        title={isEditing ? "Edit Program Studi" : "Tambah Program Studi"}
        description={isEditing ? `Edit data ${formData?.nama}` : "Tambahkan program studi baru ke sistem."}
        maxWidth="sm:max-w-[500px]"
      >
        <ProdiForm
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
        title="Hapus Program Studi?"
        description={confirmDeleteMessage("Program Studi", deleteName)}
        confirmLabel="Hapus Permanen"
        variant="destructive"
      />
    </div>
  );
}
