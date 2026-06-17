"use server";

import { createAdminClient } from "@/lib/supabase/admin";

const supabase = createAdminClient();

export async function checkSystemHealth() {
  const start = Date.now();

  try {
    // Parallel checks
    const [dbResult, storageResult] = await Promise.all([
      supabase.from("academic_years").select("count", { count: "exact", head: true }),
      supabase.storage.listBuckets()
    ]);

    const latency = Date.now() - start;
    const dbHealthy = !dbResult.error;
    const storageHealthy = !storageResult.error;

    let status = "healthy";
    let message = "Semua sistem berjalan dengan normal";

    if (!dbHealthy && !storageHealthy) {
      status = "error";
      message = "Gangguan total layanan sistem";
    } else if (!dbHealthy || !storageHealthy) {
      status = "warning";
      message = !dbHealthy ? "Kendala pada database terdeteksi" : "Kendala pada storage terdeteksi";
    }

    return {
      status,
      latency,
      message,
      timestamp: new Date().toISOString(),
      checks: {
        database: dbHealthy,
        storage: storageHealthy
      }
    };
  } catch (err: any) {
    return {
      status: "error",
      latency: Date.now() - start,
      message: err.message || "Unknown error",
      timestamp: new Date().toISOString(),
      checks: {
        database: false,
        storage: false
      }
    };
  }
}

export async function getSystemResources() {
  try {
    // 1. Get Database Size (Requires RPC: get_database_size)
    // Fallback if RPC not exists is handled by error check
    const dbQuery = await supabase.rpc('get_database_size');
    const dbSize = dbQuery.data || 0; // Bytes

    // 2. Get Storage Size (Requires RPC: get_storage_size)
    const storageQuery = await supabase.rpc('get_storage_size');
    const storageSize = storageQuery.data || 0; // Bytes

    return {
      database: {
        used: dbSize, // bytes
        limit: 524288000, // 500MB (Free Tier Default)
        percentage: (dbSize / 524288000) * 100
      },
      storage: {
        used: storageSize, // bytes
        limit: 1073741824, // 1GB (Free Tier Default)
        percentage: (storageSize / 1073741824) * 100
      }
    };
  } catch (error) {
    console.error("Failed to get resources:", error);
    // Return zeros on error to avoid breaking UI
    return {
      database: { used: 0, limit: 524288000, percentage: 0 },
      storage: { used: 0, limit: 1073741824, percentage: 0 }
    };
  }
}
