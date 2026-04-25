import React from "react";
import { getSession } from "@/app/actions/auth";
import { getStudentById, getOfficialForDocument, getStudents, getStudyPrograms } from "@/app/actions/students";
import { getSidangSkripsi, getSidangByStudentId } from "@/app/actions/sidang-skripsi";
import { getPredikatYudisium } from "@/app/actions/predikat-yudisium";
import { createAdminClient } from "@/lib/supabase/admin";
import { Official, SidangSkripsi, StudentData } from "@/lib/types";
import SKLClient from "./SKLClient";

async function getKetuaSTMIK(): Promise<Official | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("officials")
    .select("*, lecturer:lecturers(*), study_program:study_programs(*)")
    .ilike("jabatan", "%Ketua%")
    .is("study_program_id", null)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  return (data as unknown as Official) || null;
}

// Filter mahasiswa yang sudah ada nilai semester 8
function filterStudentsWithSmt8(students: StudentData[]): StudentData[] {
  return students.filter((s) =>
    s.transcript.some((t) => Number(t.smt) === 8 && t.hm !== "-")
  );
}

export default async function SKLPage() {
  const user = await getSession();

  const [officialKetua, predikatList] = await Promise.all([
    getKetuaSTMIK(),
    getPredikatYudisium(),
  ]);

  let studentData = null;
  let officialKaprodi = null;
  let sidang = null;
  let allStudents: StudentData[] = [];
  let studyPrograms: any[] = [];
  let sidangMap: Record<string, SidangSkripsi> = {};

  if (user?.role === "mahasiswa" && user.student_id) {
    const [s, sid] = await Promise.all([
      getStudentById(user.student_id),
      getSidangByStudentId(user.student_id),
    ]);
    studentData = s;
    sidang = sid;
    if (studentData?.profile?.study_program_id) {
      officialKaprodi = await getOfficialForDocument(studentData.profile.study_program_id);
    }
  } else if (user) {
    const [allS, progs, sidangList] = await Promise.all([
      getStudents(),
      getStudyPrograms(),
      getSidangSkripsi(),
    ]);

    // Hanya mahasiswa dengan nilai semester 8
    allStudents = filterStudentsWithSmt8(allS);
    studyPrograms = progs;

    // Build sidang map
    sidangList.forEach((s) => {
      sidangMap[s.student_id] = s;
    });

    // Default kaprodi dari mahasiswa pertama
    if (allStudents[0]?.profile?.study_program_id) {
      officialKaprodi = await getOfficialForDocument(allStudents[0].profile.study_program_id);
    }
  }

  return (
    <SKLClient
      user={user}
      studentData={studentData}
      officialKaprodi={officialKaprodi}
      officialKetua={officialKetua}
      allStudents={allStudents}
      studyPrograms={studyPrograms}
      sidang={sidang}
      sidangMap={sidangMap}
      predikatList={predikatList}
    />
  );
}
