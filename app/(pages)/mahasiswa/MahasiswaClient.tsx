"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import { useToastMessage } from "@/hooks/use-toast-message"; 
import Image from "next/image"; 
import { Pencil, Trash2, CheckCircle2, XCircle, User, Printer, IdCard, Upload, MoreHorizontal, X, Download } from "lucide-react"; 
import * as XLSX from "xlsx"; 
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable, type Column } from "@/components/ui/data-table";
import { FormModal } from "@/components/shared/FormModal";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import Tooltip from "@/components/shared/Tooltip";
import { StudentForm } from "@/components/features/mahasiswa/StudentForm";
import { ImportMahasiswaDialog } from "@/components/features/mahasiswa/ImportMahasiswaDialog";
import PrintableBiodata from "@/components/features/mahasiswa/PrintableBiodata";
import { KtmCard } from "@/components/features/mahasiswa/KtmCard";
import { type StudentData, type StudentFormValues, type StudyProgram } from "@/lib/types";
import { createStudent, updateStudent, deleteStudent } from "@/app/actions/students";
import { formatDate } from "@/lib/utils";
import { usePdfPrint } from "@/hooks/use-pdf-print";

interface MahasiswaClientProps {
  initialStudents: StudentData[];
  initialPrograms: StudyProgram[];
}

