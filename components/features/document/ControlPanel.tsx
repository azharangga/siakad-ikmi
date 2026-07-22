import React from "react";
import { StudentData, Official } from "@/lib/types";
import { Printer, Check, ChevronsUpDown, Lock } from "lucide-react"; // Icon User dihapus
import { cn } from "@/lib/utils";

// Shadcn UI Components
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ControlPanelProps {
  students: StudentData[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  signatureType: "basah" | "digital" | "none";
  onSignatureChange: (type: "basah" | "digital" | "none") => void;
  onPrint: () => void;
  disablePrint?: boolean;
  official?: Official | null;
  
  // Data User Login untuk Cek Role
  user?: any;

  // Props KHS
  showSemesterSelect?: boolean;
  availableSemesters?: number[];
  selectedSemester?: number;
  onSelectSemester?: (smt: number) => void;

  // Props Data Manual untuk Surat
  nomorSurat?: string; setNomorSurat?: (val: string) => void;
  tahunAkademik?: string; setTahunAkademik?: (val: string) => void;
  tempatLahir?: string; setTempatLahir?: (val: string) => void;
  tanggalLahir?: string; setTanggalLahir?: (val: string) => void;
  alamat?: string; setAlamat?: (val: string) => void;
  namaOrangTua?: string; setNamaOrangTua?: (val: string) => void;
  pekerjaanOrangTua?: string; setPekerjaanOrangTua?: (val: string) => void;
  
  totalPages?: number;
}

export default function ControlPanel(props: ControlPanelProps) {
  const { students, selectedIndex, onSelect, signatureType, onSignatureChange, onPrint, totalPages, disablePrint, user, official } = props;
  const [open, setOpen] = React.useState(false);
  
  const labelClass = "text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block";
  const sectionClass = "flex flex-col gap-2 rounded-xl border border-gray-100 bg-gray-50/60 p-3";

  // Nama mahasiswa yang sedang dipilih
  const selectedStudentName = students[selectedIndex]?.profile.nama || "Pilih Mahasiswa...";

  // Cek apakah user adalah mahasiswa
  const isMahasiswa = user?.role === "mahasiswa";

  return (
    <aside className="w-full print:hidden xl:sticky xl:top-24 h-fit">
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        {/* Header */}
        <div className="px-5 pt-5 flex justify-between items-start">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Panel Kontrol</h3>
            <p className="mt-1 text-xs text-gray-500">Atur opsi dokumen, lalu cetak.</p>
          </div>
          {totalPages !== undefined && (
            <div className={`px-2 py-1 rounded-xl text-[10px] font-bold border ${
              totalPages > 1 
                ? "bg-yellow-50 text-yellow-700 border-yellow-200" 
                : "bg-green-50 text-green-700 border-green-200"
            }`}>
              {totalPages} Hal.
            </div>
          )}
        </div>

        <div className="p-5 flex flex-col gap-4">
          
          {/* BAGIAN PILIH MAHASISWA */}
          <div className={sectionClass}>
            <div className="flex items-baseline justify-between">
              <label className={labelClass}>Mahasiswa</label>
              {/* Jika Admin, tampilkan counter page. Jika Mahasiswa, sembunyikan */}
              {!isMahasiswa && (
                <p className="text-[11px] text-gray-400">{selectedIndex + 1}/{students.length}</p>
              )}
            </div>
            
            {/* LOGIKA KONDISIONAL */}
            {isMahasiswa ? (
               // TAMPILAN UNTUK MAHASISWA (READ ONLY - TERKUNCI - HANYA NAMA)
               <div className="flex items-center px-3 py-2 bg-white border border-gray-200 rounded-xl h-10 select-none cursor-not-allowed opacity-90">
                  <span className="text-xs font-medium text-gray-700 truncate w-full">
                    {selectedStudentName}
                  </span>
                  <Lock className="w-3 h-3 text-gray-400 ml-2 shrink-0" />
               </div>
            ) : (
               // TAMPILAN UNTUK ADMIN (DROPDOWN SEARCHABLE)
               <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={open}
                      className="w-full justify-between h-9 bg-white text-xs rounded-xl border-gray-200 font-normal text-left px-3 hover:bg-white hover:text-gray-900"
                    >
                      <span className="truncate">{selectedStudentName}</span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 rounded-xl shadow-lg" align="start">
                    <Command className="rounded-xl">
                      <CommandInput placeholder="Cari nama mahasiswa..." className="text-xs h-9" />
                      <CommandList>
                        <CommandEmpty className="py-2 text-center text-xs text-gray-500">
                          Tidak ditemukan.
                        </CommandEmpty>
                        <CommandGroup>
                          {students.map((student, index) => (
                            <CommandItem
                              key={student.id}
                              value={student.profile.nama}
                              onSelect={() => {
                                onSelect(index);
                                setOpen(false);
                              }}
                              className="text-xs rounded-lg cursor-pointer aria-selected:bg-gray-100"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-3 w-3",
                                  selectedIndex === index ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {student.profile.nama}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
               </Popover>
            )}
          </div> 

          {/* Pilih Semester (KHS) */}
          {props.showSemesterSelect && (
            <div className={sectionClass}>
              <label className={labelClass}>Semester</label>
              <Select
                value={String(props.selectedSemester)}
                onValueChange={(val) => props.onSelectSemester?.(Number(val))}
              >
                <SelectTrigger className="w-full h-9 bg-white text-xs rounded-xl border-gray-200">
                  <SelectValue placeholder="Pilih Semester" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {props.availableSemesters?.map((smt) => (
                    <SelectItem key={smt} value={String(smt)} className="text-xs rounded-lg cursor-pointer">
                      Semester {smt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Input Manual Surat (Optional) */}
          {props.setNomorSurat && (
            <div className={sectionClass}>
              <label className={labelClass}>Detail Surat</label>
              <div className="space-y-2">
                  <Input 
                    type="text" 
                    value={props.nomorSurat} 
                    onChange={(e) => props.setNomorSurat?.(e.target.value)} 
                    className="h-9 bg-white text-xs rounded-xl border-gray-200" 
                    placeholder="No Surat" 
                  />
                  <Input 
                    type="text" 
                    value={props.tahunAkademik} 
                    onChange={(e) => props.setTahunAkademik?.(e.target.value)} 
                    className="h-9 bg-white text-xs rounded-xl border-gray-200" 
                    placeholder="Tahun Akademik" 
                  />
              </div>
            </div>
          )}

          {/* Data Tambahan (Optional) */}
          {props.setTempatLahir && (
             <div className={sectionClass}>
              <label className={labelClass}>Biodata</label>
              <div className="grid grid-cols-2 gap-2">
                 <Input value={props.tempatLahir} onChange={(e) => props.setTempatLahir?.(e.target.value)} className="h-9 bg-white text-xs rounded-xl border-gray-200" placeholder="Tempat Lahir" />
                 <Input value={props.tanggalLahir} onChange={(e) => props.setTanggalLahir?.(e.target.value)} className="h-9 bg-white text-xs rounded-xl border-gray-200" placeholder="Tgl Lahir" />
              </div>
              <Textarea value={props.alamat} onChange={(e) => props.setAlamat?.(e.target.value)} className="bg-white min-h-[60px] text-xs resize-none rounded-xl border-gray-200" placeholder="Alamat" />
            </div>
          )}
          
          {props.setNamaOrangTua && (
            <div className={sectionClass}>
              <label className={labelClass}>Data Orang Tua</label>
              <div className="space-y-2">
                <Input value={props.namaOrangTua} onChange={(e) => props.setNamaOrangTua?.(e.target.value)} className="h-9 bg-white text-xs rounded-xl border-gray-200" placeholder="Nama Ayah/Ibu" />
                <Input value={props.pekerjaanOrangTua} onChange={(e) => props.setPekerjaanOrangTua?.(e.target.value)} className="h-9 bg-white text-xs rounded-xl border-gray-200" placeholder="Pekerjaan" />
              </div>
            </div>
          )}

          {/* Tanda Tangan (Hidden jika print disabled/terkunci) */}
          {!disablePrint && (
            <div className={sectionClass}>
                <label className={labelClass}>Tanda Tangan</label>
                <Select value={signatureType} onValueChange={(val) => onSignatureChange(val as "basah" | "digital" | "none")}>
                <SelectTrigger className="w-full h-9 bg-white text-xs rounded-xl border-gray-200">
                    <SelectValue placeholder="Pilih Tipe TTD" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                    <SelectItem value="none" className="text-xs rounded-lg cursor-pointer">Tanpa tanda tangan</SelectItem>
                    {official?.ttd_basah_url && <SelectItem value="basah" className="text-xs rounded-lg cursor-pointer">Tanda tangan basah</SelectItem>}
                    {official?.ttd_digital_url && <SelectItem value="digital" className="text-xs rounded-lg cursor-pointer">Tanda tangan digital</SelectItem>}
                </SelectContent>
                </Select>
            </div>
          )}

          {/* Tombol Cetak */}
          <Button 
            onClick={onPrint} 
            disabled={disablePrint}
            className={cn(
              "w-full h-11 text-sm font-semibold shadow-sm rounded-xl transition-all duration-200",
              disablePrint 
                ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 shadow-none hover:bg-slate-100" 
                : "bg-primary hover:bg-primary/90 text-white"
            )}
          > 
             {disablePrint ? (
                <>
                    <Lock className="mr-2 h-4 w-4" />
                    Terkunci
                </>
             ) : (
                <>
                    <Printer className="mr-2 h-4 w-4" />
                    Cetak PDF
                </>
             )}
          </Button> 
          
          <div className="text-center"> 
            <p className="text-[10px] text-gray-400 leading-snug">Pastikan pengaturan kertas <b>A4</b> & margin <b>None</b>.</p> 
          </div>
        </div>
      </div>
    </aside>
  );
}