'use server'

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { PredikatYudisium, PredikatYudisiumFormValues } from "@/lib/types";

const supabase = createAdminClient();

export async function getPredikatYudisium(): Promise<PredikatYudisium[]> {
  const { data, error } = await supabase
    .from('predikat_yudisium')
    .select('*')
    .order('urutan', { ascending: true });

  if (error) {
    console.error("Error fetching predikat yudisium:", error);
    return [];
  }
  return data as PredikatYudisium[];
}

export async function getPredikatByIPK(ipk: number): Promise<PredikatYudisium | null> {
  const { data, error } = await supabase
    .from('predikat_yudisium')
    .select('*')
    .lte('ipk_min', ipk)
    .gte('ipk_max', ipk)
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return data as PredikatYudisium | null;
}

export async function createPredikatYudisium(values: PredikatYudisiumFormValues) {
  const { error } = await supabase.from('predikat_yudisium').insert([{
    label: values.label,
    ipk_min: Number(values.ipk_min),
    ipk_max: Number(values.ipk_max),
    urutan: Number(values.urutan),
  }]);

  if (error) throw new Error(error.message);
  revalidatePath('/predikat-yudisium');
}

export async function updatePredikatYudisium(id: string, values: PredikatYudisiumFormValues) {
  const { error } = await supabase.from('predikat_yudisium').update({
    label: values.label,
    ipk_min: Number(values.ipk_min),
    ipk_max: Number(values.ipk_max),
    urutan: Number(values.urutan),
  }).eq('id', id);

  if (error) throw new Error(error.message);
  revalidatePath('/predikat-yudisium');
}

export async function deletePredikatYudisium(id: string) {
  const { error } = await supabase.from('predikat_yudisium').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/predikat-yudisium');
}
