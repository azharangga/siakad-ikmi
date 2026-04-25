import React from "react";
import { getSession } from "@/app/actions/auth";
import { getSidangSkripsi } from "@/app/actions/sidang-skripsi";
import { getStudents } from "@/app/actions/students";
import JadwalSidangClient from "./JadwalSidangClient";

export default async function JadwalSidangPage() {
  const user = await getSession();
  const [sidangList, allStudents] = await Promise.all([
    getSidangSkripsi(),
    getStudents(),
  ]);

  return (
    <JadwalSidangClient
      user={user}
      sidangList={sidangList}
      allStudents={allStudents}
    />
  );
}
