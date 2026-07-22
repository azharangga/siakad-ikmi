"use client";

import React, { useState, useMemo } from "react";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Printer, FileArchive, Loader2, User } from "lucide-react";
import { StudentData } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";
import Image from "next/image";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface KtmTableProps {
  data: StudentData[];
  isLoading: boolean;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onPrint: (student: StudentData) => void;
  onPrintBulk: () => void;
  isGeneratingZip: boolean;
  isPrinting: boolean;
}

export default function KtmTable({
  data,
  isLoading,
  selectedIds,
  onSelectionChange,
  onPrint,
  onPrintBulk,
  isGeneratingZip,
  isPrinting,
}: KtmTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [prodiFilter, setProdiFilter] = useState("ALL");
  const [angkatanFilter, setAngkatanFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Extract unique prodi and angkatan
  const uniqueProdi = useMemo(() => {
    const prodiSet = new Set<string>();
    data.forEach((s) => {
      if (s.profile.study_program?.nama) {
        prodiSet.add(s.profile.study_program.nama);
      }
    });
    return Array.from(prodiSet).sort();
  }, [data]);

  const uniqueAngkatan = useMemo(() => {
    const angkatanSet = new Set<number>();
    data.forEach((s) => {
      if (s.profile.angkatan) {
        angkatanSet.add(s.profile.angkatan);
      }
    });
    return Array.from(angkatanSet).sort((a, b) => b - a);
  }, [data]);

  // === FILTERING LOGIC ===
  const filteredData = useMemo(() => {
    return data.filter((student) => {
      const matchSearch =
        student.profile.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.profile.nim.toLowerCase().includes(searchQuery.toLowerCase());

      const matchProdi =
        prodiFilter === "ALL" || student.profile.study_program?.nama === prodiFilter;

      const matchAngkatan =
        angkatanFilter === "ALL" || student.profile.angkatan.toString() === angkatanFilter;

      return matchSearch && matchProdi && matchAngkatan;
    });
  }, [data, searchQuery, prodiFilter, angkatanFilter]);

  // === PAGINATION ===
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredData.slice(startIndex, endIndex);

  // === SELECTION LOGIC ===
  const toggleStudent = (studentId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    onSelectionChange(newSelected);
  };

  const toggleAll = (checked: boolean) => {
    if (!checked) {
      onSelectionChange(new Set());
    } else {
      const newSelected = new Set(selectedIds);
      filteredData.forEach(s => newSelected.add(s.id));
      onSelectionChange(newSelected);
    }
  };

  const isAllSelected = filteredData.length > 0 && filteredData.every(s => selectedIds.has(s.id));
  const isPartiallySelected = filteredData.some(s => selectedIds.has(s.id)) && !isAllSelected;

  // === COLUMNS ===
  const columns: Column<StudentData>[] = [
    {
      header: () => (
        <Checkbox 
          checked={isAllSelected}
          onCheckedChange={(checked) => toggleAll(checked === true)}
          aria-label="Select all"
          className="translate-y-[2px]"
        />
      ),
      className: "w-[50px] text-center",
      render: (row) => (
        <Checkbox 
          checked={selectedIds.has(row.id)}
          onCheckedChange={() => toggleStudent(row.id)}
          aria-label="Select row"
          className="translate-y-[2px]"
        />
      ),
    },
    {
      header: "Mahasiswa",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
             {row.profile.avatar_url ? (
               <Image 
                 src={row.profile.avatar_url} 
                 alt={row.profile.nama} 
                 fill 
                 className="object-cover"
               />
             ) : (
               <div className="flex items-center justify-center w-full h-full text-slate-400">
                  <User className="w-5 h-5" />
               </div>
             )}
          </div>
          <div className="flex flex-col">
             <span className="font-medium text-slate-900 leading-tight">{row.profile.nama}</span>
             <span className="text-xs text-slate-500 font-mono">{row.profile.nim}</span>
          </div>
        </div>
      ),
    },
    {
      header: "Prodi",
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.profile.study_program?.nama || "-"}{" "}
          {row.profile.study_program?.jenjang ? `(${row.profile.study_program.jenjang})` : ""}
        </span>
      ),
    },
    {
        header: "Angkatan",
        className: "text-center",
        render: (row) => row.profile.angkatan,
    },
    {
      header: "Semester",
        className: "text-center",
        render: (row) => row.profile.semester,
    },
    {
      header: "Aksi",
      className: "text-center w-[100px]",
      render: (row) => (
        <Button
          size="sm"
          variant="default" 
          onClick={() => onPrint(row)}
          disabled={isPrinting}
          className="h-8"
        >
          <Printer className="h-3.5 w-3.5 mr-1" />
          Cetak PDF
        </Button>
      ),
    },
  ];

  const activeFilterCount = [
    prodiFilter !== "ALL",
    angkatanFilter !== "ALL"
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
            {uniqueProdi.map((prodi) => (
              <SelectItem key={prodi} value={prodi}>{prodi}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-slate-700">Angkatan</Label>
        <Select value={angkatanFilter} onValueChange={(v) => { setAngkatanFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-full h-9">
            <SelectValue placeholder="Semua Angkatan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua Angkatan</SelectItem>
            {uniqueAngkatan.map((angkatan) => (
              <SelectItem key={angkatan} value={angkatan.toString()}>{angkatan}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  // === CUSTOM ACTIONS (BULK PRINT) ===
  const customActions = selectedIds.size > 0 && (
    <Button
      variant="outline" 
      onClick={onPrintBulk}
      disabled={isGeneratingZip}
      className={`ml-2 bg-white text-slate-700 border-slate-200 hover:bg-slate-50`}
    >
      {isGeneratingZip ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Membuat ZIP...
        </>
      ) : (
        <>
          <FileArchive className="mr-2 h-4 w-4" />
          Cetak ZIP
        </>
      )}
    </Button>
  );

  return (
    <Card className="border-none shadow-sm ring-1 ring-gray-200">
      <CardContent className="p-4 sm:p-6">
        <DataTable
          data={currentData}
          columns={columns}
          isLoading={isLoading}
          searchQuery={searchQuery}
          onSearchChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          searchPlaceholder="Cari nama atau NIM..."
          
          filterContent={filterContent}
          isFilterActive={activeFilterCount > 0}
          activeFilterCount={activeFilterCount}
          onResetFilter={() => {
            setProdiFilter("ALL");
            setAngkatanFilter("ALL");
            setSearchQuery("");
            setCurrentPage(1);
          }}

          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          startIndex={startIndex}
          endIndex={endIndex}
          totalItems={filteredData.length}
          customActions={customActions}
        />
        

      </CardContent>
    </Card>
  );
}
