// components/features/nilai/StudentTable.tsx
"use client";

import React, { useState, useMemo } from "react";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { PencilLine } from "lucide-react";
import { StudentData, StudyProgram } from "@/lib/types";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Image from "next/image";
import { User } from "lucide-react";

interface StudentTableProps {
  data: StudentData[];
  studyPrograms: StudyProgram[]; // Tambah props ini
  isLoading: boolean;

  onEdit: (student: StudentData) => void;
  actionLabel?: string;
  actionIcon?: React.ReactNode;
  customActions?: React.ReactNode;
}

export function StudentTable({
  data,
  studyPrograms,
  isLoading,

  onEdit,
  actionLabel = "Kelola Nilai",
  actionIcon, 
  customActions 
}: StudentTableProps) {
  
  // Default Icon if not provided
  const Icon = actionIcon ? () => <>{actionIcon}</> : PencilLine;
  
  // === STATE INTERNAL ===
  const [searchQuery, setSearchQuery] = useState("");
  const [filterProdi, setFilterProdi] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // === FILTERING LOGIC ===
  const filteredData = useMemo(() => {
    let result = data;

    // 1. Filter Pencarian
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(
        (student) =>
          student.profile.nama.toLowerCase().includes(lowerQuery) ||
          student.profile.nim.toLowerCase().includes(lowerQuery)
      );
    }

    // 2. Filter Prodi (Perbaikan akses data)
    if (filterProdi !== "ALL") {
      result = result.filter((student) => student.profile.study_program?.nama === filterProdi);
    }

    return result;
  }, [data, searchQuery, filterProdi]);

  // === PAGINATION LOGIC ===
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredData.slice(startIndex, endIndex);

  // === DEFINISI KOLOM ===
  const columns: Column<StudentData>[] = [
    {
      header: "#",
      className: "w-[50px] text-center",
      render: (_, index) => <span className="text-muted-foreground">{startIndex + index + 1}</span>
    },
    {
      header: "Mahasiswa",
      render: (row) => (
        <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="relative h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 overflow-hidden shrink-0">
                {row.profile.avatar_url ? (
                    <Image 
                        src={row.profile.avatar_url} 
                        alt={row.profile.nama} 
                        fill 
                        className="object-cover"
                    />
                ) : (
                    <User className="h-4 w-4 text-slate-400" />
                )}
            </div>
            <p className="font-semibold text-slate-800">{row.profile.nama}</p>
        </div>
      )
    },
    {
      header: "NIM",
      className: "w-[120px]",
      render: (row) => <span className="font-mono font-medium">{row.profile.nim}</span>
    },
    {
      header: "Prodi",
      className: "w-[240px]",
      // [UPDATE] Menggabungkan Prodi dan Jenjang
      render: (row) => {
        const prodi = row.profile.study_program?.nama || "-";
        const jenjang = row.profile.study_program?.jenjang || "-";
        return <span className="text-slate-600 text-sm">{`${prodi} (${jenjang})`}</span>;
      }
    },
    {
       header: "Angkatan",
       className: "w-[100px] text-center",
       render: (row) => (
         <span className="font-medium text-slate-700">{row.profile.angkatan || "-"}</span>
       )
    },
    {
      header: "Semester",
      className: "w-[100px] text-center",
      render: (row) => (
        <span className="font-medium text-slate-700">{row.profile.semester}</span>
      )
    },
    {
        header: "SKS Diambil",
        className: "w-[100px] text-center",
        render: (row) => {
            // [UPDATE] Menggunakan total_sks dari hasil fetch KRS
            return <span className="font-medium">{row.total_sks || 0}</span>
        }
    },
    {
      header: "Aksi",
      className: "text-center w-[130px]",
      render: (row) => (
        <Button 
            size="sm" 
            className="h-8 w-full font-medium shadow-sm"
            onClick={() => onEdit(row)}
        >
            <Icon className="w-3.5 h-3.5 mr-2" />
            {actionLabel}
        </Button>
      )
    }
  ];

  const filterContent = (
    <div className="space-y-4 text-left">
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-slate-700">Program Studi</Label>
        <Select value={filterProdi} onValueChange={(v) => { setFilterProdi(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-full h-9">
            <SelectValue placeholder="Semua Program Studi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua Program Studi</SelectItem>
            {studyPrograms.map((p) => (
              <SelectItem key={p.id} value={p.nama}>{p.nama}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <DataTable
      data={currentData}
      columns={columns}
      isLoading={isLoading}
      
      searchQuery={searchQuery}
      onSearchChange={(e) => {
        setSearchQuery(e.target.value);
        setCurrentPage(1);
      }}
      searchPlaceholder="Cari Mahasiswa atau NIM..."
      
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={setCurrentPage}
      startIndex={startIndex}
      endIndex={endIndex}
      totalItems={filteredData.length}
      
      filterContent={filterContent}
      isFilterActive={filterProdi !== "ALL"}
      activeFilterCount={filterProdi !== "ALL" ? 1 : 0}
      onResetFilter={() => {
        setFilterProdi("ALL");
        setSearchQuery("");
        setCurrentPage(1);
      }}
      customActions={customActions}
    />
  );
}