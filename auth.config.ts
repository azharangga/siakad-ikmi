import type { NextAuthConfig } from "next-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";

// Waktu interval pengecekan ke database
const MAX_AGE = 15 * 60 * 1000;

// Fungsi Helper: Cek status user ke Database Supabase
async function refreshAccessToken(token: any) {
  try {
    // [UBAH] Inisialisasi Admin Client
    const supabase = createAdminClient();

    // Cek apakah user masih aktif di DB
    const { data: user, error } = await supabase
      .from("users")
      .select("id, role, username, name, student_id, is_active")
      .eq("id", token.id)
      .single();

    // Jika user diblokir/tidak aktif/dihapus
    if (error || !user || user.is_active === false) {
      throw new Error("InactiveAccount");
    }

    // Jika aman, perbarui data token & perpanjang waktu cek
    return {
      ...token,
      role: user.role,
      name: user.name,
      username: user.username,
      student_id: user.student_id,
      expiresAt: Date.now() + MAX_AGE,
      error: null,
    };
  } catch (error) {
    // Jika gagal, tandai token ini error
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

export const authConfig = {
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 1 * 60 * 60, // 1 Jam (3600 detik)
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnLogin = nextUrl.pathname.startsWith("/login");
      const currentPath = nextUrl.pathname;
      const userRole = auth?.user?.role;

      const isPublicAsset =
        nextUrl.pathname.startsWith("/img") ||
        nextUrl.pathname.startsWith("/public") ||
        nextUrl.pathname.endsWith(".png") ||
        nextUrl.pathname.endsWith(".jpg") ||
        nextUrl.pathname.endsWith(".svg") ||
        nextUrl.pathname.endsWith(".ico");

      if (isPublicAsset) return true;

      const supabase = createAdminClient();

      // Logika Login Page
      if (isOnLogin) {
        if (isLoggedIn) return Response.redirect(new URL("/", nextUrl));
        return true;
      }

      // Jika tidak login, jangan izinkan akses ke halaman lain
      if (!isLoggedIn) {
        return false;
      }

      // --- RBAC LOGIC MULAI ---
      try {
        const { data: menus, error } = await supabase
          .from("menus")
          .select("href, allowed_roles")
          .eq("is_active", true);

        if (!error && menus) {
          const matchedMenu = menus
            .filter(m => {
              if (m.href === "/") return currentPath === "/";
              return currentPath.startsWith(m.href);
            })
            .sort((a, b) => b.href.length - a.href.length)[0];

          if (matchedMenu) {
            const hasAccess =
              userRole === "superuser" ||
              matchedMenu.allowed_roles.includes(userRole);
            if (!hasAccess) {
              return Response.redirect(new URL("/", nextUrl));
            }
          }
        }
      } catch (err) {
        console.error("RBAC Check Error:", err);
      }
      // --- RBAC LOGIC SELESAI ---

      if (isLoggedIn) {
        return true;
      }

      return false;
    },
    async jwt({ token, user, trigger, session }) {
      // 1. Saat Login Pertama Kali
      if (user) {
        return {
          id: user.id,
          role: user.role,
          username: user.username,
          name: user.name,
          student_id: user.student_id,
          expiresAt: Date.now() + MAX_AGE,
          originalUserId: user.originalUserId || null,
          isSwitched: user.isSwitched || false,
        };
      }

      // 1.5. Handle Switch Account (via session update)
      if (trigger === "update" && session?.switchAccount) {
        return {
          ...token,
          id: session.switchAccount.id,
          role: session.switchAccount.role,
          username: session.switchAccount.username,
          name: session.switchAccount.name,
          student_id: session.switchAccount.student_id,
          originalUserId: session.switchAccount.originalUserId,
          isSwitched: session.switchAccount.isSwitched,
          expiresAt: Date.now() + MAX_AGE,
        };
      }

      // [BARU] Revert Logic: Jika token dalam mode switch TAPI cookie sudah tidak ada
      // Maka kembalikan token ke user asli (Superuser)
      const cookieStore = await cookies();
      const switchCookie = cookieStore.get("switch_account");

      if (token.isSwitched && !switchCookie && token.originalUserId) {
        // Reset token ke ID asli
        const revertedToken = {
          ...token,
          id: token.originalUserId,
          isSwitched: false,
          originalUserId: null,
          expiresAt: 0 // Paksa refresh
        };
        // Refresh data user asli dari DB
        return await refreshAccessToken(revertedToken);
      }

      // 2. Jika Token Belum Waktunya Cek (Masih dalam 15 menit), kembalikan langsung
      if (Date.now() < (token.expiresAt as number)) {
        return token;
      }

      // 3. Jika Sudah Waktunya, Cek ke Supabase (Refresh Logic)
      return await refreshAccessToken(token);
    },
    async session({ session, token }) {
      if (token && session.user) {
        // Cek apakah ada cookie switch account
        const cookieStore = await cookies();
        const switchCookie = cookieStore.get("switch_account");

        if (switchCookie) {
          try {
            const switchData = JSON.parse(switchCookie.value);

            // Override session dengan data dari cookie
            session.user.id = switchData.targetUserId;
            session.user.role = switchData.targetRole;
            session.user.username = switchData.targetUsername;
            session.user.name = switchData.targetName;
            session.user.student_id = switchData.targetStudentId || null;
            session.user.originalUserId = switchData.originalUserId;
            session.user.isSwitched = true;
          } catch (e) {
            // Jika parse error, gunakan data token biasa
            session.user.id = token.id as string;
            session.user.role = token.role as string;
            session.user.username = token.username as string;
            session.user.name = token.name as string;
            session.user.student_id = token.student_id as string | null;
            session.user.originalUserId = null;
            session.user.isSwitched = false;
          }
        } else {
          // Tidak ada cookie switch, gunakan data token biasa
          session.user.id = token.id as string;
          session.user.role = token.role as string;
          session.user.username = token.username as string;
          session.user.name = token.name as string;
          session.user.student_id = token.student_id as string | null;
          session.user.originalUserId = null;
          session.user.isSwitched = false;
        }

        if (token.error) {
          session.user.error = token.error as string;
        }
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;