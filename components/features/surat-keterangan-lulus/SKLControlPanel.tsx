"use client";

import React from "react";
import { StudentData, Official } from "@/lib/types";
import { Printer, Check, ChevronsUpDown, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface SKLControlPanelProps {
  students: StudentData[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  signatureType: "basah" | "digital" | "none";
  onSignatureChange: (type: "basah" | "digital" | "none") => void;
  onPrint: () => void;
  officialKaprodi: Official | null;
  officialKetua: Official | null;
  user?: any;
  totalPages?: number;

  nomorSurat: string; setNomorSurat: (v: string) => void;
  hariSidang: string; setHariSidang: (v: string) => void;
  tanggalSidang: string; setTanggalSidang: (v: string) => void;
  nilaiSidang: string; setNilaiSidang: (v: string) => void;
  ipkYudisium: string; setIpkYudisium: (v: string) => void;
  predikat: string; setPredikat: (v: string) => void;
}

const PREDIKAT_OPTIONS = ["Memuaskan", "Sangat Memuaskan", "Dengan Pujian (Cumlaude)"];

export default function SKLControlPanel({
  students, selectedIndex, onSelect,
  signatureType, onSignatureChange, onPrint,
  officialKaprodi, officialKetua,
  user, totalPages,
  nomorSurat, setNomorSurat,
  hariSidang, setHariSidang,
  tanggalSidang, setTanggalSidang,
  nilaiSidang, setNilaiSidang,
  ipkYudisium, setIpkYudisium,
  predikat, setPredikat,
}: SKLControlPanelProps) {
  const [open, setOpen] = React.useState(false);
  const isMahasiswa = user?.role === "mahasiswa";
  const selectedStudentName = students[selectedIndex]?.profile.nama || "Pilih Mahasiswa...";

  const labelClass = "text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block";
  const sectionClass = "flex flex-col gap-2 rounded-xl border border-gray-100 bg-gray-50/60 p-3";

  const hasAnySignature =
    officialKaprodi?.ttd_basah_url || officialKaprodi?.ttd_digital_url ||
    officialKetua?.ttd_basah_url || officialKetua?.ttd_digital_url;

  return (
    <aside className="w-full print:hidden xl:sticky xl:top-24 h-fit">
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
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
          {/* Pilih Mahasiswa */}
          <div className={sectionClass}>
            <div className="flex items-baseline justify-between">
              <label className={labelClass}>Mahasiswa</label>
              {!isMahasiswa && (
                <p className="text-[11px] text-gray-400">{selectedIndex + 1}/{students.length}</p>
              )}
            </div>
            {isMahasiswa ? (
              <div className="flex items-center px-3 py-2 bg-white border border-gray-200 rounded-xl h-10 select-none cursor-not-allowed opacity-90">
                <span className="text-xs font-medium text-gray-700 truncate w-full">{selectedStudentName}</span>
                <Lock className="w-3 h-3 text-gray-400 ml-2 shrink-0" />
              </div>
            ) : (
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
                      <CommandEmpty className="py-2 text-center text-xs text-gray-500">Tidak ditemukan.</CommandEmpty>
                      <CommandGroup>
                        {students.map((student, index) => (
                          <CommandItem
                            key={student.id}
                            value={student.profile.nama}
                            onSelect={() => { onSelect(index); setOpen(false); }}
                            className="text-xs rounded-lg cursor-pointer aria-selected:bg-gray-100"
                          >
                            <Check className={cn("mr-2 h-3 w-3", selectedIndex === index ? "opacity-100" : "opacity-0")} />
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

          {/* Detail Surat */}
          <div className={sectionClass}>
            <label className={labelClass}>Detail Surat</label>
            <Input
              value={nomorSurat}
              onChange={(e) => setNomorSurat(e.target.value)}
              className="h-9 bg-white text-xs rounded-xl border-gray-200"
              placeholder="No. Surat (misal: 001)"
            />
          </div>

          {/* Data Sidang */}
          <div className={sectionClass}>
            <label className={labelClass}>Data Sidang Skripsi</label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={hariSidang}
                onChange={(e) => setHariSidang(e.target.value)}
                className="h-9 bg-white text-xs rounded-xl border-gray-200"
                placeholder="Hari (misal: Kamis)"
              />
              <Input
                value={tanggalSidang}
                onChange={(e) => setTanggalSidang(e.target.value)}
                className="h-9 bg-white text-xs rounded-xl border-gray-200"
                placeholder="Tanggal (misal: 12 Maret 2026)"
              />
            </div>
            <Input
              value={nilaiSidang}
              onChange={(e) => setNilaiSidang(e.target.value)}
              className="h-9 bg-white text-xs rounded-xl border-gray-200"
              placeholder="Nilai Sidang (misal: B)"
            />
            <Input
              value={ipkYudisium}
              onChange={(e) => setIpkYudisium(e.target.value)}
              className="h-9 bg-white text-xs rounded-xl border-gray-200"
              placeholder="IPK Yudisium (misal: 3.45)"
            />
            <Select value={predikat} onValueChange={setPredikat}>
              <SelectTrigger className="w-full h-9 bg-white text-xs rounded-xl border-gray-200">
                <SelectValue placeholder="Pilih Predikat" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {PREDIKAT_OPTIONS.map((p) => (
                  <SelectItem key={p} value={p} className="text-xs rounded-lg cursor-pointer">{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tanda Tangan */}
          {hasAnySignature && (
            <div className={sectionClass}>
              <label className={labelClass}>Tanda Tangan</label>
              <Select value={signatureType} onValueChange={(v) => onSignatureChange(v as "basah" | "digital" | "none")}>
                <SelectTrigger className="w-full h-9 bg-white text-xs rounded-xl border-gray-200">
                  <SelectValue placeholder="Pilih Tipe TTD" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="none" className="text-xs rounded-lg cursor-pointer">Tanpa tanda tangan</SelectItem>
                  {(officialKaprodi?.ttd_basah_url || officialKetua?.ttd_basah_url) && (
                    <SelectItem value="basah" className="text-xs rounded-lg cursor-pointer">Tanda tangan basah</SelectItem>
                  )}
                  {(officialKaprodi?.ttd_digital_url || officialKetua?.ttd_digital_url) && (
                    <SelectItem value="digital" className="text-xs rounded-lg cursor-pointer">Tanda tangan digital (QR)</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button
            onClick={onPrint}
            className="w-full h-11 text-sm font-semibold shadow-sm rounded-xl bg-primary hover:bg-primary/90 text-white"
          >
            <Printer className="mr-2 h-4 w-4" />
            Cetak PDF
          </Button>

          <div className="text-center">
            <p className="text-[10px] text-gray-400 leading-snug">Pastikan pengaturan kertas <b>A4</b> & margin <b>None</b>.</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
