"use client";

import React, { useState } from "react";
import { Lock, KeyRound, ShieldAlert, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { updateUserSettings, logout } from "@/app/actions/auth";
import { type UserProfile } from "@/lib/types"; 

interface PasswordFormProps {
  user: UserProfile | null;
  onUpdateSuccess: (newPassword: string) => void;
}

export default function PasswordForm({ user, onUpdateSuccess }: PasswordFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [passwordData, setPasswordData] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  if (!user) return null;

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Validasi Gagal", { description: "Konfirmasi kata sandi tidak cocok." }); return;
    }
    if (passwordData.newPassword.length < 6) {
        toast.error("Password Lemah", { description: "Password minimal 6 karakter." }); return;
    }
    setIsSaving(true);
    try {
      const res = await updateUserSettings(user.username, { password: passwordData.newPassword, role: user.role }, passwordData.currentPassword);
      if (!res.success) {
        toast.error("Gagal Mengubah", { description: res.error || "Pastikan password lama benar." });
        return;
      }

      toast.success("Berhasil", { description: "Password diubah. Silakan login kembali." });
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      onUpdateSuccess(passwordData.newPassword);
      setTimeout(async () => await logout(), 2000);
    } catch (error: any) {
      const errorMsg = error?.message || "";
      const isDigestError = errorMsg.includes("Server Components render") || errorMsg.includes("digest");
      toast.error("Gagal Mengubah", { 
        description: isDigestError ? "Terjadi kesalahan pada server saat memperbarui password. Silakan coba lagi." : (errorMsg || "Pastikan password lama benar.") 
      });
    } finally { setIsSaving(false); }
  };

  return (
    <Card className="h-full flex flex-col overflow-hidden border-none shadow-xl bg-white rounded-xl ring-1 ring-slate-100">
      
      {/* Header Bersih */}
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between mt-5">
            <CardTitle className="text-xl font-bold text-slate-900 tracking-tight">Keamanan</CardTitle>
        </div>
        <CardDescription className="text-slate-500 text-sm -mt-2">
            Perbarui kata sandi untuk melindungi akun Anda.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handlePasswordUpdate} className="flex-1 flex flex-col">
        {/* Konten Fleksibel */}
        <CardContent className="space-y-6 flex-1 flex flex-col">
          
          {/* Alert Box yang Lebih Modern */}
          <div className="p-4 bg-amber-50/50 border border-amber-100/80 rounded-lg flex gap-3.5 items-start">
             <div className="p-1.5 bg-amber-100 rounded-full shrink-0 mt-0.5">
                <ShieldAlert className="text-amber-600" size={14} />
             </div>
             <div className="space-y-1">
                <p className="text-xs font-semibold text-amber-900 uppercase tracking-wide">Penting</p>
                <p className="text-[12px] text-amber-800/90 leading-relaxed">
                   Sesi Anda akan berakhir otomatis setelah password berhasil diperbarui. Pastikan Anda mengingat password baru Anda.
                </p>
             </div>
          </div>

          <div className="space-y-5">
             <div className="space-y-2">
                <Label htmlFor="current_password" className="text-sm font-medium text-slate-700">Password Lama</Label>
                <div className="relative group">
                    <KeyRound size={16} className="absolute left-3.5 top-3 text-slate-400 group-focus-within:text-slate-600 transition-colors pointer-events-none" />
                    <Input 
                        id="current_password" type={showCurrentPassword ? "text" : "password"} required 
                        className="pl-10 pr-10 h-10 bg-slate-50 border-slate-200 focus:bg-white focus:border-slate-400 focus:ring-slate-100 transition-all rounded-lg"
                        placeholder="••••••••"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    />
                    <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                        title={showCurrentPassword ? "Sembunyikan password" : "Tampilkan password"}
                    >
                        {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                </div>
             </div>

             <div className="space-y-2">
                <Label htmlFor="new_password" className="text-sm font-medium text-slate-700">Password Baru</Label>
                <div className="relative group">
                    <Lock size={16} className="absolute left-3.5 top-3 text-slate-400 group-focus-within:text-slate-600 transition-colors pointer-events-none" />
                    <Input 
                        id="new_password" type={showNewPassword ? "text" : "password"} required 
                        className="pl-10 pr-10 h-10 bg-slate-50 border-slate-200 focus:bg-white focus:border-slate-400 focus:ring-slate-100 transition-all rounded-lg"
                        placeholder="Minimal 6 karakter"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    />
                    <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                        title={showNewPassword ? "Sembunyikan password" : "Tampilkan password"}
                    >
                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                </div>
             </div>

             <div className="space-y-2">
                <Label htmlFor="confirm_password" className="text-sm font-medium text-slate-700">Konfirmasi Password</Label>
                <div className="relative group">
                    <CheckCircle2 size={16} className="absolute left-3.5 top-3 text-slate-400 group-focus-within:text-slate-600 transition-colors pointer-events-none" />
                    <Input 
                        id="confirm_password" type={showConfirmPassword ? "text" : "password"} required 
                        className="pl-10 pr-10 h-10 bg-slate-50 border-slate-200 focus:bg-white focus:border-slate-400 focus:ring-slate-100 transition-all rounded-lg"
                        placeholder="Ulangi password baru"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    />
                    <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                        title={showConfirmPassword ? "Sembunyikan password" : "Tampilkan password"}
                    >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                </div>
             </div>
          </div>
        </CardContent>

        <CardFooter className="bg-slate-50/50 border-t border-slate-100 p-6 mt-auto">
          {/* UBAH DISINI: bg-slate-900 -> bg-primary */}
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium h-11 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300" disabled={isSaving}>
             {isSaving ? "Menyimpan Perubahan..." : "Update Password"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}