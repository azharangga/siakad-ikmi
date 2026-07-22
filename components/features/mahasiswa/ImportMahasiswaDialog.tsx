
import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Loader2, Search, RefreshCw, Filter, ListFilter } from "lucide-react";
import { toast } from "sonner";
import { StudyProgram } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { createBulkStudents, checkExistingNims } from "@/app/actions/students"; 

interface ImportMahasiswaDialogProps {
  isOpen: boolean;
  onClose: (open: boolean) => void;
  studyPrograms: StudyProgram[];
  onSuccess: () => void;
}

interface ParsedStudent {
  nim: string;
  nama: string;
  nik: string;
  jenis_kelamin: string;
  tempat_lahir: string;
  tanggal_lahir: string; // Format YYYY-MM-DD
  agama: string;
  status: string; // Status Perkawinan
  no_hp: string;
  email: string;
  alamat: string;
  angkatan: string | number;
  prodi_nama: string; // Nama Prodi dari Excel
  
  // Validation status
  isValid: boolean;
  errors: string[];
}

export function ImportMahasiswaDialog({
  isOpen,
  onClose,
  studyPrograms,
  onSuccess,
}: ImportMahasiswaDialogProps) {
  const [data, setData] = useState<ParsedStudent[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "valid" | "invalid">("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when dialog closes
  React.useEffect(() => {
    if (!isOpen) {
      setData([]);
      setSearchQuery("");
      setFilterStatus("all");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [isOpen]);

  const handleDownloadTemplate = () => {
    const headers = [
      "NIM", "Nama Lengkap", "NIK", "Jenis Kelamin (L/P)", 
      "Tempat Lahir", "Tanggal Lahir (YYYY-MM-DD)", "Agama", 
      "Status Perkawinan", "No HP", "Email", "Alamat", 
      "Angkatan", "Nama Program Studi"
    ];
    
    // Example row
    const example = [
      "4124001", "Budi Santoso", "3201123456780001", "L", 
      "Jakarta", "2000-01-01", "Islam", 
      "Belum Menikah", "081234567890", "budi@example.com", "Jl. Sudirman No. 1", 
      new Date().getFullYear(), studyPrograms[0]?.nama || "Tehnik Informatika"
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Template_Import_Mahasiswa.xlsx");
  };

  const processExcel = async (file: File) => {
    const toastId = toast.loading("Memvalidasi data file Excel...");
    setIsChecking(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const bstr = e.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 });
        
        // Skip header row
        const rows = jsonData.slice(1) as any[];
        
        // 1. Initial Parse checks
        let parsedData: ParsedStudent[] = rows.map((row) => {
          const errors: string[] = [];
          
          // Mapping columns (assuming standard template order)
          const nim = String(row[0] || "").trim();
          const nama = String(row[1] || "").trim();
          const nik = String(row[2] || "").trim();
          let jk = String(row[3] || "").trim().toUpperCase();
          if (jk === "L") jk = "Laki-laki";
          if (jk === "P") jk = "Perempuan";
          
          const tempat_lahir = String(row[4] || "").trim();
          const tanggal_lahir = String(row[5] || "").trim();
          const agama = String(row[6] || "").trim();
          const status = String(row[7] || "").trim();
          const no_hp = String(row[8] || "").trim();
          const email = String(row[9] || "").trim();
          const alamat = String(row[10] || "").trim();
          const angkatan = String(row[11] || "").trim();
          const prodi_nama = String(row[12] || "").trim();

          // Basic Validation
          if (!nim) errors.push("NIM wajib diisi");
          if (!nama) errors.push("Nama wajib diisi");
          if (!nik) errors.push("NIK wajib diisi");
          if (!["Laki-laki", "Perempuan"].includes(jk)) errors.push("JK harus L atau P");
          if (!prodi_nama) errors.push("Prodi wajib diisi");
          
          // Validate Date (Simple YYYY-MM-DD check)
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!tanggal_lahir) {
             errors.push("Tgl Lahir wajib");
          } else if (tanggal_lahir !== "-" && !dateRegex.test(tanggal_lahir)) {
             errors.push("Format Tgl salah (YYYY-MM-DD) atau '-'");
          }

          // Validate Email
          const emailRegex = /\S+@\S+\.\S+/;
          if (!email) {
             errors.push("Email wajib");
          } else if (email !== "-" && !emailRegex.test(email)) {
             errors.push("Format Email salah");
          }

          // Validate Required Text Fields
          if (!tempat_lahir) errors.push("Tempat Lahir wajib");
          if (!agama) errors.push("Agama wajib");
          if (!status) errors.push("Status nikah wajib");
          if (!no_hp) errors.push("No HP wajib");
          if (!alamat) errors.push("Alamat wajib");
          
          // Check Prodi exists
          const prodiExists = studyPrograms.some(p => p.nama.toLowerCase() === prodi_nama.toLowerCase());
          if (!prodiExists && prodi_nama) errors.push(`Prodi '${prodi_nama}' tidak ditemukan`);

          return {
            nim, nama, nik, jenis_kelamin: jk, tempat_lahir, 
            tanggal_lahir, agama, status, no_hp, email, 
            alamat, angkatan, prodi_nama,
            isValid: errors.length === 0,
            errors
          };
        }).filter(item => item.nim || item.nama); // Filter empty rows

        // 2. Check for Duplicates WITHIN file
        const nimCounts = new Map<string, number>();
        parsedData.forEach(d => {
            const n = d.nim;
            nimCounts.set(n, (nimCounts.get(n) || 0) + 1);
        });

        parsedData = parsedData.map(d => {
            if (nimCounts.get(d.nim)! > 1) {
                return { ...d, isValid: false, errors: [...d.errors, "NIM ganda di file ini"] };
            }
            return d;
        });

        // 3. Check for Duplicates IN DATABASE
        const nimsToCheck = parsedData.filter(d => d.nim).map(d => d.nim);
        if (nimsToCheck.length > 0) {
            // Batch checking to avoid hitting query limits or timeouts
            const batchSize = 100;
            const chunks = [];
            for (let i = 0; i < nimsToCheck.length; i += batchSize) {
                chunks.push(nimsToCheck.slice(i, i + batchSize));
            }

            const results = await Promise.all(
                chunks.map(chunk => checkExistingNims(chunk))
            );
            
            const existingNims = results.flat();
            const existingSet = new Set(existingNims);

            parsedData = parsedData.map(d => {
                if (existingSet.has(d.nim)) {
                    return { ...d, isValid: false, errors: [...d.errors, "NIM sudah terdaftar"] };
                }
                return d;
            });
        }

        setData(parsedData);
      } catch (error) {
        console.error("Error reading excel:", error);
        toast.error("Gagal membaca file Excel.", { id: toastId });
      } finally {
        setIsChecking(false);
        toast.dismiss(toastId);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Filter data
  const filteredData = data.filter(item => {
    const matchesSearch = 
      item.nim.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.prodi_nama.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    if (filterStatus === "valid") return item.isValid;
    if (filterStatus === "invalid") return !item.isValid;
    
    return true;
  });

  const handleUpload = async () => {
    // ... handleUpload unchanged logic...
    const validData = data.filter(d => d.isValid);
    if (validData.length === 0) {
      toast.error("Tidak ada data valid untuk diimport.");
      return;
    }
    
    setIsUploading(true);
    const toastId = toast.loading("Mengimport data mahasiswa...");
    try {
      const payload = validData.map(d => {
        // ... map logic
        const prodi = studyPrograms.find(p => p.nama.toLowerCase() === d.prodi_nama.toLowerCase());
        return {
          nim: d.nim,
          nama: d.nama,
          study_program_id: prodi?.id || "",
          angkatan: d.angkatan,
          alamat: d.alamat,
          status_mahasiswa: "AKTIF",
          jenis_kelamin: d.jenis_kelamin,
          tempat_lahir: d.tempat_lahir,
          // Map "-" to null for database
          tanggal_lahir: d.tanggal_lahir === "-" ? null : d.tanggal_lahir,
          agama: d.agama,
          nik: d.nik,
          status: d.status,
          no_hp: d.no_hp,
          // Map "-" to null for database
          email: d.email === "-" ? null : d.email,
        };
      });

      await createBulkStudents(payload);
      toast.success(`Berhasil mengimport ${validData.length} data mahasiswa.`, { id: toastId });
      onSuccess();
      onClose(false);
      setData([]); // Reset
      setSearchQuery("");
      setFilterStatus("all");
    } catch (error: any) {
      toast.error("Gagal melakukan import: " + error.message, { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setData([]);
    setSearchQuery("");
    setFilterStatus("all");
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!max-w-[85vw] w-full h-[85vh] flex flex-col p-0 gap-0">
        <div className="p-4 sm:p-6 pb-2">
            <DialogHeader>
            <DialogTitle className="text-xl">Import Data Mahasiswa</DialogTitle>
            <DialogDescription>
                Unduh template, isi data, lalu upload file Excel (.xlsx).
            </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between py-4 gap-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
                    <Button variant="outline" onClick={handleDownloadTemplate} className="justify-center">
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        Download Template
                    </Button>
                    <div className="relative">
                        <input 
                            type="file" 
                            ref={fileInputRef}
                            accept=".xlsx, .xls"
                            className="hidden"
                            onChange={(e) => {
                                if (e.target.files?.[0]) processExcel(e.target.files[0]);
                            }}
                        />
                        <Button 
                            onClick={() => fileInputRef.current?.click()} 
                            disabled={isChecking || data.length > 0}
                            className="w-full sm:w-auto justify-center"
                        >
                            <Upload className="mr-2 h-4 w-4" />
                            Pilih File Excel
                        </Button>
                    </div>
                </div>

                {data.length > 0 && (
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <Button 
                            variant="outline" 
                            size="icon"
                            onClick={handleReset}
                            title="Reset Data"
                            className="shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        >
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button 
                                    variant="outline" 
                                    size="icon"
                                    className={filterStatus !== "all" ? "bg-blue-50 text-blue-600 border-blue-200" : ""}
                                >
                                    {filterStatus !== "all" ? <ListFilter className="h-4 w-4" /> : <Filter className="h-4 w-4" />}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Filter Status</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuCheckboxItem 
                                    checked={filterStatus === "all"}
                                    onCheckedChange={() => setFilterStatus("all")}
                                >
                                    Semua Status
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem 
                                    checked={filterStatus === "valid"}
                                    onCheckedChange={() => setFilterStatus("valid")}
                                >
                                    Valid
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem 
                                    checked={filterStatus === "invalid"}
                                    onCheckedChange={() => setFilterStatus("invalid")}
                                >
                                    Error
                                </DropdownMenuCheckboxItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <div className="relative flex-1 sm:w-64">
                             <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                             <Input
                                placeholder="Cari NIM atau Nama..."
                                className="pl-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                             />
                        </div>
                    </div>
                )}
            </div>
        </div>

        {isChecking || data.length > 0 ? (
            <div className="flex-1 overflow-hidden px-4 sm:px-6">
                <ScrollArea className="h-full border rounded-md">
                    <Table className="min-w-full w-max">
                        <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                            <TableRow>
                                <TableHead className="w-[50px] whitespace-nowrap">Status</TableHead>
                                <TableHead className="whitespace-nowrap">Keterangan</TableHead>
                                <TableHead className="whitespace-nowrap">NIM</TableHead>
                                <TableHead className="min-w-[200px] whitespace-nowrap">Nama</TableHead>
                                <TableHead className="whitespace-nowrap">NIK</TableHead>
                                <TableHead className="whitespace-nowrap">L/P</TableHead>
                                <TableHead className="whitespace-nowrap">Prodi</TableHead>
                                <TableHead className="whitespace-nowrap">Angkatan</TableHead>
                                <TableHead className="whitespace-nowrap">Tempat Lahir</TableHead>
                                <TableHead className="whitespace-nowrap">Tanggal Lahir</TableHead>
                                <TableHead className="whitespace-nowrap">Agama</TableHead>
                                <TableHead className="whitespace-nowrap">Status</TableHead>
                                <TableHead className="whitespace-nowrap">No HP</TableHead>
                                <TableHead className="whitespace-nowrap">Email</TableHead>
                                <TableHead className="whitespace-nowrap">Alamat</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isChecking ? (
                                Array.from({ length: 10 }).map((_, i) => (
                                    <TableRow key={i}>
                                        {Array.from({ length: 15 }).map((_, j) => (
                                            <TableCell key={j}>
                                                <Skeleton className="h-6 w-full rounded" />
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : filteredData.length > 0 ? (
                                filteredData.map((row, idx) => (
                                    <TableRow key={idx} className={!row.isValid ? "bg-red-50" : ""}>
                                        <TableCell className="text-center">
                                            {row.isValid ? (
                                                <div className="flex justify-center">
                                                     <CheckCircle className="h-4 w-4 text-green-600" />
                                                </div>
                                            ) : (
                                                <div className="flex justify-center">
                                                    <AlertCircle className="h-4 w-4 text-red-600" />
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="min-w-[200px]">
                                            {row.isValid ? (
                                                <span className="text-xs font-medium text-emerald-600">
                                                    Siap import
                                                </span>
                                            ) : (
                                                <div className="flex flex-col gap-0.5">
                                                    {row.errors.map((err, i) => (
                                                        <span key={i} className="text-xs text-red-600 font-medium">
                                                            {err}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap">{row.nim}</TableCell>
                                        <TableCell className="whitespace-nowrap">{row.nama}</TableCell>
                                        <TableCell className="whitespace-nowrap">{row.nik}</TableCell>
                                        <TableCell className="whitespace-nowrap">{row.jenis_kelamin}</TableCell>
                                        <TableCell className="whitespace-nowrap">{row.prodi_nama}</TableCell>
                                        <TableCell className="whitespace-nowrap">{row.angkatan}</TableCell>
                                        <TableCell className="whitespace-nowrap">{row.tempat_lahir}</TableCell>
                                        <TableCell className="whitespace-nowrap">{row.tanggal_lahir || "-"}</TableCell>
                                        <TableCell className="whitespace-nowrap">{row.agama}</TableCell>
                                        <TableCell className="whitespace-nowrap">{row.status}</TableCell>
                                        <TableCell className="whitespace-nowrap">{row.no_hp}</TableCell>
                                        <TableCell className="whitespace-nowrap">{row.email || "-"}</TableCell>
                                        <TableCell className="min-w-[300px]">{row.alamat}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={15} className="text-center h-24 text-muted-foreground">
                                        Data tidak ditemukan sesuai kata kunci "{searchQuery}"
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </div>
        ) : (
             <div 
                className="flex-1 flex flex-col items-center justify-center border-dashed border-2 rounded-md mx-4 sm:mx-6 mb-2 text-muted-foreground min-h-[200px] hover:bg-muted/5 transition-colors cursor-pointer"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files?.[0]) processExcel(e.dataTransfer.files[0]);
                }}
                onClick={() => fileInputRef.current?.click()}
            >
                <div className="flex flex-col items-center gap-4 p-6">
                    <div className="p-4 bg-slate-50 text-slate-500 rounded-full">
                         <Upload className="h-8 w-8" />
                    </div>
                    <div className="space-y-1 text-center">
                        <p className="text-base font-semibold text-slate-900">
                            Drag & Drop file Excel di sini
                        </p>
                        <p className="text-sm text-slate-500">
                            atau klik untuk memilih file dari komputer
                        </p>
                    </div>
                </div>
            </div>
        )}

        <div className="p-4 sm:p-6 pt-4 mt-auto border-t bg-background sm:rounded-b-lg">
            <DialogFooter className="flex-col sm:flex-row gap-2">
                <div className="flex-1 text-sm text-muted-foreground text-center sm:text-left mb-2 sm:mb-0">
                    {data.length > 0 && (
                        <span>
                            Total: {data.length} | Valid: {data.filter(d => d.isValid).length} | Invalid: {data.filter(d => !d.isValid).length}
                            {searchQuery && ` (Ditampilkan: ${filteredData.length})`}
                        </span>
                    )}
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Button variant="outline" onClick={() => onClose(false)} disabled={isUploading} className="w-full sm:w-auto">Batal</Button>
                    <Button 
                        onClick={handleUpload} 
                        disabled={isUploading || data.filter(d => d.isValid).length === 0}
                        className="w-full sm:w-auto"
                    >
                        Import Data Valid
                    </Button>
                </div>
            </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
