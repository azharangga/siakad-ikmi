'use client';

import React, { useState, useMemo } from "react";
import { toast } from "sonner";
import PageHeader from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable, type Column } from "@/components/ui/data-table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Pencil, Trash2, Plus, Award } from "lucide-react";
import { PredikatYudisium, PredikatYudisiumFormValues } from "@/lib/types";
import {
  createPredikatYudisium, updatePredikatYudisium, deletePredikatYudisium,
} from "@/app/actions/predikat-yudisium";

interface Props {
  initialData: PredikatYudisium[];
}

const EMPTY_FORM: PredikatYudisiumFormValues = { label: "", ipk_min: "", ipk_max: "", urutan: "" };

export default function PredikatYudisiumClient({ initialData }: Props) {
  const [data, setData] = useState<PredikatYudisium[]>(initialData);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PredikatYudisium | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PredikatYudisium | null>(null);
  const [form, setForm] = useState<PredikatYudisiumFormValues>(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredData = useMemo(() => {
    if (!searchQuery) return data;
    return data.filter((d) => d.label.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [data, searchQuery]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const openAdd = () => { setEditTarget(null); setForm(EMPTY_FORM); setIsDialogOpen(true); };
  const openEdit = (row: PredikatYudisium) => {
    setEditTarget(row);
    setForm({ label: row.label, ipk_min: row.ipk_min, ipk_max: row.ipk_max, urutan: row.urutan });
    setIsDialogOpen(true);
  };
  const openDelete = (row: PredikatYudisium) => { setDeleteTarget(row); setIsDeleteOpen(true); };

  const refresh = async () => {
    const { getPredikatYudisium } = await import("@/app/actions/predikat-yudisium");
    setData(await getPredikatYudisium());
  };

  const handleSubmit = async () => {
    if (!form.label || form.ipk_min === "" || form.ipk_max === "") {
      toast.error("Label, IPK min, dan IPK max wajib diisi.");
      return;
    }
    setIsLoading(true);
    try {
      if (editTarget) {
        await updatePredikatYudisium(editTarget.id, form);
        toast.success("Predikat berhasil diperbarui.");
      } else {
        await createPredikatYudisium(form);
        toast.success("Predikat berhasil ditambahkan.");
      }
      await refresh();
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
      await deletePredikatYudisium(deleteTarget.id);
      toast.success("Predikat berhasil dihapus.");
      await refresh();
    } catch (e: any) {
      toast.error(e.message || "Terjadi kesalahan.");
    } finally {
      setIsLoading(false);
      setIsDeleteOpen(false);
    }
  };

  const columns: Column<PredikatYudisium>[] = [
    {
      header: "#",
      className: "w-[50px] text-center",
      render: (_, i) => <span className="text-muted-foreground">{startIndex + i + 1}</span>,
    },
    {
      header: "Label Predikat",
      render: (row) => (
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-amber-500" />
          <span className="font-semibold">{row.label}</span>
        </div>
      ),
    },
    {
      header: "Rentang IPK",
      render: (row) => (
        <span className="font-mono text-sm">
          {row.ipk_min.toFixed(2)} – {row.ipk_max.toFixed(2)}
        </span>
      ),
    },
    {
      header: "Aksi",
      className: "text-center w-[100px]",
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          <Button size="icon" variant="ghost" className="h-8 w-8 text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50" onClick={() => openEdit(row)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => openDelete(row)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 w-full">
      <PageHeader title="Predikat Yudisium" breadcrumb={["Beranda", "Masterdata", "Predikat Yudisium"]} />

      <Card className="border-none shadow-sm ring-1 ring-gray-200">
        <CardContent className="p-4 sm:p-6">
          <DataTable
            data={currentData}
            columns={columns}
            isLoading={false}
            searchQuery={searchQuery}
            onSearchChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            searchPlaceholder="Cari predikat..."
            onAdd={openAdd}
            addLabel="Tambah Predikat"
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
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Predikat" : "Tambah Predikat Yudisium"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Label Predikat <span className="text-destructive">*</span></Label>
              <Input
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="Contoh: Memuaskan"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>IPK Minimum <span className="text-destructive">*</span></Label>
                <Input
                  type="number" step="0.01" min="0" max="4"
                  value={form.ipk_min}
                  onChange={(e) => setForm((f) => ({ ...f, ipk_min: e.target.value }))}
                  placeholder="2.00"
                />
              </div>
              <div className="space-y-1.5">
                <Label>IPK Maksimum <span className="text-destructive">*</span></Label>
                <Input
                  type="number" step="0.01" min="0" max="4"
                  value={form.ipk_max}
                  onChange={(e) => setForm((f) => ({ ...f, ipk_max: e.target.value }))}
                  placeholder="2.99"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Urutan Tampil</Label>
              <Input
                type="number" min="1"
                value={form.urutan}
                onChange={(e) => setForm((f) => ({ ...f, urutan: e.target.value }))}
                placeholder="1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isLoading}>Batal</Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? "Menyimpan..." : editTarget ? "Simpan" : "Tambah"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRM */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Predikat?</AlertDialogTitle>
            <AlertDialogDescription>
              Predikat <strong>{deleteTarget?.label}</strong> akan dihapus permanen.
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
