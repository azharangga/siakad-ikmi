"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import { useToastMessage } from "@/hooks/use-toast-message"; 
import { Pencil, Trash2, CheckCircle2, XCircle, User } from "lucide-react"; 
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { FormModal } from "@/components/shared/FormModal";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import LecturerForm from "@/components/features/dosen/LecturerForm";
import { type Lecturer, type LecturerFormValues } from "@/lib/types";
import { createLecturer, updateLecturer, deleteLecturer } from "@/app/actions/lecturers";
import Image from "next/image";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LecturersClientProps {
  initialData: Lecturer[];
}

export default function LecturersClient({ initialData }: LecturersClientProps) {
  const { successAction, confirmDeleteMessage, showError, showLoading } = useToastMessage();
  const router = useRouter();

  const [dataList, setDataList] = useState<Lecturer[]>(initialData);
  const [isLoading, setIsLoading] = useState(false); 
  
  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState<string>(""); 
  const [formData, setFormData] = useState<LecturerFormValues | undefined>(undefined);

  React.useEffect(() => {
    setDataList(initialData);
  }, [initialData]);

  // --- FILTER LOGIC ---
  const filteredData = useMemo(() => {
    return dataList.filter((item) => {
      const query = searchQuery.toLowerCase();
      const matchSearch =
        item.nama.toLowerCase().includes(query) ||
        (item.nidn && item.nidn.toLowerCase().includes(query));
      
      const matchStatus = statusFilter === "ALL" || (statusFilter === "active" ? item.is_active : !item.is_active);
      return matchSearch && matchStatus;
    });
  }, [dataList, searchQuery, statusFilter]);

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
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: Lecturer) => {
    setSelectedId(item.id); 
    setFormData({
      nama: item.nama,
      nidn: item.nidn || "",
      email: item.email || "",
      phone: item.phone || "",
      is_active: item.is_active,
      avatar_url: item.avatar_url,
    });
    setIsEditing(true);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (values: LecturerFormValues) => {
    const toastId = showLoading("Sedang menyimpan data...");
    
    try {
      if (isEditing && selectedId) {
        await updateLecturer(selectedId, values);
        successAction("Dosen", "update", toastId);
      } else {
        await createLecturer(values);
        successAction("Dosen", "create", toastId);
      }
      
      router.refresh();
      setIsFormOpen(false);
    } catch (error: any) {
      showError("Gagal Menyimpan", error.message, toastId);
    }
  };

  const handleDelete = async () => {
    if (selectedId) {
      const toastId = showLoading("Sedang menghapus data...");
      try {
        await deleteLecturer(selectedId);
        successAction("Dosen", "delete", toastId);
        
        // Optimistic UI update
        setDataList(prev => prev.filter(p => p.id !== selectedId));

        if (currentData.length === 1 && currentPage > 1) {
          setCurrentPage((p) => p - 1);
        }
      } catch (error: any) {
        showError("Gagal Menghapus", error.message, toastId);
      }
    }
    setIsDeleteOpen(false);
  };

  // --- COLUMNS ---
  const columns: Column<Lecturer>[] = [
    {
      header: "#",
      className: "w-[50px] text-center",
      render: (_, index) => <span className="text-muted-foreground font-medium">{startIndex + index + 1}</span>
    },
    {
        header: "Dosen",
        render: (row) => (
          <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="relative h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 overflow-hidden shrink-0">
                  {row.avatar_url ? (
                      <Image 
                          src={row.avatar_url} 
                          alt={row.nama} 
                          fill 
                          className="object-cover"
                      />
                  ) : (
                      <User className="h-4 w-4 text-slate-400" />
                  )}
              </div>
              <div className="flex flex-col">
                    <span className="font-semibold text-gray-800 text-sm">{row.nama}</span>
                    <span className="text-xs text-muted-foreground hidden sm:inline-block">NIDN: {row.nidn || "-"}</span>
              </div>
          </div>
        ),
    },
    {
      header: "Kontak",
      className: "hidden md:table-cell",
      render: (row) => (
         <div className="flex flex-col text-sm text-gray-600">
            <span>{row.email || "-"}</span>
            <span className="text-xs text-muted-foreground">{row.phone || "-"}</span>
         </div>
      )
    },
    {
        header: "Status",
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
        <div className="flex justify-center gap-2">
          <Button variant="ghost" size="icon" className="text-yellow-600 hover:bg-yellow-50 h-8 w-8" onClick={() => handleOpenEdit(row)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-red-600 hover:bg-red-50 h-8 w-8" 
            onClick={() => { 
                setSelectedId(row.id); 
                setDeleteName(row.nama); 
                setIsDeleteOpen(true); 
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  const activeFilterCount = statusFilter !== "ALL" ? 1 : 0;

  const filterContent = (
    <div className="space-y-4 text-left">
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-slate-700">Status Mengajar Dosen</Label>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-full h-9">
            <SelectValue placeholder="Semua Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua Status</SelectItem>
            <SelectItem value="active">Aktif Mengajar</SelectItem>
            <SelectItem value="inactive">Non Aktif</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 pb-10 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <PageHeader title="Data Dosen" breadcrumb={["Beranda", "Data Dosen"]} />
      </div>

      <Card className="border-none shadow-sm ring-1 ring-gray-200">
        <CardContent className="p-4 sm:p-6">
          <DataTable
            data={currentData}
            columns={columns}
            isLoading={isLoading}
            searchQuery={searchQuery}
            onSearchChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            searchPlaceholder="Cari Nama / NIDN..."
            onAdd={handleOpenAdd}
            addLabel="Tambah Dosen"
            filterContent={filterContent}
            isFilterActive={activeFilterCount > 0}
            activeFilterCount={activeFilterCount}
            onResetFilter={() => { setStatusFilter("ALL"); setSearchQuery(""); }}
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
        isOpen={isFormOpen}
        onClose={setIsFormOpen}
        title={isEditing ? "Edit Dosen" : "Tambah Dosen"}
        description={isEditing ? `Perbarui data dosen atas nama ${formData?.nama}.` : "Lengkapi form di bawah untuk menambah dosen."}
        maxWidth="w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <LecturerForm 
            isEditing={isEditing}
            initialData={formData}
            onSubmit={handleFormSubmit}
            onCancel={() => setIsFormOpen(false)}
        />
      </FormModal>

      <ConfirmModal
        isOpen={isDeleteOpen}
        onClose={setIsDeleteOpen}
        onConfirm={handleDelete}
        title="Hapus Dosen?"
        description={confirmDeleteMessage("Dosen", deleteName)}
        confirmLabel="Hapus Permanen"
        variant="destructive"
      />
    </div>
  );
}