export default function MahasiswaClient({ initialStudents, initialPrograms }: MahasiswaClientProps) {
  const { successAction, confirmDeleteMessage, showError, showLoading } = useToastMessage();
  const router = useRouter();
  const printRef = React.useRef<HTMLDivElement>(null);
  const ktmRef = React.useRef<HTMLDivElement>(null);
  const { printPdf } = usePdfPrint();

  const [dataList, setDataList] = useState<StudentData[]>(initialStudents);
  const [studyPrograms, setStudyPrograms] = useState<StudyProgram[]>(initialPrograms); 
  const [isLoading, setIsLoading] = useState(false); 
  
  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [prodiFilter, setProdiFilter] = useState<string>("ALL");
  const [semesterFilter, setSemesterFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [angkatanFilter, setAngkatanFilter] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState<string>(""); 
  const [formData, setFormData] = useState<StudentFormValues | undefined>(undefined);
  const [printingStudent, setPrintingStudent] = useState<StudentData | null>(null);
  const [printingKtmStudent, setPrintingKtmStudent] = useState<StudentData | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Sync props if needed (optional)
  React.useEffect(() => {
    setDataList(initialStudents);
    setStudyPrograms(initialPrograms);
  }, [initialStudents, initialPrograms]);

  // --- FILTER LOGIC ---
  const filteredData = useMemo(() => {
    return dataList.filter((student) => {
      const query = searchQuery.toLowerCase();
      const matchSearch =
        student.profile.nama.toLowerCase().includes(query) ||
        student.profile.nim.toLowerCase().includes(query);
      
      const matchProdi = prodiFilter === "ALL" || student.profile.study_program?.nama === prodiFilter;
      const matchSemester = semesterFilter === "ALL" || String(student.profile.semester) === semesterFilter;
      const matchStatus = statusFilter === "ALL" || (student.profile.status_mahasiswa || "AKTIF") === statusFilter;
      const matchAngkatan = angkatanFilter === "ALL" || String(student.profile.angkatan) === angkatanFilter;
      
      return matchSearch && matchProdi && matchSemester && matchStatus && matchAngkatan;
    });
  }, [dataList, searchQuery, prodiFilter, semesterFilter, statusFilter, angkatanFilter]);

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

  const handleOpenEdit = (student: StudentData) => {
    setSelectedId(student.id); 
    setFormData({
      nim: student.profile.nim,
      nama: student.profile.nama,
      study_program_id: student.profile.study_program_id ? String(student.profile.study_program_id) : "",
      angkatan: student.profile.angkatan, 
      alamat: student.profile.alamat,
      status_mahasiswa: student.profile.status_mahasiswa || "AKTIF",
      avatar_url: student.profile.avatar_url,
      jenis_kelamin: student.profile.jenis_kelamin || "",
      tempat_lahir: student.profile.tempat_lahir || "",
      tanggal_lahir: student.profile.tanggal_lahir || "",
      agama: student.profile.agama || "",
      nik: student.profile.nik || "",
      status: student.profile.status || "",
      no_hp: student.profile.no_hp || "",
      email: student.profile.email || ""
    });
    setIsEditing(true);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (values: StudentFormValues) => {
    const toastId = showLoading("Sedang menyimpan data...");
    
    try {
      if (isEditing && selectedId) {
        await updateStudent(selectedId, values);
        successAction("Mahasiswa", "update", toastId);
      } else {
        await createStudent(values);
        successAction("Mahasiswa", "create", toastId);
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
        await deleteStudent(selectedId);
        successAction("Mahasiswa", "delete", toastId);
        
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

  const handlePrint = async (student: StudentData) => {
    setPrintingStudent(student);
    setPrintingKtmStudent(null); 
    

    // Tunggu render React selesai
    setTimeout(async () => {
        await printPdf({
          elementRef: printRef,
          fileName: `Biodata_${student.profile.nama.replace(/\s+/g, "_")}_${student.profile.nim}.pdf`,
          pdfFormat: "a4",
          pdfOrientation: "portrait",
          pixelRatio: 5, // 5x JPEG for A4
          imageType: "image/jpeg"
        });
    }, 100);
  };

  const handlePrintKtm = async (student: StudentData) => {
    setPrintingKtmStudent(student);
    setPrintingStudent(null); 
    
    setTimeout(async () => {
        await printPdf({
          elementRef: ktmRef,
          fileName: `KTM_${student.profile.nama.replace(/\s+/g, "_")}_${student.profile.nim}.pdf`,
          pdfFormat: [85.6, 53.98], // ID-1 Card Size: 85.60 × 53.98 mm
          pdfOrientation: "landscape",
          pixelRatio: 8,
          imageType: "image/jpeg",
          imageQuality: 1.0
        });
    }, 100);
  };

  const handleExport = () => {
    const exportData = filteredData.map(student => ({
      "NIM": student.profile.nim,
      "Nama Lengkap": student.profile.nama,
      "NIK": student.profile.nik || "-",
      "Jenis Kelamin": student.profile.jenis_kelamin || "-",
      "Tempat Lahir": student.profile.tempat_lahir || "-",
      "Tanggal Lahir": formatDate(student.profile.tanggal_lahir),
      "Agama": student.profile.agama || "-",
      "Program Studi": student.profile.study_program?.nama || "-",
      "Angkatan": student.profile.angkatan,
      "Semester": student.profile.semester,
      "Status": student.profile.status_mahasiswa || "AKTIF",
      "No HP": student.profile.no_hp || "-",
      "Email": student.profile.email || "-",
      "Alamat": student.profile.alamat || "-"
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Mahasiswa");
    XLSX.writeFile(wb, `Data_Mahasiswa_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // --- COLUMNS ---
  const columns: Column<StudentData>[] = [
    {
      header: "#",
      className: "w-[50px] text-center",
      render: (_, index) => <span className="text-muted-foreground font-medium">{startIndex + index + 1}</span>
    },
    {
      header: "Mahasiswa",
      render: (row) => (
        <div className="flex items-center gap-3">
            {/* Avatar */}
            <div 
                className="relative h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 overflow-hidden shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => row.profile.avatar_url && setSelectedImage(row.profile.avatar_url)}
            >
                {row.profile.avatar_url ? (
                    <Image 
                        src={row.profile.avatar_url} 
                        alt={row.profile.nama} 
                        fill 
                        className="object-cover"
                    />
                ) : (
                    <User className="h-5 w-5 text-slate-400" />
                )}
            </div>
            <div className="flex flex-col">
                <span className="font-semibold text-gray-800 text-sm">{row.profile.nama}</span>
                <span className="text-xs text-muted-foreground font-mono">{row.profile.nim}</span>
            </div>
        </div>
      ),
    },
    {
      header: "NIK",
      className: "w-[130px]",
      render: (row) => <span className="text-xs text-gray-600">{row.profile.nik || "-"}</span>
    },
    {
      header: "L/P",
      className: "w-[50px] text-center",
      render: (row) => <span className="text-gray-600">{row.profile.jenis_kelamin === 'Laki-laki' ? 'L' : (row.profile.jenis_kelamin === 'Perempuan' ? 'P' : '-')}</span>
    },
    {
      header: "TTL",
      className: "w-[150px]",
      render: (row) => (
        <div className="flex flex-col text-xs text-gray-600">
           <span>{row.profile.tempat_lahir || "-"}</span>
           <span className="text-muted-foreground">{formatDate(row.profile.tanggal_lahir)}</span>
        </div>
      )
    },
    {
      header: "Agama",
      className: "w-[100px]",
      render: (row) => <span className="text-sm text-gray-600">{row.profile.agama || "-"}</span>
    },
    {
      header: "Sts. Nikah",
      className: "w-[100px]",
      render: (row) => <span className="text-xs text-gray-600">{row.profile.status || "-"}</span>
    },
    {
      header: "Alamat",
      className: "w-[200px]",
      render: (row) => (
        <Tooltip content={row.profile.alamat || "-"} position="bottom">
            <span className="text-xs text-gray-600 truncate block cursor-default max-w-[200px]">
                {row.profile.alamat || "-"}
            </span>
        </Tooltip>
      )
    },
    {
      header: "Kontak",
      className: "w-[180px]",
      render: (row) => (
        <div className="flex flex-col gap-0.5">
            <span className="text-sm text-gray-700">{row.profile.no_hp || "-"}</span>
            <span className="text-xs text-muted-foreground">{row.profile.email || "-"}</span>
        </div>
      )
    },
    { 
      header: "Program Studi", 
      className: "w-[200px]",
      render: (row) => (
        <span className="text-sm font-medium text-gray-700">
            {row.profile.study_program ? `${row.profile.study_program.nama} (${row.profile.study_program.jenjang})` : "-"}
        </span>
      )
    },
    {
      header: "Angkatan",
      className: "text-center w-[80px]",
      render: (row) => (
        <span className="text-gray-700 font-medium">
          {row.profile.angkatan}
        </span>
      )
    },
    { 
      header: "Semester", 
      className: "text-center w-[80px]", 
      render: (row) => row.profile.semester 
    },
    {
        header: "Status",
        className: "text-center w-[120px]",
        render: (row) => (
          <Badge 
            className={`font-normal ${
              row.profile.status_mahasiswa === "AKTIF" ? "bg-green-600 hover:bg-green-700 text-white" :
              row.profile.status_mahasiswa === "LULUS" ? "bg-blue-600 hover:bg-blue-700 text-white" :
              row.profile.status_mahasiswa === "CUTI" ? "bg-amber-500 hover:bg-amber-600 text-white" :
              "bg-red-600 hover:bg-red-700 text-white"
            }`}
          >
            {row.profile.status_mahasiswa || "AKTIF"}
          </Badge>
        )
    },
    {
      header: "Aksi",
      className: "text-center w-[50px]",
      render: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Aksi</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => handleOpenEdit(row)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit Data
            </DropdownMenuItem>
             <DropdownMenuItem onClick={() => handlePrint(row)}>
              <Printer className="mr-2 h-4 w-4" />
              Cetak Biodata
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlePrintKtm(row)}>
              <IdCard className="mr-2 h-4 w-4" />
              Cetak KTM
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
                onClick={() => { 
                    setSelectedId(row.id); 
                    setDeleteName(row.profile.nama); 
                    setIsDeleteOpen(true); 
                }}
                className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Hapus Data
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  ];

  const activeFilterCount = [
    prodiFilter !== "ALL",
    semesterFilter !== "ALL",
    statusFilter !== "ALL",
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
            {studyPrograms.map(p => (
              <SelectItem key={p.id} value={p.nama}>{p.nama}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-700">Status Mahasiswa</Label>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-full h-9">
              <SelectValue placeholder="Semua Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Status</SelectItem>
              <SelectItem value="AKTIF">Aktif</SelectItem>
              <SelectItem value="CUTI">Cuti</SelectItem>
              <SelectItem value="NON_AKTIF">Non Aktif</SelectItem>
              <SelectItem value="LULUS">Lulus</SelectItem>
              <SelectItem value="DROP_OUT">Drop Out</SelectItem>
              <SelectItem value="MENGUNDURKAN_DIRI">Mengundurkan Diri</SelectItem>
              <SelectItem value="MUTASI">Mutasi</SelectItem>
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
              {[2026, 2025, 2024, 2023, 2022, 2021, 2020].map(y => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-slate-700">Semester Saat Ini</Label>
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
  );

  return (
    <>
      {/* Conditional Print Styles for KTM Only */}
      {printingKtmStudent && (
        <style jsx global>{`
          @media print {
            @page { 
              margin: 0; 
              size: 85.6mm 53.98mm; 
            }
            body * { visibility: hidden; }
            #print-ktm-area, #print-ktm-area * { 
              visibility: visible; 
            }
            #print-ktm-area {
              position: fixed; 
              top: 0; 
              left: 0; 
              margin: 0; 
              padding: 0; 
              width: 85.6mm; 
              height: 53.98mm; 
              z-index: 9999;
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
          }
        `}</style>
      )}
      
      {/* Hidden Print Area for Biodata Capture */}
      <div className="absolute top-0 left-[-9999px] w-[210mm]">
        <PrintableBiodata 
            ref={printRef} 
            student={printingStudent} 
            className="block" 
        />
      </div>
      
      {/* Hidden Print Area for KTM Capture */}
      <div className="absolute top-0 left-[-9999px] w-[85.6mm] h-[53.98mm]">
        {printingKtmStudent && (
          <div ref={ktmRef} className="block w-[85.6mm] h-[53.98mm]">
             <KtmCard student={printingKtmStudent} className="rounded-none shadow-none border-none" />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 pb-10 animate-in fade-in duration-500">
      <PageHeader title="Data Mahasiswa" breadcrumb={["Beranda", "Mahasiswa"]} />

      <Card className="border-none shadow-sm ring-1 ring-gray-200">
        <CardContent className="p-4 sm:p-6">
          <DataTable
            data={currentData}
            columns={columns}
            isLoading={isLoading}
            searchQuery={searchQuery}
            onSearchChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            searchPlaceholder="Cari Nama atau NIM..."
            onAdd={handleOpenAdd}
            addLabel="Tambah Data"
            customActions={
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Export Data</span>
                    </Button>
                    <Button variant="outline" onClick={() => setIsImportOpen(true)}>
                        <Upload className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Import Data</span>
                    </Button>
                </div>
            }
            filterContent={filterContent}
            isFilterActive={activeFilterCount > 0}
            activeFilterCount={activeFilterCount}
            onResetFilter={() => { setProdiFilter("ALL"); setSemesterFilter("ALL"); setStatusFilter("ALL"); setAngkatanFilter("ALL"); setSearchQuery(""); }}
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
        title={isEditing ? "Edit Data Mahasiswa" : "Tambah Data Mahasiswa"}
        description={isEditing ? `Perbarui data mahasiswa atas nama ${formData?.nama}.` : "Lengkapi form di bawah untuk menambah data mahasiswa."}
        maxWidth="w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <StudentForm 
            key={isEditing && selectedId ? `edit-${selectedId}` : "add-new"}
            initialData={formData}
            studyPrograms={studyPrograms} 
            isEditing={isEditing}
            onSubmit={handleFormSubmit}
            onCancel={() => setIsFormOpen(false)}
        />
      </FormModal>

      <ImportMahasiswaDialog 
        isOpen={isImportOpen}
        onClose={setIsImportOpen}
        studyPrograms={studyPrograms}
        onSuccess={() => {
            router.refresh();
            successAction("Import Mahasiswa", "create");
        }}
      />

      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="p-0 overflow-hidden justify-center items-center flex bg-transparent border-none shadow-none max-w-screen-md w-auto h-auto focus:outline-none">
            <div className="relative bg-white/10 p-2 rounded-lg backdrop-blur-sm">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute -top-12 right-0 text-white hover:bg-white/20 rounded-full h-10 w-10" 
                    onClick={() => setSelectedImage(null)}
                >
                    <X className="h-6 w-6" />
                </Button>
                {selectedImage && (
                    <div className="relative w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] rounded-lg overflow-hidden bg-black shadow-2xl">
                        <Image
                            src={selectedImage}
                            alt="Preview Mahasiswa"
                            fill
                            className="object-contain"
                        />
                    </div>
                )}
            </div>
        </DialogContent>
      </Dialog><ConfirmModal
        isOpen={isDeleteOpen}
        onClose={setIsDeleteOpen}
        onConfirm={handleDelete}
        title="Hapus Data Mahasiswa?"
        description={confirmDeleteMessage("Mahasiswa", deleteName)}
        confirmLabel="Hapus Permanen"
        variant="destructive"
      />
    </div>
    </>
  );
}
