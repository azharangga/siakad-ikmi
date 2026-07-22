import React from "react";
import Image from "next/image";
import Link from "next/link";
import { getStudentById } from "@/app/actions/students";
import { CheckCircle2, AlertCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VerifyPageProps {
  params: Promise<{ id: string }>;
}

export default async function VerifyPage({ params }: VerifyPageProps) {
  const { id } = await params;
  const student = await getStudentById(id);

  // -- 404 View: Formal Error --
  if (!student) {
    return (
      <div className="min-h-screen bg-gray-50 font-sans">
        {/* Navbar Error */}
        <header className="bg-white border-b border-gray-200 h-16 flex items-center px-4 md:px-8 shadow-sm">
             <div className="flex items-center gap-3">
                <div className="relative w-8 h-8">
                     <Image src="/img/logo-ikmi.png" alt="Logo" fill className="object-contain" />
                </div>
                <div className="border-l border-gray-300 pl-3 h-8 flex flex-col justify-center">
                    <h1 className="text-sm font-bold text-gray-800 leading-none">PANGKALAN DATA</h1>
                    <p className="text-[10px] text-gray-500 font-medium">STMIK IKMI CIREBON</p>
                </div>
            </div>
        </header>

        <div className="max-w-3xl mx-auto mt-10 p-4">
             <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
                <div>
                    <h3 className="font-bold text-sm">Data Tidak Ditemukan</h3>
                    <p className="mt-1 text-sm">
                        Nomor identitas atau link verifikasi tidak valid. Mohon pastikan Anda memindai QR Code dari dokumen resmi yang diterbitkan oleh STMIK IKMI Cirebon.
                    </p>
                </div>
             </div>
             <div className="mt-4 text-center">
                 <Link href="https://ikmi.ac.id" className="text-blue-600 hover:underline text-sm font-medium">
                    Kembali ke Halaman Utama
                 </Link>
             </div>
        </div>
      </div>
    );
  }

  // --- Success View: PDDikti Style ---
  return (
    <div className="min-h-screen bg-gray-50/50 font-sans text-gray-800 pb-20">
       
       {/* 1. Official Header */}


       <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
            
            {/* Main Content */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-wrap gap-2 relative z-10">
                    <div className="flex items-center gap-2">
                        <Search className="w-4 h-4 text-gray-400" />
                        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Detail Data Mahasiswa</h2>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 border border-green-200 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                        <span className="text-[10px] font-bold text-green-700 uppercase tracking-wider">Terverifikasi</span>
                    </div>
                </div>
                
                <div className="p-6 md:p-8 relative">
                    {/* Watermark Logo */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                        <div className="relative w-[300px] h-[300px] opacity-[0.06] grayscale">
                             <Image src="/img/logo-ikmi.png" alt="Watermark" fill className="object-contain" />
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-8 relative z-10">
                        
                        {/* 3. Photo Section */}
                        <div className="flex flex-col items-center md:items-start shrink-0">
                            <div className="w-[150px] h-[200px] border p-1 bg-white shadow-sm border-gray-200 rounded-sm">
                                <div className="w-full h-full relative bg-gray-100 overflow-hidden">
                                    {student.profile.avatar_url ? (
                                        <Image 
                                            src={student.profile.avatar_url}
                                            alt={student.profile.nama}
                                            fill
                                            className="object-cover"
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-xs text-gray-400 text-center p-2">
                                            Foto Tidak Tersedia
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>

                        {/* 4. Data Table Section */}
                        <div className="flex-1 w-full overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <tbody>
                                    <tr className="border-b border-gray-100">
                                        <td className="py-3 px-2 w-1/3 text-gray-500 font-medium">Nama Mahasiswa</td>
                                        <td className="py-3 px-2 font-semibold text-gray-900">{student.profile.nama}</td>
                                    </tr>
                                    <tr className="border-b border-gray-100">
                                        <td className="py-3 px-2 text-gray-500 font-medium">Nomor Induk Mahasiswa</td>
                                        <td className="py-3 px-2 text-gray-900 font-mono">{student.profile.nim}</td>
                                    </tr>
                                    <tr className="border-b border-gray-100">
                                        <td className="py-3 px-2 text-gray-500 font-medium">Perguruan Tinggi</td>
                                        <td className="py-3 px-2 text-gray-900">STMIK IKMI CIREBON</td>
                                    </tr>
                                    <tr className="border-b border-gray-100">
                                        <td className="py-3 px-2 text-gray-500 font-medium">Program Studi</td>
                                        <td className="py-3 px-2 text-gray-900">{student.profile.study_program?.nama || "-"}</td>
                                    </tr>
                                    <tr className="border-b border-gray-100">
                                        <td className="py-3 px-2 text-gray-500 font-medium">Jenjang Pendidikan</td>
                                        <td className="py-3 px-2 text-gray-900">{student.profile.study_program?.jenjang || "-"}</td>
                                    </tr>
                                    <tr className="border-b border-gray-100">
                                        <td className="py-3 px-2 text-gray-500 font-medium">Jenis Kelamin</td>
                                        <td className="py-3 px-2 text-gray-900">{student.profile.jenis_kelamin || "-"}</td>
                                    </tr>
                                    <tr className="border-b border-gray-100">
                                        <td className="py-3 px-2 text-gray-500 font-medium">Semester Awal</td>
                                        <td className="py-3 px-2 text-gray-900">
                                            {/* Estimasi simpel semester awal, bisa diganti data real jika ada */}
                                            {student.profile.angkatan ? `${student.profile.angkatan}/${student.profile.angkatan+1} Ganjil` : "-"}
                                        </td>
                                    </tr>
                                    <tr className="border-b border-gray-100">
                                        <td className="py-3 px-2 text-gray-500 font-medium">Status Mahasiswa Saat Ini</td>
                                        <td className="py-3 px-2 text-gray-900">
                                            {student.profile.status_mahasiswa || "AKTIF"}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                    </div>
                </div>
                

            </div>



       </main>
    </div>
  );
}
