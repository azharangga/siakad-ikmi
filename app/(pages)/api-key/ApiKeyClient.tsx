'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTable, type Column } from '@/components/ui/data-table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import Tooltip from '@/components/shared/Tooltip';
import { ConfirmModal } from '@/components/shared/ConfirmModal';
import { Key, Plus, Trash2, Edit, CheckCircle2, AlertTriangle, RefreshCw, XCircle, Eye, EyeOff, Copy, Check, Lock, MoreHorizontal } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface ApiKey {
  id: string;
  name: string;
  key_data?: string;
  model?: string;
  is_active: boolean;
  is_limited: boolean;
  created_at: string;
  updated_at: string;
}

export default function ApiKeyClient() {
  const [dataList, setDataList] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [defaultModalOpen, setDefaultModalOpen] = useState(false);
  const [activateModalOpen, setActivateModalOpen] = useState(false);
  const [keyToActivate, setKeyToActivate] = useState<ApiKey | null>(null);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [keyToDelete, setKeyToDelete] = useState<ApiKey | null>(null);
  
  // Filter & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [modelFilter, setModelFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Form values
  const [formData, setFormData] = useState({ name: '', key_data: '', model: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Visibilitas key per baris
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [copiedKeys, setCopiedKeys] = useState<Record<string, boolean>>({});

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyKey = (id: string, key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKeys(prev => ({ ...prev, [id]: true }));
    setTimeout(() => setCopiedKeys(prev => ({ ...prev, [id]: false })), 2000);
  };

  useEffect(() => {
    fetchApiKeys();

    const supabase = createClient();
    const channel = supabase.channel('api_keys_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'api_keys' }, () => {
        fetchApiKeys();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchApiKeys = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/settings/api-keys?t=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDataList(data || []);
    } catch (error: any) {
      toast.error(error.message || 'Gagal mengambil data API Key');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    let result = dataList.filter((item) => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (statusFilter === 'ACTIVE') {
      result = result.filter(k => k.is_active && !k.is_limited);
    } else if (statusFilter === 'INACTIVE') {
      result = result.filter(k => !k.is_active);
    } else if (statusFilter === 'LIMITED') {
      result = result.filter(k => k.is_limited);
    }

    if (modelFilter !== 'ALL') {
      result = result.filter(k => k.model === modelFilter);
    }

    return result;
  }, [dataList, searchQuery, statusFilter, modelFilter]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredData.slice(startIndex, endIndex);

  const openAddModal = () => {
    setEditingId(null);
    setFormData({ name: '', key_data: '', model: '' });
    setModalOpen(true);
  };

  const openEditModal = (key: ApiKey) => {
    setEditingId(key.id);
    setFormData({ name: key.name, key_data: key.key_data || '', model: key.model || '' });
    setModalOpen(true);
  };

  const openDeleteModal = (key: ApiKey) => {
    setKeyToDelete(key);
    setDeleteModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('Nama API Key wajib diisi');
      return;
    }
    if (!formData.key_data) {
      toast.error('Nilai API Key wajib diisi');
      return;
    }

    try {
      setIsSubmitting(true);
      const isEdit = !!editingId;
      const url = '/api/settings/api-keys';
      const method = isEdit ? 'PATCH' : 'POST';
      const body = isEdit 
        ? { action: 'edit', id: editingId, ...formData }
        : formData;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(data.message);
      setModalOpen(false);
      fetchApiKeys();
    } catch (error: any) {
      toast.error(error.message || 'Terjadi kesalahan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!keyToDelete) return;
    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/settings/api-keys?id=${keyToDelete.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      toast.success(data.message);
      setDeleteModalOpen(false);
      
      setDataList(prev => prev.filter(p => p.id !== keyToDelete.id));
      if (currentData.length === 1 && currentPage > 1) {
        setCurrentPage((p) => p - 1);
      }
    } catch (error: any) {
      toast.error(error.message || 'Gagal menghapus');
    } finally {
      setIsSubmitting(false);
      setKeyToDelete(null);
    }
  };

  const openActivateModal = (key: ApiKey) => {
    setKeyToActivate(key);
    setActivateModalOpen(true);
  };

  const handleSetActive = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/settings/api-keys', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_active', id: keyToActivate?.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.message);
      setActivateModalOpen(false);
      fetchApiKeys();
    } catch (error: any) {
      toast.error(error.message || 'Gagal mengubah status aktif');
      setIsLoading(false);
    }
  };

  const handleSetDefault = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/settings/api-keys', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_default' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.message);
      setDefaultModalOpen(false);
      fetchApiKeys();
    } catch (error: any) {
      toast.error(error.message || 'Gagal mengembalikan ke default');
      setIsLoading(false);
    }
  };

  const isUsingDefault = dataList.filter(k => k.id !== 'env-default').length === 0 || !dataList.some(k => k.id !== 'env-default' && k.is_active);

  const activeFilterCount = [
    statusFilter !== 'ALL',
    modelFilter !== 'ALL'
  ].filter(Boolean).length;

  const filterContent = (
    <div className="space-y-4 text-left">
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-slate-700">Status API Key</Label>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-full h-9">
            <SelectValue placeholder="Semua Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua Status</SelectItem>
            <SelectItem value="ACTIVE">Aktif</SelectItem>
            <SelectItem value="INACTIVE">Non Aktif</SelectItem>
            <SelectItem value="LIMITED">Terbatas Kuota</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-slate-700">Model AI</Label>
        <Select value={modelFilter} onValueChange={(v) => { setModelFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-full h-9">
            <SelectValue placeholder="Semua Model" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua Model</SelectItem>
            <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash</SelectItem>
            <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
            <SelectItem value="gemini-2.0-flash">Gemini 2.0 Flash</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const columns: Column<ApiKey>[] = [
    {
      header: "#",
      className: "w-[50px] text-center",
      render: (_, index) => <span className="text-muted-foreground font-medium">{startIndex + index + 1}</span>
    },
    {
      header: "Identitas / Nama",
      className: "min-w-[160px]",
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-800 text-sm whitespace-nowrap">{row.name}</span>
          {row.is_limited && (
            <Tooltip content="Mencapai batasan kuota layanan API" position="top">
               <Badge variant="destructive" className="flex items-center gap-1 font-normal cursor-help h-5 px-1.5 text-[10px]">
                 <AlertTriangle className="w-2.5 h-2.5" /> Limit
               </Badge>
            </Tooltip>
          )}
        </div>
      )
    },
    {
      header: "API Key",
      className: "min-w-[360px] w-[400px]",
      render: (row) => {
        const isVisible = !!visibleKeys[row.id];
        const isCopied = !!copiedKeys[row.id];
        const key = row.key_data || '';
        // Tampilkan 8 karakter pertama + 16 titik tetap sebagai mask
        const displayValue = isVisible
          ? key
          : `${key.slice(0, 8)}${'•'.repeat(16)}`;

        return (
          <div className="flex items-center gap-1.5 w-full min-w-0">
            {/* Kotak API Key dengan tombol copy floating di dalam */}
            <div className="relative flex-1 min-w-0 group/key">
              <code className="bg-muted pr-8 pl-3 py-1.5 rounded-md text-xs font-mono border text-foreground/80 block overflow-x-auto whitespace-nowrap tracking-wide scrollbar-none">
                {key ? displayValue : '—'}
              </code>
              <Tooltip content={isCopied ? 'Tersalin!' : 'Salin'} position="top">
                <button
                  type="button"
                  onClick={() => copyKey(row.id, key)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors"
                >
                  {isCopied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                </button>
              </Tooltip>
            </div>
            {/* Tombol mata di luar kotak */}
            <Tooltip content={isVisible ? 'Sembunyikan' : 'Tampilkan'} position="top">
              <button
                type="button"
                onClick={() => toggleKeyVisibility(row.id)}
                className="shrink-0 p-1.5 rounded-md border bg-background text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </Tooltip>
          </div>
        );
      }
    },
    {
      header: "Model AI",
      className: "w-[150px]",
      render: (row) => (
        <Badge variant={row.model ? "outline" : "destructive"} className={row.model ? "font-mono text-xs bg-slate-50 text-slate-700" : "font-mono text-xs"}>
          {row.model || 'Belum Diatur'}
        </Badge>
      )
    },
    {
      header: "Status",
      className: "w-[150px]",
      render: (row) => (
        <div className="flex flex-wrap items-center gap-2">
          {row.is_active ? (
            <Badge variant="outline" className="border-green-300 bg-green-50 text-green-700 rounded-full px-2.5 py-0.5 font-medium shadow-none gap-1.5 whitespace-nowrap">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Aktif
            </Badge>
          ) : (
            <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700 rounded-full px-2.5 py-0.5 font-medium shadow-none gap-1.5 whitespace-nowrap">
              <XCircle className="w-3.5 h-3.5" />
              Non-Aktif
            </Badge>
          )}
        </div>
      )
    },
    {
      header: "Tgl. Dibuat",
      className: "hidden lg:table-cell w-[140px]",
      render: (row) => (
        <div className="flex flex-col text-xs text-muted-foreground">
          <span>{new Date(row.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>
      )
    },
    {
      header: "Aksi",
      className: "text-center w-[50px]",
      render: (row) => {
        if (row.id === 'env-default') {
          return (
            <div className="flex justify-center items-center">
              <Tooltip content="Tidak dapat diubah" position="top">
                <div className="flex h-8 w-8 items-center justify-center text-slate-400 cursor-not-allowed">
                  <Lock className="h-4 w-4" />
                </div>
              </Tooltip>
            </div>
          );
        }

        return (
          <div className="flex justify-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {!row.is_active && (
                  <DropdownMenuItem onClick={() => openActivateModal(row)}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Jadikan Aktif
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => openEditModal(row)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Data
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => openDeleteModal(row)} className="text-red-600 focus:text-red-600">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Hapus Data
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      }
    }
  ];

  return (
    <div className="flex flex-col gap-4 pb-10 animate-in fade-in duration-500">
      <div className="flex justify-between items-center print:hidden">
        <PageHeader title="Manajemen API Key" breadcrumb={["Beranda", "API Key"]} />
      </div>

      <Card className="border-none shadow-sm ring-1 ring-gray-200">
        <CardContent className="p-4 sm:p-6">
          <DataTable
            data={currentData}
            columns={columns}
            isLoading={isLoading}
            searchQuery={searchQuery}
            onSearchChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            searchPlaceholder="Cari Nama API Key..."
            filterContent={filterContent}
            isFilterActive={activeFilterCount > 0}
            activeFilterCount={activeFilterCount}
            onResetFilter={() => { setStatusFilter('ALL'); setModelFilter('ALL'); setSearchQuery(''); }}
            onAdd={openAddModal}
            addLabel="Tambah API Key"
            addIcon={<Plus className="h-4 w-4 mr-2" />}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            startIndex={startIndex}
            endIndex={endIndex} 
            totalItems={filteredData.length}
            customActions={
              !isUsingDefault ? (
                <Button
                  variant="outline"
                  onClick={() => setDefaultModalOpen(true)}
                  className="h-9"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Default
                </Button>
              ) : null
            }
          />
        </CardContent>
      </Card>

      {/* Modal Add/Edit */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit API Key' : 'Tambah API Key Baru'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Perbarui informasi identitas API Key.' : 'Masukkan nama dan nilai kunci API Gemini baru.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Identitas</Label>
              <Input 
                id="name"
                placeholder="Contoh: Akun Kampus Utama" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="key_data">API Key Gemini</Label>
              <Input 
                id="key_data"
                type="text" 
                placeholder="AIzaSy..."
                value={formData.key_data}
                onChange={(e) => setFormData({...formData, key_data: e.target.value})}
                required={!editingId}
                className="font-mono text-sm"
              />
              {editingId && <p className="text-xs text-muted-foreground mt-1">Biarkan kosong jika tidak ingin mengubah key.</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Model AI</Label>
              <div className="relative">
                <select
                  id="model"
                  value={formData.model}
                  onChange={(e) => setFormData({...formData, model: e.target.value})}
                  className="flex h-10 w-full appearance-none items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                >
                  <option value="" disabled>-- Pilih Model AI --</option>
                  <option value="gemini-3-flash-preview">gemini-3-flash-preview</option>
                  <option value="gemini-3.1-flash-lite-preview">gemini-3.1-flash-lite-preview</option>
                  <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview</option>
                  <option value="gemini-2.5-flash-lite">gemini-2.5-flash-lite</option>
                  <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                  <option value="gemini-2.5-pro">gemini-2.5-pro</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3">
                  <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Konfirmasi Aktivasi */}
      <ConfirmModal
        isOpen={activateModalOpen}
        onClose={setActivateModalOpen}
        onConfirm={handleSetActive}
        title="Aktifkan API Key?"
        description={(() => {
          const currentActive = dataList.find(k => k.is_active);
          if (currentActive) {
            return `Anda akan mengganti API Key aktif saat ini. Key "${currentActive.name}" akan dinonaktifkan, dan "${keyToActivate?.name}" akan digunakan sebagai key aktif untuk seluruh permintaan ke Gemini AI. Pastikan key "${keyToActivate?.name}" masih valid dan belum mencapai batas kuota sebelum melanjutkan.`;
          }
          return `Anda akan mengaktifkan "${keyToActivate?.name}" sebagai API Key utama. Setelah diaktifkan, seluruh permintaan ke Gemini AI akan menggunakan key ini. Pastikan key tersebut masih valid dan belum mencapai batas kuota sebelum melanjutkan.`;
        })()}
        confirmLabel="Ya, Aktifkan"
        cancelLabel="Batal"
      />

      {/* Modals Delete & Default */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={setDeleteModalOpen}
        onConfirm={confirmDelete}
        title="Hapus API Key?"
        description={`Apakah Anda yakin ingin menghapus API Key ${keyToDelete?.name}? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel={isSubmitting ? "Menghapus..." : "Hapus Permanen"}
        cancelLabel="Batal"
        variant="destructive"
      />

      <ConfirmModal
        isOpen={defaultModalOpen}
        onClose={setDefaultModalOpen}
        onConfirm={handleSetDefault}
        title="Kembali ke Default?"
        description="Sistem akan me-nonaktifkan kunci kustom dan beralih menggunakan pengaturan bawaan (Environment Variables). Lanjutkan?"
        confirmLabel={isLoading ? "Memproses..." : "Ya, Gunakan Default"}
        cancelLabel="Batal"
      />
    </div>
  );
}
