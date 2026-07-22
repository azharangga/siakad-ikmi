import React, { forwardRef } from "react";
import DocumentHeader from "@/components/features/document/DocumentHeader";
import { StudentData } from "@/lib/types";
import { formatDate, cn } from "@/lib/utils";

interface PrintableBiodataProps {
  student: StudentData | null;
  className?: string;
}

const PrintableBiodata = forwardRef<HTMLDivElement, PrintableBiodataProps>(
  ({ student, className }, ref) => {
    if (!student) return null;

    const currentDate = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    return (
      <div
        id="print-area"
        ref={ref}
        className={cn(
          "hidden print:block font-sans bg-white text-black p-8",
          className
        )}
        style={{ width: "210mm", minHeight: "297mm" }} 
      >
        {/* Container Utama Tanpa Border */}
        <div className="h-full relative flex flex-col justify-between">
          <div className="flex-1 p-2 flex flex-col">
            <DocumentHeader title="" />

            <div className="text-center mt-1 mb-6">
              <h1 className="font-bold text-lg uppercase tracking-wider font-caladea underline">
                BIODATA MAHASISWA
              </h1>
            </div>

            <div className="flex gap-8 items-start">
              {/* FOTO - 3x4 Proporsi */}
              <div
                className="mt-2 border border-black bg-gray-100 flex items-center justify-center overflow-hidden shrink-0"
                style={{ width: "3cm", height: "4cm" }}
              >
                {student.profile.avatar_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={student.profile.avatar_url}
                    alt={student.profile.nama}
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center font-caladea text-gray-800">
                    <span className="text-xs font-bold">PAS FOTO</span>
                    <span className="text-xs font-bold">3x4</span>
                  </div>
                )}
              </div>

              {/* TABEL DATA */}
              <div className="flex-1">
                <table className="w-full text-sm font-caladea">
                  <tbody className="align-top leading-[2]">
                    <tr>
                      <td className="w-[200px]">Nama Lengkap</td>
                      <td className="w-[20px] text-center">:</td>
                      <td className="font-bold">
                        {student.profile.nama.toUpperCase()}
                      </td>
                    </tr>
                    <tr>
                      <td>Nomor Induk Mahasiswa</td>
                      <td className="text-center">:</td>
                      <td className="font-mono tracking-wide">
                        {student.profile.nim}
                      </td>
                    </tr>
                    <tr>
                      <td>Program Studi</td>
                      <td className="text-center">:</td>
                      <td>{student.profile.study_program?.nama || "-"}</td>
                    </tr>
                    <tr>
                      <td>Jenjang Pendidikan</td>
                      <td className="text-center">:</td>
                      <td>{student.profile.study_program?.jenjang || "-"}</td>
                    </tr>
                    <tr>
                      <td>Semester Saat Ini</td>
                      <td className="text-center">:</td>
                      <td>{student.profile.status_mahasiswa === "LULUS" ? "LULUS" : student.profile.semester}</td>
                    </tr>
                    <tr>
                      <td>Angkatan</td>
                      <td className="text-center">:</td>
                      <td>{student.profile.angkatan}</td>
                    </tr>
                    <tr>
                      <td>Status Akademik</td>
                      <td className="text-center">:</td>
                      <td>
                        {student.profile.status_mahasiswa || "AKTIF"}
                      </td>
                    </tr>
                    <tr>
                      <td>NIK</td>
                      <td className="text-center">:</td>
                      <td>{student.profile.nik || "-"}</td>
                    </tr>
                    <tr>
                      <td>Tempat, Tanggal Lahir</td>
                      <td className="text-center">:</td>
                      <td>
                        {student.profile.tempat_lahir
                          ? `${student.profile.tempat_lahir}, `
                          : ""}
                        {formatDate(student.profile.tanggal_lahir)}
                      </td>
                    </tr>
                    <tr>
                      <td>Jenis Kelamin</td>
                      <td className="text-center">:</td>
                      <td>{student.profile.jenis_kelamin || "-"}</td>
                    </tr>
                    <tr>
                      <td>Agama</td>
                      <td className="text-center">:</td>
                      <td>{student.profile.agama || "-"}</td>
                    </tr>
                    <tr>
                      <td>Status Perkawinan</td>
                      <td className="text-center">:</td>
                      <td>{student.profile.status || "-"}</td>
                    </tr>
                    <tr>
                      <td>No. Telepon</td>
                      <td className="text-center">:</td>
                      <td>{student.profile.no_hp || "-"}</td>
                    </tr>
                    <tr>
                      <td>Email</td>
                      <td className="text-center">:</td>
                      <td>{student.profile.email || "-"}</td>
                    </tr>
                    <tr>
                      <td>Alamat Lengkap</td>
                      <td className="text-center">:</td>
                      <td className="leading-normal pt-2">
                        {student.profile.alamat || "-"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* TANDA TANGAN */}
            <div className="flex justify-end mt-12 mb-6 text-sm">
              <div className="flex flex-col items-center min-w-[200px] font-caladea">
                <p className="mb-1">Cirebon, {currentDate}</p>
                <p className="mb-24">Mahasiswa Yang Bersangkutan,</p>
                <p className="font-bold underline uppercase text-center">
                  {student.profile.nama}
                </p>
                <p className="text-xs mt-1 whitespace-nowrap text-center">NIM. {student.profile.nim}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

PrintableBiodata.displayName = "PrintableBiodata";

export default PrintableBiodata;
