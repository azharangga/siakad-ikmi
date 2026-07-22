import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; 
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Lock } from "lucide-react"; 
import { StudentFormValues, StudyProgram } from "@/lib/types";

interface StudentFormProps {
  initialData?: StudentFormValues;
  studyPrograms: StudyProgram[]; 
  isEditing: boolean;
  onSubmit: (data: StudentFormValues) => void;
  onCancel: () => void;
}

// Default value
const defaultValues: StudentFormValues = {
  nim: "", 
  nama: "", 
  study_program_id: "", 
  angkatan: new Date().getFullYear(), // Default tahun sekarang
  alamat: "", 
  status_mahasiswa: "AKTIF",
  avatar_url: null,
  jenis_kelamin: "",
  tempat_lahir: "",
  tanggal_lahir: "",
  agama: "",
  nik: "",
  status: "",
  no_hp: "",
  email: "",
};

export function StudentForm({ initialData, studyPrograms, isEditing, onSubmit, onCancel }: StudentFormProps) {
  
  const parseInitialData = (data?: StudentFormValues): StudentFormValues => {
    if (!data) return defaultValues;
    return {
      nim: data.nim || "",
      nama: data.nama || "",
      study_program_id: data.study_program_id ? String(data.study_program_id) : "",
      angkatan: data.angkatan ? String(data.angkatan) : new Date().getFullYear().toString(),
      alamat: data.alamat || "",
      status_mahasiswa: data.status_mahasiswa || "AKTIF",
      avatar_url: data.avatar_url || null,
      jenis_kelamin: data.jenis_kelamin || "",
      tempat_lahir: data.tempat_lahir || "",
      tanggal_lahir: data.tanggal_lahir || "",
      agama: data.agama || "",
      nik: data.nik || "",
      status: data.status || "",
      no_hp: data.no_hp || "",
      email: data.email || "",
    };
  };

  const [formData, setFormData] = useState<StudentFormValues>(() => parseInitialData(initialData));
  const [errors, setErrors] = useState<Partial<Record<keyof StudentFormValues, boolean>>>({});

  useEffect(() => {
    setFormData(parseInitialData(initialData));
  }, [initialData]);

  // --- HANDLERS ---
  const handleInputChange = (field: keyof StudentFormValues, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleNumericInput = (field: keyof StudentFormValues, value: string, maxLength: number) => {
    if (/^\d*$/.test(value) && value.length <= maxLength) {
      handleInputChange(field, value);
    }
  };

  // --- VALIDASI ---
  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof StudentFormValues, boolean>> = {};
    const errorMessages: string[] = [];
    let isValid = true;

    // 1. Validasi NIM
    if (!formData.nim) {
      newErrors.nim = true;
      errorMessages.push("NIM wajib diisi.");
    } else if (!/^\d{8}$/.test(formData.nim)) {
      newErrors.nim = true;
      errorMessages.push("NIM harus 8 digit angka.");
    }

    // 2. Validasi Angkatan
    const angkatan = Number(formData.angkatan);
    if (!formData.angkatan) {
      newErrors.angkatan = true;
      errorMessages.push("Tahun Angkatan wajib diisi.");
    } else if (isNaN(angkatan) || angkatan < 2000 || angkatan > 2100) {
      newErrors.angkatan = true;
      errorMessages.push("Tahun Angkatan tidak valid.");
    }

    // 3. Validasi Nama
    if (!formData.nama.trim()) {
      newErrors.nama = true;
      errorMessages.push("Nama wajib diisi.");
    } else if (/\d/.test(formData.nama)) {
      newErrors.nama = true;
      errorMessages.push("Nama tidak boleh mengandung angka.");
    }

    // 4. Lainnya
    if (!formData.study_program_id) { 
      newErrors.study_program_id = true; 
      errorMessages.push("Prodi wajib dipilih."); 
    }

    // 5. Validasi Tambahan (Wajib Semua)
    if (!formData.nik || formData.nik.length < 16) {
        newErrors.nik = true;
        errorMessages.push("NIK wajib diisi (16 digit).");
    }
    if (!formData.jenis_kelamin) {
        newErrors.jenis_kelamin = true;
        errorMessages.push("Jenis Kelamin wajib dipilih.");
    }
    if (!formData.tempat_lahir) {
        newErrors.tempat_lahir = true;
        errorMessages.push("Tempat Lahir wajib diisi.");
    }
    if (!formData.tanggal_lahir) {
        newErrors.tanggal_lahir = true;
        errorMessages.push("Tanggal Lahir wajib diisi.");
    }
    if (!formData.agama) {
        newErrors.agama = true;
        errorMessages.push("Agama wajib dipilih.");
    }
    if (!formData.status) {
        newErrors.status = true;
        errorMessages.push("Status Perkawinan wajib diisi.");
    }
    if (!formData.no_hp) {
        newErrors.no_hp = true;
        errorMessages.push("No. Handphone wajib diisi.");
    }
    if (!formData.email) {
        newErrors.email = true;
        errorMessages.push("Email wajib diisi.");
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = true;
        errorMessages.push("Format Email tidak valid.");
    }
    if (!formData.alamat) {
        newErrors.alamat = true;
        errorMessages.push("Alamat Domisili wajib diisi.");
    }

    if (errorMessages.length > 0) {
      setErrors(newErrors);
      isValid = false;
      toast.error("Validasi Gagal", {
        description: <ul className="list-disc pl-4">{errorMessages.map((m, i) => <li key={i}>{m}</li>)}</ul>
      });
    }

    return isValid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) onSubmit(formData);
  };

  const errorClass = (field: keyof StudentFormValues) => 
    errors[field] ? "border-red-500 focus-visible:ring-red-500" : "";

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 py-4">
      
      {/* --- BAGIAN 1: DATA AKADEMIK --- */}
      <div className="border rounded-lg p-4 space-y-4">
        <h3 className="font-semibold text-gray-700 border-b pb-2 mb-2">Informasi Akademik</h3>
        
        <div className="grid grid-cols-12 gap-4">
            {/* NIM */}
            <div className={`grid gap-2 ${isEditing ? "col-span-12 md:col-span-6" : "col-span-12 md:col-span-8"}`}>
            <Label htmlFor="nim">
                <span>NIM <span className="text-red-500">*</span></span>
            </Label>
            <div className="relative">
                <Input
                id="nim"
                value={formData.nim}
                onChange={(e) => handleNumericInput("nim", e.target.value, 8)}
                placeholder="Contoh: 4121001"
                className={`${errorClass("nim")} ${isEditing ? "bg-muted text-muted-foreground opacity-100 pr-8" : ""}`}
                disabled={isEditing} 
                />
                {isEditing && (
                <Lock className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                )}
            </div>
            </div>

            {/* Status Mahasiswa */}
            <div className={`grid gap-2 col-span-12 ${isEditing ? "md:col-span-3" : "md:col-span-4"}`}>
                <Label htmlFor="status_mahasiswa">Status Mahasiswa <span className="text-red-500">*</span></Label>
                <Select 
                    value={formData.status_mahasiswa || "AKTIF"}
                    onValueChange={(val) => setFormData(prev => ({ ...prev, status_mahasiswa: val }))}
                >
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pilih Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="AKTIF">Aktif</SelectItem>
                        <SelectItem value="CUTI">Cuti Akademik</SelectItem>
                        <SelectItem value="NON_AKTIF">Non-Aktif</SelectItem>
                        <SelectItem value="LULUS">Lulus</SelectItem>
                        <SelectItem value="DROP_OUT">Drop Out (DO)</SelectItem>
                        <SelectItem value="MENGUNDURKAN_DIRI">Mengundurkan Diri</SelectItem>
                        <SelectItem value="MUTASI">Mutasi / Pindah Kampus</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Angkatan */}
            <div className={`grid gap-2 col-span-12 ${isEditing ? "md:col-span-3" : "md:col-span-4"}`}>
            <Label htmlFor="angkatan">
                <span>Angkatan <span className="text-red-500">*</span></span>
            </Label>
            <Input
                id="angkatan"
                value={formData.angkatan}
                onChange={(e) => handleNumericInput("angkatan", e.target.value, 4)}
                placeholder="2023"
                className={errorClass("angkatan")}
            />
            </div>
        </div>

        {/* Prodi */}
        <div className="grid gap-2"> 
            <Label htmlFor="study_program_id">
                <span>Program Studi <span className="text-red-500">*</span></span>
            </Label>
            <Select 
                value={formData.study_program_id} 
                onValueChange={(v) => handleInputChange("study_program_id", v)}
            >
                <SelectTrigger className={`w-full ${errorClass("study_program_id")}`}>
                <SelectValue placeholder="Pilih Program Studi" />
                </SelectTrigger>
                <SelectContent>
                {studyPrograms.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                    {p.nama} ({p.jenjang})
                    </SelectItem>
                ))}
                </SelectContent>
            </Select>
        </div>
      </div>


      {/* --- BAGIAN 2: DATA PRIBADI --- */}
      <div className="border rounded-lg p-4 space-y-4">
        <h3 className="font-semibold text-gray-700 border-b pb-2 mb-2">Informasi Pribadi</h3>
        
        {/* NIK */}
        <div className="grid gap-2">
            <Label htmlFor="nik">
                <span>Nomor Induk Kependudukan (NIK) <span className="text-red-500">*</span></span>
            </Label>
            <Input
                id="nik"
                value={formData.nik}
                onChange={(e) => handleNumericInput("nik", e.target.value, 16)}
                placeholder="16 digit NIK"
                className={errorClass("nik")}
            />
        </div>

        {/* Nama */}
        <div className="grid gap-2">
            <Label htmlFor="nama">
            <span>Nama Lengkap <span className="text-red-500">*</span></span>
            </Label>
            <Input
            id="nama"
            value={formData.nama}
            onChange={(e) => handleInputChange("nama", e.target.value)}
            placeholder="Sesuai KTP"
            className={errorClass("nama")}
            />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* JK */}
            <div className="grid gap-2">
                <Label htmlFor="jenis_kelamin">
                    <span>Jenis Kelamin <span className="text-red-500">*</span></span>
                </Label>
                <Select 
                    value={formData.jenis_kelamin} 
                    onValueChange={(v) => handleInputChange("jenis_kelamin", v)}
                >
                    <SelectTrigger className={`w-full ${errorClass("jenis_kelamin")}`}>
                    <SelectValue placeholder="Pilih Jenis Kelamin" />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                    <SelectItem value="Perempuan">Perempuan</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Agama */}
            <div className="grid gap-2">
                <Label htmlFor="agama">
                    <span>Agama <span className="text-red-500">*</span></span>
                </Label>
                <Select 
                    value={formData.agama} 
                    onValueChange={(v) => handleInputChange("agama", v)}
                >
                    <SelectTrigger className={`w-full ${errorClass("agama")}`}>
                        <SelectValue placeholder="Pilih Agama" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Islam">Islam</SelectItem>
                        <SelectItem value="Kristen">Kristen</SelectItem>
                        <SelectItem value="Katolik">Katolik</SelectItem>
                        <SelectItem value="Hindu">Hindu</SelectItem>
                        <SelectItem value="Buddha">Buddha</SelectItem>
                        <SelectItem value="Konghucu">Konghucu</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {/* Tempat Lahir */}
             <div className="grid gap-2">
                <Label htmlFor="tempat_lahir">
                    <span>Tempat Lahir <span className="text-red-500">*</span></span>
                </Label>
                <Input
                    id="tempat_lahir"
                    value={formData.tempat_lahir}
                    onChange={(e) => handleInputChange("tempat_lahir", e.target.value)}
                    placeholder="Kota Lahir"
                    className={errorClass("tempat_lahir")}
                />
            </div>
            {/* Tgl Lahir */}
            <div className="grid gap-2">
                <Label htmlFor="tanggal_lahir">
                    <span>Tanggal Lahir <span className="text-red-500">*</span></span>
                </Label>
                <Input
                    id="tanggal_lahir"
                    type="date"
                    value={formData.tanggal_lahir}
                    onChange={(e) => handleInputChange("tanggal_lahir", e.target.value)}
                    className={errorClass("tanggal_lahir")}
                />
            </div>
        </div>

        {/* Status Perkawinan */}
        <div className="grid gap-2">
            <Label htmlFor="status">
                <span>Status Perkawinan <span className="text-red-500">*</span></span>
            </Label>
            <Input
                id="status"
                value={formData.status}
                onChange={(e) => handleInputChange("status", e.target.value)}
                placeholder="Contoh: Belum Menikah"
                className={errorClass("status")}
            />
        </div>
      </div>

      {/* --- BAGIAN 3: KONTAK & ALAMAT --- */}
      <div className="border rounded-lg p-4 space-y-4">
        <h3 className="font-semibold text-gray-700 border-b pb-2 mb-2">Kontak & Alamat</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
                <Label htmlFor="no_hp">
                    <span>No. Handphone <span className="text-red-500">*</span></span>
                </Label>
                <Input
                    id="no_hp"
                    value={formData.no_hp}
                    onChange={(e) => handleNumericInput("no_hp", e.target.value, 15)}
                    placeholder="08xxxxxxxxxx"
                    className={errorClass("no_hp")}
                />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="email">
                    <span>Email <span className="text-red-500">*</span></span>
                </Label>
                <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="email@example.com"
                    className={errorClass("email")}
                />
            </div>
        </div>

        <div className="grid gap-2">
            <Label htmlFor="alamat">
                <span>Alamat Domisili <span className="text-red-500">*</span></span>
            </Label>
            <Textarea
            id="alamat"
            value={formData.alamat}
            onChange={(e) => handleInputChange("alamat", e.target.value)}
            placeholder="Alamat lengkap sesuai domisili saat ini"
            className={`min-h-[80px] ${errorClass("alamat")}`}
            />
        </div>
      </div>


      <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto">Batal</Button>
        <Button type="submit" className="w-full sm:w-auto">{isEditing ? "Simpan Perubahan" : "Tambah Mahasiswa"}</Button>
      </div>
    </form>
  );
}