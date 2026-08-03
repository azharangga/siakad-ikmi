"use client";

import React, { useState, useRef, useCallback } from "react";
import {
  User,
  Save,
  Camera,
  Loader2,
  UserCircle,
  AtSign,
  X,
  Maximize2,
  Trash2,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

// Component Confirm Modal
import { ConfirmModal } from "@/components/shared/ConfirmModal";

// Library
import Cropper from "react-easy-crop";
import getCroppedImg from "@/lib/cropImage";
import imageCompression from "browser-image-compression";

import { updateUserSettings } from "@/app/actions/auth";
import { uploadAvatar, deleteAvatarFile } from "@/app/actions/upload";
import { type UserProfile } from "@/lib/types";
import Image from "next/image";

interface ProfileFormProps {
  user: UserProfile | null;
  onUpdateSuccess: (newData: Partial<UserProfile>) => void;
}

export default function ProfileForm({
  user,
  onUpdateSuccess,
}: ProfileFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    nama: user?.name || "",
    username: user?.username || "",
    alamat: user?.alamat || "",
    avatar_url: user?.avatar_url || "",
  });

  const [previewImage, setPreviewImage] = useState<string | null>(
    user?.avatar_url || null
  );

  // --- STATE MODALS ---
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  if (!user) return null;

  // --- LOGIC HELPER ---
  const handleSystemError = (error: any, defaultMsg: string) => {
    console.error("System Error:", error);
    let userMessage = defaultMsg;
    const msg = error?.message?.toLowerCase() || "";
    if (msg.includes("limit") || msg.includes("size"))
      userMessage = "Ukuran berkas melebihi batas.";
    else if (msg.includes("network"))
      userMessage = "Gagal terhubung ke server.";
    return userMessage;
  };

  const processImage = async (file: File): Promise<File> => {
    const options = {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1024,
      useWebWorker: true,
      fileType: "image/jpeg",
      initialQuality: 0.9,
    };
    try {
      const processedFile = await imageCompression(file, options);
      return new File([processedFile], file.name, { type: processedFile.type });
    } catch {
      return file;
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.size > 20 * 1024 * 1024) {
        toast.error("Berkas terlalu besar");
        return;
      }
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setImageSrc(reader.result?.toString() || null);
        setIsCropModalOpen(true);
        setZoom(1);
        setCrop({ x: 0, y: 0 });
      });
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = useCallback((_: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleAutoUpload = async (file: File) => {
    setIsProcessing(true);
    try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("username", user.username);

        const newAvatarUrl = await uploadAvatar(fd, formData.avatar_url);

        const res = await updateUserSettings(user.username, {
            avatar_url: newAvatarUrl
        });
        if (!res.success) throw new Error(res.error || "Gagal mengunggah foto.");

        setPreviewImage(newAvatarUrl);
        setFormData(prev => ({ ...prev, avatar_url: newAvatarUrl }));
        onUpdateSuccess({ avatar_url: newAvatarUrl });

        toast.success("Foto Diperbarui", { 
            description: "Foto profil baru berhasil disimpan." 
        });

        setIsCropModalOpen(false);
        setImageSrc(null);
        if (fileInputRef.current) fileInputRef.current.value = "";

    } catch (e: any) {
        toast.error("Gagal Upload", { 
            description: handleSystemError(e, "Gagal mengunggah foto.") 
        });
    } finally {
        setIsProcessing(false);
    }
  };

  const handleCropSave = async () => {
    try {
      if (!imageSrc || !croppedAreaPixels) return;
      setIsProcessing(true);
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (!croppedBlob) throw new Error("Crop failed");
      const finalFile = await processImage(
        new File([croppedBlob], "avatar.jpg", { type: "image/jpeg" })
      );
      await handleAutoUpload(finalFile);
    } catch (e) {
      toast.error("Gagal memproses gambar");
      setIsProcessing(false);
    }
  };

  const executeDeletePhoto = async () => {
    setIsDeleting(true);
    try {
      if (formData.avatar_url) {
        await deleteAvatarFile(formData.avatar_url);
      }

      const res = await updateUserSettings(user.username, {
        nama: formData.nama,
        role: user.role,
        avatar_url: null,
      });
      if (!res.success) throw new Error(res.error || "Gagal menghapus foto.");

      setPreviewImage(null);
      setFormData({ ...formData, avatar_url: "" });
      onUpdateSuccess({ avatar_url: null });

      toast.success("Foto Dihapus", { description: "Foto profil berhasil dihapus." });
      
      setIsViewModalOpen(false);
      setIsDeleteConfirmOpen(false);
    } catch (error: any) {
      toast.error("Gagal Menghapus", {
        description: handleSystemError(error, "Terjadi kesalahan saat menghapus."),
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await updateUserSettings(user.username, {
        nama: formData.nama,
        username: formData.username,
        alamat: formData.alamat,
        role: user.role,
      });
      if (!res.success) throw new Error(res.error || "Gagal memperbarui profil.");

      toast.success("Profil Diperbarui", {
        description: "Perubahan pada profil Anda telah berhasil disimpan.",
      });
      
      onUpdateSuccess({
        name: formData.nama,
        username: formData.username,
        alamat: formData.alamat,
      });
    } catch (error: any) {
      toast.error("Gagal Menyimpan", {
        description: handleSystemError(error, "Terjadi kesalahan."),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const isDisabled = user.role !== "admin";

  return (
    <>
      {/* --- CONFIRMATION MODAL --- */}
      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={setIsDeleteConfirmOpen}
        onConfirm={executeDeletePhoto}
        title="Hapus Foto Profil"
        description="Apakah Anda yakin ingin menghapus foto profil? Tindakan ini tidak dapat dibatalkan dan foto akan hilang permanen."
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        variant="destructive"
      />

      {/* --- MODAL VIEW IMAGE --- */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent 
          className="p-0 bg-transparent border-none shadow-none max-w-fit flex items-center justify-center overflow-hidden"
          showCloseButton={false} 
        >
            <DialogTitle className="sr-only">Lihat Foto Profil</DialogTitle>

            <div className="relative group flex flex-col items-center justify-center">
                
                <div className="relative w-[85vw] h-[85vw] sm:w-[500px] sm:h-[500px] rounded-2xl overflow-hidden bg-neutral-950">
                    {previewImage ? (
                        <Image 
                            src={previewImage} 
                            alt="Full Avatar" 
                            fill 
                            className="object-cover transition-transform duration-500 ease-in-out hover:scale-105"
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-slate-100/10 backdrop-blur-sm">
                            <User size={100} className="text-slate-400 opacity-50" />
                            <p className="text-sm text-slate-400 mt-4 font-medium">Foto Tidak Tersedia</p>
                        </div>
                    )}

                    <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"></div>
                    <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/60 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"></div>

                    <Button
                        onClick={() => setIsViewModalOpen(false)}
                        className="absolute top-4 right-4 rounded-full w-9 h-9 p-0 bg-black/40 hover:bg-black/70 text-white backdrop-blur-md border-none transition-all z-50 shadow-none opacity-0 group-hover:opacity-100 translate-y-[-10px] group-hover:translate-y-0 duration-300"
                        title="Tutup"
                    >
                        <X size={18} />
                    </Button>

                    {previewImage && (
                      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-300 ease-out">
                        <div className="flex items-center gap-2 p-1.5 rounded-full bg-black/60 backdrop-blur-xl border border-white/10 shadow-none">
                            <Button
                                onClick={() => setIsDeleteConfirmOpen(true)}
                                disabled={isDeleting}
                                variant="ghost"
                                className="rounded-full h-10 w-10 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-colors"
                                title="Hapus Foto"
                            >
                                {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                            </Button>
                        </div>
                      </div>
                    )}
                </div>

            </div>
        </DialogContent>
      </Dialog>

      {/* --- MODAL CROP --- */}
      <Dialog
        open={isCropModalOpen}
        onOpenChange={(open) => !isProcessing && setIsCropModalOpen(open)}
      >
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden gap-0">
          <DialogHeader className="p-4 bg-slate-50 border-b">
            <DialogTitle>Sesuaikan Foto</DialogTitle>
            <DialogDescription>
              Geser dan zoom untuk hasil terbaik.
            </DialogDescription>
          </DialogHeader>
          <div className="relative w-full h-[300px] bg-black">
            {imageSrc && (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            )}
            {isProcessing && (
              <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center text-white">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="animate-spin" size={32} />
                  <span className="text-sm font-medium">Mengunggah...</span>
                </div>
              </div>
            )}
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-4">
              <span className="text-xs text-slate-500">Zoom</span>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-lg cursor-pointer accent-slate-900"
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsCropModalOpen(false)} disabled={isProcessing}>
                Batal
              </Button>
              <Button
                onClick={handleCropSave}
                disabled={isProcessing}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isProcessing ? "Menyimpan..." : "Gunakan Foto"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* --- MAIN CARD --- */}
      <Card className="h-full border-none shadow-xl bg-white rounded-xl ring-1 ring-slate-100 flex flex-col overflow-hidden">
        
        {/* HEADER / BANNER */}
        <div className="h-36 sm:h-44 bg-[#1a2d52] relative shrink-0 overflow-hidden shadow-inner">
          {/* Mega Mendung Batik Pattern Overlay - Matching KTM exactly */}
          <div 
            className="absolute inset-0 z-0 pointer-events-none opacity-30"
            style={{
               backgroundImage: "url('/img/mega_mendung.svg')",
               backgroundSize: "cover",
               backgroundPosition: "center",
               backgroundRepeat: "no-repeat",
            }}
          />
          
          {/* Gradient Overlay for Subtle Depth */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/10 pointer-events-none"></div>
        </div>

        <CardContent className="px-4 pb-6 sm:px-6 sm:pb-8 flex-1">
          <form onSubmit={handleProfileUpdate} className="flex flex-col h-full">
            
            {/* PROFILE SECTION */}
            <div className="relative mb-6">
              
              <div className="flex justify-between items-start">
                
                {/* Avatar Wrapper */}
                <div className="-mt-20 sm:-mt-24 relative z-10">
                   <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-[5px] border-white shadow-md overflow-hidden bg-slate-100 relative cursor-pointer group"
                        onClick={() => setIsViewModalOpen(true)}>
                      
                      {previewImage ? (
                        <Image src={previewImage} alt="Profile" fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-100">
                          <User size={64} />
                        </div>
                      )}
                      
                      {isProcessing && !isCropModalOpen && (
                         <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
                             <Loader2 className="text-white animate-spin" />
                         </div>
                      )}

                      <div className="absolute inset-0 bg-black/5 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center rounded-full">
                        <Maximize2 className="text-white drop-shadow-md" size={32} />
                      </div>
                   </div>

                   {/* TOMBOL UPLOAD */}
                   <button
                     type="button"
                     onClick={(e) => {
                       e.preventDefault();
                       e.stopPropagation(); 
                       if(!isProcessing) fileInputRef.current?.click();
                     }}
                     disabled={isProcessing}
                     className="absolute bottom-0 right-0 sm:bottom-2 sm:right-2 p-2 rounded-full bg-primary text-primary-foreground shadow-lg border-2 border-white transition-transform hover:scale-105 active:scale-95 z-20 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
                     title="Ganti Foto"
                   >
                     {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                   </button>

                   <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                </div>

                <div className="mt-4 hidden sm:block">
                  <Button
                    type="submit"
                    disabled={isSaving || isProcessing}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-6 font-semibold"
                  >
                    {isSaving ? (
                      <Loader2 size={16} className="animate-spin mr-2" />
                    ) : (
                      <Save size={16} className="mr-2" />
                    )}
                    Simpan Perubahan
                  </Button>
                </div>
                
                <div className="mt-4 sm:hidden">
                    <Button size="icon" type="submit" disabled={isSaving} className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground">
                        <Save size={18} />
                    </Button>
                </div>

              </div>

              {/* Nama & Info */}
              <div className="mt-4 text-left space-y-1">
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-2">
                  {formData.nama || "Pengguna"}
                </h2>
                <p className="text-slate-500 font-medium text-base">@{formData.username}</p>
              </div>

            </div>

            <Separator className="mb-8" />

            {/* FORM INPUTS */}
            <div className="space-y-6 max-w-3xl">
              <div className="grid md:grid-cols-2 gap-6">
                
                {/* --- BAGIAN USERNAME --- */}
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-slate-700 font-medium">Username</Label>
                  <div className="relative">
                    {/* Icon AtSign Kiri */}
                    <AtSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    
                    <Input
                        id="username"
                        value={formData.username}
                        disabled={isDisabled} 
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        className={`pl-9 h-10 bg-slate-50 border-slate-200 focus:bg-white transition-all ${isDisabled ? "pr-10 text-slate-500 opacity-70" : ""}`}
                    />
                    
                    {/* Icon Lock Kanan (Disabled) */}
                    {isDisabled && (
                        <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 opacity-50 pointer-events-none" />
                    )}
                  </div>
                  {isDisabled && (
                    <p className="text-[11px] text-slate-400">Username tidak dapat diubah.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nama" className="text-slate-700 font-medium">Nama Lengkap</Label>
                  <div className="relative">
                    <UserCircle size={16} className="absolute left-3 top-3 text-slate-400" />
                    <Input
                        id="nama"
                        value={formData.nama}
                        onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                        className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-all h-10"
                    />
                  </div>
                </div>
              </div>

              {user.role === "mahasiswa" && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                  <Label htmlFor="alamat" className="text-slate-700 font-medium">Alamat Domisili</Label>
                  <Textarea
                    id="alamat"
                    rows={3}
                    value={formData.alamat}
                    onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                    className="bg-slate-50 border-slate-200 focus:bg-white resize-none transition-all"
                    placeholder="Masukkan alamat lengkap..."
                  />
                </div>
              )}
            </div>

          </form>
        </CardContent>
      </Card>
    </>
  );
}