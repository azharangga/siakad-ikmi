"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { UserSession, updateUserSettings } from "@/app/actions/auth";
import { uploadAvatar } from "@/app/actions/upload";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, User, Upload, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import Cropper from "react-easy-crop";
import getCroppedImg from "@/lib/cropImage";
import imageCompression from "browser-image-compression";

interface PhotoUpdateDialogProps {
  user: UserSession | null;
}

export function PhotoUpdateDialog({ user }: PhotoUpdateDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  
  // Crop States
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Muncul jika role mahasiswa dan belum punya foto
    // Cek apakah user sudah pernah menutup dialog ini di sesi ini
    if (!user) return;
    
    // Cegah popup muncul di halaman admin/users saat proses switch account
    if (pathname.startsWith("/users")) return;

    const uniqueKey = user.id || user.username || "unknown_user";
    const dismissalKey = `photo_update_dismissed_v2_${uniqueKey}`;
    const isDismissed = sessionStorage.getItem(dismissalKey);
    
    if (user.role === "mahasiswa" && !user.avatar_url && !isDismissed) {
        setIsOpen(true);
    }
  }, [user, pathname]);

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
      
      // Validasi ukuran awal (max 20MB agar browser kuat baca)
      if (file.size > 20 * 1024 * 1024) {
        toast.error("Ukuran file terlalu besar");
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

  const onCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleCropSave = async () => {
    try {
      if (!imageSrc || !croppedAreaPixels) return;
      setIsUploading(true);
      
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (!croppedBlob) throw new Error("Crop failed");
      
      const file = new File([croppedBlob], "avatar.jpg", { type: "image/jpeg" });
      const finalFile = await processImage(file);
      
      const objectUrl = URL.createObjectURL(finalFile);
      setPreview(objectUrl);
      
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(finalFile);
      if (fileInputRef.current) {
          fileInputRef.current.files = dataTransfer.files;
      }

      setIsCropModalOpen(false);
      setImageSrc(null);
    } catch (e) {
      toast.error("Gagal memproses gambar");
    } finally {
        setIsUploading(false);
    }
  };

  const handleUpload = async () => {
    if (!fileInputRef.current?.files?.[0]) {
        fileInputRef.current?.click();
        return;
    }

    if (!user) return;

    setIsUploading(true);
    try {
        const file = fileInputRef.current.files[0];
        const fd = new FormData();
        fd.append("file", file);
        fd.append("username", user.username);

        // Upload ke storage
        const newAvatarUrl = await uploadAvatar(fd, user.avatar_url);

        // Update database user
        const res = await updateUserSettings(user.username, {
            avatar_url: newAvatarUrl
        });
        if (!res.success) throw new Error(res.error || "Gagal memperbarui foto profil.");

        toast.success("Foto Berhasil Diupload", {
            description: "Pas foto Anda telah diperbarui."
        });

        setIsOpen(false);
        router.refresh();
        
    } catch (error: any) {
        console.error(error);
        toast.error("Gagal Upload", {
            description: error.message || "Terjadi kesalahan saat mengunggah foto."
        });
    } finally {
        setIsUploading(false);
    }
  };

  const handleClose = () => {
    // Simpan status bahwa user menutup dialog ini di sesi ini
    if (user) {
        const uniqueKey = user.id || user.username || "unknown_user";
        sessionStorage.setItem(`photo_update_dismissed_v2_${uniqueKey}`, "true");
    }
    setIsOpen(false);
  };

  // Nama User untuk sapaan
  const fullName = user?.name || "Mahasiswa";

  return (
    <>
    {/* --- MODAL CROP --- */}
    <Dialog
        open={isCropModalOpen}
        onOpenChange={(open) => !isUploading && setIsCropModalOpen(open)}
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
             {isUploading && (
              <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center text-white">
                <Loader2 className="animate-spin" size={32} />
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
              <Button variant="ghost" onClick={() => setIsCropModalOpen(false)} disabled={isUploading}>
                Batal
              </Button>
              <Button
                onClick={handleCropSave}
                disabled={isUploading}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Gunakan Foto
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>


    <Dialog open={isOpen} onOpenChange={(open) => !isUploading && setIsOpen(open)}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-left">
          <DialogTitle>Halo, {fullName}</DialogTitle>
          <DialogDescription className="text-sm text-slate-500 leading-relaxed pt-2 text-left">
            Kami melihat bahwa Anda belum mengunggah pas foto. Mohon segera lengkapi pas foto Anda untuk kelancaran administrasi akademik, pembuatan <strong>Kartu Tanda Mahasiswa (KTM)</strong>, serta kelengkapan data diri pada sistem akademik kampus.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 flex flex-col items-center justify-center gap-6 border-y border-slate-100 my-2">
            
            {/* Upload Area */}
            <div className="flex flex-row items-center gap-4 sm:gap-8 w-full justify-center px-4">
                {/* Preview Circle */}
                <div 
                    className="relative group flex-shrink-0"
                    onClick={() => !isUploading && fileInputRef.current?.click()}
                >
                    <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-2 border-dashed border-slate-300 overflow-hidden bg-slate-50 flex items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors relative">
                        {preview ? (
                            <Image 
                                src={preview} 
                                alt="Preview" 
                                fill 
                                className="object-cover" 
                            />
                        ) : (
                            <div className="flex flex-col items-center text-slate-400 gap-2">
                                <ImagePlus className="w-8 h-8 sm:w-10 sm:h-10" />
                                <span className="text-[10px] sm:text-xs font-medium text-center px-1">Unggah Foto</span>
                            </div>
                        )}
                        
                        {/* Hover Overlay if has preview */}
                        {preview && (
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Camera className="w-8 h-8 text-white" />
                            </div>
                        )}

                        {isUploading && (
                            <div className="absolute inset-0 bg-black/50 z-20 flex items-center justify-center">
                                <Loader2 className="w-8 h-8 text-white animate-spin" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Instructions / Action */}
                <div className="flex flex-col gap-2 sm:gap-3 text-left max-w-xs flex-1">
                    <h4 className="font-semibold text-slate-700 text-sm sm:text-base">Unggah Pas Foto</h4>
                    <p className="text-xs sm:text-sm text-slate-500 leading-snug">
                       Silakan klik area foto atau tombol dibawah untuk mengunggah. Sistem akan otomatis mengompresi foto Anda agar optimal.
                    </p>
                    <div className="flex justify-start">
                        <Button 
                            type="button" 
                            variant="secondary" 
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                        >
                            <Upload className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                            Pilih File
                        </Button>
                    </div>
                     <p className="text-[10px] sm:text-xs text-slate-400">
                        Format: JPG, PNG. Maks: 20MB.
                    </p>
                </div>
            </div>

             <div className="bg-amber-50 rounded-md p-3 border border-amber-100 w-full flex gap-3 text-amber-800 text-sm">
                 <div className="mt-0.5">⚠️</div>
                 <p>
                    <strong>Catatan:</strong> Foto ini akan digunakan untuk dokumen resmi. Wajib menggunakan latar belakang berwarna <strong>Biru Langit (Hex #99FFFF)</strong>, serta mengenakan jas almamater, dasi hitam, dan kerudung putih (bagi yang mengenakan).
                </p>
             </div>
            
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/png, image/jpeg, image/jpg, image/webp"
                onChange={handleFileChange}
            />
        </div>

        <DialogFooter className="gap-2 sm:gap-4">
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            Nanti Saja
          </Button>
          <Button onClick={handleUpload} disabled={isUploading || !preview} className="bg-blue-600 hover:bg-blue-700 text-white">
            {isUploading ? (
                <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Mengunggah...
                </>
            ) : (
                "Simpan Foto"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
