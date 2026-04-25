import React from "react";
import { getPredikatYudisium } from "@/app/actions/predikat-yudisium";
import PredikatYudisiumClient from "./PredikatYudisiumClient";

export default async function PredikatYudisiumPage() {
  const data = await getPredikatYudisium();
  return <PredikatYudisiumClient initialData={data} />;
}
