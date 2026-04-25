'use client';

import React, { useState, useMemo } from "react";
import { toast } from "sonner";
import PageHeader from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, type Column } from "@/components/ui/data-table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, Pencil, Trash2, Plus, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { SidangSkripsi, SidangSkripsiFormValues, StudentData } from "@/lib/types";
import {
  createSidangSkripsi, updateSidangSkripsi, deleteSidangSkripsi,
} from "@/app/actions/sidang-skripsi";

interface JadwalSidangClientProps {
  user: any;
  sidangList: SidangSkripsi[];
  allStudents: StudentData[];
}

const EMPTY_FORM: SidangSkripsiFormValues = {
  student_id: "",
  tanggal_sidang: "",
  hari_sidang: "",
  ruangan: "",
  waktu_mulai: "",
  waktu_selesai: "",
  catatan: "",
};

const HARI_OPTIONS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export default function JadwalSidangClient({ user, sidangList: initialList, allStudents }: JadwalSidangClientProps) {
  const [data, setData] = useState<SidangSkripsi[]>(initialList);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SidangSkripsi | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SidangSkripsi | null>(null);
  const [form, setForm] = useState<SidangSkripsiFormValues>(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(false);
  const [studentOpen, setStudentOpen] = useState(false);
  const [hariOpen, setHariOpen] = useState(false);

  // Pagination & search state
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredData = useMemo(() => {
    if (!searchQuery) return data;
    const q = searchQuery.toLowerCase();
    return data.filter(
      (s) =>
        s.student?.nama?.toLowerCase().includes(q) ||
        s.student?.nim?.toLowerCase().includes(q) ||
        s.hari_sidang?.toLowerCase().includes(q)
    );
  }, [data, searchQuery]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const selectedStudentName = allStudents.find((s) => s.id === form.student_id)?.profile.nama || "Pilih Mahasiswa...";

  const openAdd = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setIsDialogOpen(true);
  };

  const openEdit = (row: SidangSkripsi) => {
    setEditTarget(row);
    setForm({
      student_id: row.student_id,
      tanggal_sidang: row.tanggal_sidang,
      hari_sidang: row.hari_sidang,
      ruangan: row.ruangan || "",
      waktu_mulai: row.waktu_mulai || "",
      waktu_selesai: row.waktu_selesai || "",
      catatan: row.catatan || "",
    });
    setIsDialogOpen(true);
  };

  const openDelete = (row: SidangSkripsi) => {
    setDeleteTarget(row);
    setIsDeleteOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.student_id || !form.tanggal_sidang || !form.hari_sidang) {
      toast.error("Mahasiswa, tanggal, dan hari sidang wajib diisi.");
      return;
    }
    setIsLoading(true);
    try {
      if (editTarget) {
        await updateSidangSkripsi(editTarget.id, form);
        toast.success("Jadwal sidang berhasil diperbarui.");
      } else {
        await createSidangSkripsi(form);
        toast.success("Jadwal sidang berhasil ditambahkan.");
      }
      // Refresh data
      const { getSidangSkripsi } = await import("@/app/actions/sidang-skripsi");
      setData(await getSidangSkripsi());
      setIsDialogOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Terjadi kesalahan.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsLoading(true);
    try {
      await deleteSidangSkripsi(deleteTarget.id);
      toast.success("Jadwal sidang berhasil dihapus.");
      const { getSidangSkripsi } = await import("@/app/actions/sidang-skripsi");
      setData(await getSidangSkripsi());
    } catch (e: any) {
      toast.error(e.message || "Terjadi kesalahan.");
    } finally {
      setIsLoading(false);
      setIsDeleteOpen(false);
    }
  };

  const formatTanggal = (iso: string) => {
    if (!iso) return "-";
    return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
  };

  const columns: Column<SidangSkripsi>[] = [
    {
      header: "#",
      className: "w-[50px] text-center",
      render: (_, i) => <span className="text-muted-foreground">{startIndex + i + 1}</span>,
    },
    {
      header: "Mahasiswa",
      render: (row) => (
        <div>
          <p className="font-semibold">{row.student?.nama || "-"}</p>
          <p className="text-xs text-muted-foreground font-mono">{row.student?.nim || "-"}</p>
        </div>
      ),
    },
    {
      header: "Program Studi",
      render: (row) => (
        <span className="text-sm text-slate-600">
          {row.student?.study_program?.nama || "-"}
        </span>
      ),
    },
    {
      header: "Hari & Tanggal",
      render: (row) => (
        <div>
          <p className="font-medium">{row.hari_sidang}</p>
          <p className="text-xs text-muted-foreground">{formatTanggal(row.tanggal_sidang)}</p>
        </div>
      ),
    },
    {
      header: "Waktu",
      render: (row) =>
        row.waktu_mulai ? (
          <span className="text-sm">{row.waktu_mulai}{row.waktu_selesai ? ` – ${row.waktu_selesai}` : ""}</span>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        ),
    },
    {
      header: "Ruangan",
      render: (row) => <span className="text-sm">{row.ruangan || "-"}</span>,
    },
    {
      header: "Aksi",
      className: "text-center w-[100px]",
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(row)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => openDelete(row)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 w-full">
      <PageHeader title="Jadwal Sidang Skripsi" breadcrumb={["Beranda", "Jadwal Sidang Skripsi"]} />

      <Card className="border-none shadow-sm ring-1 ring-gray-200">
        <CardContent className="p-4 sm:p-6">
          <DataTable
            data={currentData}
            columns={columns}
            isLoading={false}
            searchQuery={searchQuery}
            onSearchChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            searchPlaceholder="Cari mahasiswa atau NIM..."
            onAdd={openAdd}
            addLabel="Tambah Jadwal"
            addIcon={<Plus className="mr-2 h-4 w-4" />}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            startIndex={startIndex}
            endIndex={startIndex + itemsPerPage}
            totalItems={filteredData.length}
          />
        </CardContent>
      </Card>

      {/* FORM DIALOG */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              {editTarget ? "Edit Jadwal Sidang" : "Tambah Jadwal Sidang"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Mahasiswa */}
            <div className="space-y-1.5">
              <Label>Mahasiswa <span className="text-destructive">*</span></Label>
              <Popover open={studentOpen} onOpenChange={setStudentOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                    <span className="truncate">{selectedStudentName}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Cari mahasiswa..." className="h-9" />
                    <CommandList>
                      <CommandEmpty>Tidak ditemukan.</CommandEmpty>
                      <CommandGroup>
                        {allStudents.map((s) => (
                          <CommandItem
                            key={s.id}
                            value={s.profile.nama}
                            onSelect={() => { setForm((f) => ({ ...f, student_id: s.id })); setStudentOpen(false); }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", form.student_id === s.id ? "opacity-100" : "opacity-0")} />
                            <span>{s.profile.nama}</span>
                            <span className="ml-auto text-xs text-muted-foreground font-mono">{s.profile.nim}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Hari & Tanggal */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Hari <span className="text-destructive">*</span></Label>
                <Popover open={hariOpen} onOpenChange={setHariOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                      <span>{form.hari_sidang || "Pilih hari..."}</span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[180px] p-0" align="start">
                    <Command>
                      <CommandList>
                        <CommandGroup>
                          {HARI_OPTIONS.map((h) => (
                            <CommandItem key={h} value={h} onSelect={() => { setForm((f) => ({ ...f, hari_sidang: h })); setHariOpen(false); }}>
                              <Check className={cn("mr-2 h-4 w-4", form.hari_sidang === h ? "opacity-100" : "opacity-0")} />
                              {h}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <Label>Tanggal <span className="text-destructive">*</span></Label>
                <Input
                  type="date"
                  value={form.tanggal_sidang}
                  onChange={(e) => setForm((f) => ({ ...f, tanggal_sidang: e.target.value }))}
                />
              </div>
            </div>

            {/* Waktu */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Waktu Mulai</Label>
                <Input type="time" value={form.waktu_mulai} onChange={(e) => setForm((f) => ({ ...f, waktu_mulai: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Waktu Selesai</Label>
                <Input type="time" value={form.waktu_selesai} onChange={(e) => setForm((f) => ({ ...f, waktu_selesai: e.target.value }))} />
              </div>
            </div>

            {/* Ruangan */}
            <div className="space-y-1.5">
              <Label>Ruangan</Label>
              <Input value={form.ruangan} onChange={(e) => setForm((f) => ({ ...f, ruangan: e.target.value }))} placeholder="Contoh: Ruang A101" />
            </div>

            {/* Catatan */}
            <div className="space-y-1.5">
              <Label>Catatan</Label>
              <Textarea value={form.catatan} onChange={(e) => setForm((f) => ({ ...f, catatan: e.target.value }))} placeholder="Catatan tambahan..." className="resize-none min-h-[70px]" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isLoading}>Batal</Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? "Menyimpan..." : editTarget ? "Simpan Perubahan" : "Tambah Jadwal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRM */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Jadwal Sidang?</AlertDialogTitle>
            <AlertDialogDescription>
              Jadwal sidang untuk <strong>{deleteTarget?.student?.nama}</strong> akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isLoading} className="bg-destructive hover:bg-destructive/90">
              {isLoading ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
