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
import OfficialForm from "@/components/features/pejabat/OfficialForm";
import { type Official, type OfficialFormValues } from "@/lib/types";
import { createOfficial, updateOfficial, deleteOfficial } from "@/app/actions/officials";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface OfficialsClientProps {
  initialData: Official[];
}

export default function OfficialsClient({ initialData }: OfficialsClientProps) {
  const { successAction, confirmDeleteMessage, showError, showLoading } = useToastMessage();
  const router = useRouter();

  const [dataList, setDataList] = useState<Official[]>(initialData);
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
  const [formData, setFormData] = useState<OfficialFormValues | undefined>(undefined);

  React.useEffect(() => {
    setDataList(initialData);
  }, [initialData]);

  // --- FILTER LOGIC ---
  const filteredData = useMemo(() => {
    return dataList.filter((item) => {
      const query = searchQuery.toLowerCase();
      const matchSearch =
        item.lecturer?.nama?.toLowerCase().includes(query) ||
        (item.lecturer?.nidn && item.lecturer.nidn.toLowerCase().includes(query)) ||
        item.jabatan.toLowerCase().includes(query);
      
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

  const handleOpenEdit = (item: Official) => {
    setSelectedId(item.id); 
    setFormData({
      lecturer_id: item.lecturer_id,
      study_program_id: item.study_program_id,
      jabatan: item.jabatan,
      is_active: item.is_active,
      ttd_basah_url: item.ttd_basah_url,
      ttd_digital_url: item.ttd_digital_url,
    });
    setIsEditing(true);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (values: OfficialFormValues, formDataPayload: FormData) => {
    const toastId = showLoading("Sedang menyimpan data...");
    
    try {
      if (isEditing && selectedId) {
        await updateOfficial(selectedId, formDataPayload);
        successAction("Pejabat", "update", toastId);
      } else {
        await createOfficial(formDataPayload);
        successAction("Pejabat", "create", toastId);
      }
      setIsFormOpen(false);
      router.refresh();
    } catch (error: any) {
      showError("Gagal Menyimpan", error.message, toastId);
    }
  };

  const handleDelete = async () => {
    if (selectedId) {
      const toastId = showLoading("Sedang menghapus data...");
      try {
        await deleteOfficial(selectedId);
        successAction("Pejabat", "delete", toastId);
        
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
  const columns: Column<Official>[] = [
    {
      header: "#",
      className: "w-[50px] text-center",
      render: (_, index) => <span className="text-muted-foreground font-medium">{startIndex + index + 1}</span>
    },
    {
      header: "Nama Pejabat",
      render: (row) => (
        <div className="flex flex-col">
            <span className="font-semibold text-gray-800 text-sm">{row.lecturer?.nama}</span>
            <span className="text-xs text-muted-foreground">NIDN: {row.lecturer?.nidn || "-"}</span>
        </div>
      ),
    },
    {
      header: "Jabatan",
      className: "w-[200px]",
      render: (row) => <span className="text-gray-700 font-medium">{row.jabatan}</span>
    },
    {
        header: "Dokumen Tanda Tangan",
        className: "w-[250px]",
        render: (row) => (
            <div className="flex items-center gap-2">
                 {/* Basah */}
                 <Badge 
                    variant="outline" 
                    className={
                        row.ttd_basah_url 
                        ? "border-green-200 text-green-700 bg-green-50" 
                        : "border-red-200 text-red-700 bg-red-50"
                    }
                 >
                    {row.ttd_basah_url ? (
                        <CheckCircle2 className="w-3 h-3 mr-1.5" />
                    ) : (
                        <XCircle className="w-3 h-3 mr-1.5" />
                    )}
                    Basah
                 </Badge>
                 
                 {/* Digital */}
                 <Badge 
                    variant="outline" 
                    className={
                        row.ttd_digital_url 
                        ? "border-green-200 text-green-700 bg-green-50" 
                        : "border-red-200 text-red-700 bg-red-50"
                    }
                 >
                    {row.ttd_digital_url ? (
                         <CheckCircle2 className="w-3 h-3 mr-1.5" />
                    ) : (
                         <XCircle className="w-3 h-3 mr-1.5" />
                    )}
                    Digital
                 </Badge>
            </div>
        )
    },
    {
        header: "Status",
        className: "text-center w-[120px]",
        render: (row) => (
          <Badge 
            variant={row.is_active ? "default" : "secondary"} 
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
                setDeleteName(row.lecturer?.nama); 
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
        <Label className="text-xs font-semibold text-slate-700">Status Jabatan</Label>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-full h-9">
            <SelectValue placeholder="Semua Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua Status</SelectItem>
            <SelectItem value="active">Aktif Menjabat</SelectItem>
            <SelectItem value="inactive">Non Aktif</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 pb-10 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <PageHeader title="Data Pejabat" breadcrumb={["Beranda", "Data Pejabat"]} />
      </div>

      <Card className="border-none shadow-sm ring-1 ring-gray-200">
        <CardContent className="p-4 sm:p-6">
          <DataTable
            data={currentData}
            columns={columns}
            isLoading={isLoading}
            searchQuery={searchQuery}
            onSearchChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            searchPlaceholder="Cari Nama / NIDN / Jabatan..."
            onAdd={handleOpenAdd}
            addLabel="Tambah Pejabat"
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
        title={isEditing ? "Edit Pejabat" : "Tambah Pejabat"}
        description={isEditing ? `Perbarui data pejabat.` : "Lengkapi form di bawah untuk menambah pejabat."}
        maxWidth="w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <OfficialForm 
            key={selectedId || "new-official"}
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
        title="Hapus Pejabat?"
        description={confirmDeleteMessage("Pejabat", deleteName)}
        confirmLabel="Hapus Permanen"
        variant="destructive"
      />
    </div>
  );
}
