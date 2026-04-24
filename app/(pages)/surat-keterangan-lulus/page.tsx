import React from "react";
import { getSession } from "@/app/actions/auth";
import { getStudentById, getOfficialForDocument, getStudents } from "@/app/actions/students";
import { createAdminClient } from "@/lib/supabase/admin";
import { Official } from "@/lib/types";
import SKLClient from "./SKLClient";

async function getKetuaSTMIK(): Promise<Official | null> {
  const supabaseAdmin = createAdminClient();

  // Cari Ketua STMIK (jabatan mengandung 'Ketua' dan tidak terikat prodi)
  const { data } = await supabaseAdmin
    .from("officials")
    .select("*, lecturer:lecturers(*), study_program:study_programs(*)")
    .ilike("jabatan", "%Ketua%")
    .is("study_program_id", null)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  return (data as unknown as Official) || null;
}

export default async function SKLPage() {
  const user = await getSession();

  let studentData = null;
  let officialKaprodi = null;
  let officialKetua = null;
  let allStudents: any[] = [];

  officialKetua = await getKetuaSTMIK();

  if (user?.role === "mahasiswa" && user.student_id) {
    try {
      studentData = await getStudentById(user.student_id);
      if (studentData?.profile?.study_program_id) {
        officialKaprodi = await getOfficialForDocument(studentData.profile.study_program_id);
      } else {
        officialKaprodi = await getOfficialForDocument();
      }
    } catch (e) {
      console.error("Failed to fetch student data for SKL", e);
    }
  } else if (user) {
    try {
      allStudents = await getStudents();
      // Default kaprodi dari mahasiswa pertama
      if (allStudents[0]?.profile?.study_program_id) {
        officialKaprodi = await getOfficialForDocument(allStudents[0].profile.study_program_id);
      }
    } catch (e) {
      console.error("Failed to fetch admin data for SKL", e);
    }
  }

  return (
    <SKLClient
      user={user}
      studentData={studentData}
      officialKaprodi={officialKaprodi}
      officialKetua={officialKetua}
      allStudents={allStudents}
    />
  );
}
