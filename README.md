<p align="center">
  <img src="public/img/logo-ikmi.png" alt="SIAKAD IKMI Logo" width="80" height="80" />
</p>
<h1 align="center">SIAKAD IKMI</h1>
<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-20232a?style=flat-square&logo=react&logoColor=61dafb" alt="React" />
  <img src="https://img.shields.io/badge/Supabase-Database-green?style=flat-square&logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/NextAuth.js-v5-blueviolet?style=flat-square&logo=auth0" alt="NextAuth" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=flat-square&logo=tailwind-css" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/shadcn/ui-Components-black?style=flat-square&logo=shadcnui" alt="shadcn/ui" />
</p>

---

## Deskripsi Proyek

Sistem Informasi Akademik (SIAKAD) STMIK IKMI Cirebon adalah platform manajemen operasional akademik perguruan tinggi STMIK IKMI. Sistem ini mengintegrasikan administrasi akademik, kartu rencana studi, kartu hasil studi, transkrip nilai, pencetakan berkas digital mahasiswa, dan asisten cerdas berbasis kecerdasan buatan. Aplikasi dibangun dengan kerangka kerja Next.js 16 (App Router) dengan TypeScript, menggunakan Supabase PostgreSQL sebagai backend penyimpanan data, serta didukung oleh NextAuth v5 untuk manajemen sesi otorisasi pengguna.

---

## Fitur Utama

* **Otentikasi dan Role-Based Access Control (RBAC)**: Sistem otorisasi pengguna yang membagi hak akses ke dalam peran superuser, admin, dosen, dan mahasiswa untuk memproteksi halaman aplikasi serta endpoint API.
* **Pengisian Kartu Rencana Studi (KRS)**: Fitur bagi mahasiswa untuk memilih mata kuliah pada tahun ajaran aktif, dengan pemisahan otomatis untuk alur kelas reguler (sesuai program studi) dan kelas MBKM.
* **Validasi dan Input KRS Kolektif**: Fitur bagi admin untuk menyetujui, menolak, atau melakukan pengisian data rencana studi mahasiswa secara massal.
* **Kalkulasi Nilai dan IPK Otomatis**: Sistem perhitungan indeks prestasi (IPS/IPK) terautomasi yang menampilkan kartu hasil studi (KHS) dan transkrip nilai kumulatif dengan mengabaikan mata kuliah nilai E dan mengambil nilai terbaik untuk mata kuliah yang diulang.
* **Cetak Dokumen Digital Mandiri**: Fitur pencetakan mandiri bagi mahasiswa untuk mengunduh berkas resmi berupa Kartu Tanda Mahasiswa (KTM) yang dilengkapi QR-Code verifikasi, biodata diri, Surat Keterangan Mahasiswa Aktif, serta Surat Keterangan Lulus (SKL).
* **Impor Data Mahasiswa & Nilai**: Fitur pengunggahan dan pemrosesan data mahasiswa serta nilai kuliah secara masif menggunakan berkas spreadsheet/Excel.
* **Manajemen Pejabat Struktural & Tanda Tangan**: Pengelolaan pejabat berwenang kampus serta pengunggahan berkas tanda tangan basah dan tanda tangan barcode secara aman di storage private untuk keperluan verifikasi surat kelulusan.
* **Asisten Chatbot AI Terintegrasi**: Robot asisten interaktif bertenaga Gemini AI untuk membantu pencarian informasi akademik seperti profil mahasiswa, transkrip nilai, daftar dosen, dan kesehatan hardware database.
* **Switch Account (Impersonasi Pengguna)**: Fitur bagi superuser untuk berpindah sesi masuk ke akun pengguna lain secara instan guna mempermudah simulasi tampilan dan penyelesaian kendala teknis pengguna tanpa kata sandi.
* **Mode Pemeliharaan Global (Maintenance Mode)**: Konfigurasi untuk menonaktifkan akses aplikasi sementara waktu untuk perbaikan sistem, dengan akses bypass khusus bagi administrator.
* **Proteksi Captcha Cloudflare Turnstile**: Sistem keamanan tambahan pada halaman login untuk menyaring akses berbahaya dari bot otomatis.
* **Dasbor Status Kesehatan & Utilisasi Hardware**: Panel visual untuk memantau performa latensi database, status bucket storage, sisa kuota penyimpanan data, serta pemakaian RAM server.

---

## Autentikasi

Sistem ini menggunakan mekanisme autentikasi terpusat berbasis NextAuth v5 dengan implementasi Role-Based Access Control (RBAC). Setiap pengguna yang masuk akan divalidasi identitasnya secara real-time dan dikelompokkan ke dalam tingkatan hak akses tertentu untuk menjamin keamanan operasional data akademik kampus.

| Peran (Role) | Deskripsi & Fungsi | Cakupan Hak Akses (Permissions) |
| :--- | :--- | :--- |
| **Superuser** | Tingkat akses tertinggi sistem yang memegang kontrol penuh atas pengembangan dan pengujian sistem. | Seluruh hak akses administrator, kustomisasi menu navigasi sidebar secara dinamis, dan akses ke fitur impersonasi (*Switch Account*) ke pengguna mana pun tanpa menggunakan sandi mereka. |
| **Admin** | Staf operasional akademik yang bertugas mengelola data administrasi harian perguruan tinggi. | Mengelola data master (prodi, tahun akademik, matakuliah, predikat yudisium, jadwal sidang), manajemen akun mahasiswa & dosen, melakukan impor bulk data mahasiswa/nilai via Excel, memvalidasi KRS, dan mengonfigurasi setelan keamanan global (maintenance mode, Turnstile). |
| **Dosen** | Tenaga pendidik yang bertanggung jawab atas pengajaran dan evaluasi nilai mahasiswa. | Melihat jadwal mengajar pribadi, memantau rekam biodata mahasiswa di kelasnya, serta menginput dan mengunggah nilai akhir mata kuliah mahasiswa baik secara individual maupun kolektif. |
| **Mahasiswa** | Peserta didik terdaftar yang menjalani proses studi akademik aktif. | Mengajukan rencana pengambilan mata kuliah (KRS) pada semester berjalan, melihat kartu hasil studi (KHS) dan transkrip nilai kumulatif, serta mencetak dokumen resmi mandiri (KTM digital, biodata, Surat Keterangan Aktif, Surat Keterangan Lulus). |

---

## Library yang Digunakan

Proyek ini menggunakan berbagai library open-source pendukung untuk mengimplementasikan fungsionalitas khusus pada aplikasi:

| Library | Deskripsi & Fungsi | Modul Penggunaan |
| :--- | :--- | :--- |
| `ai` & `@ai-sdk/google` | SDK integrasi untuk memproses model LLM Google Gemini. | Asisten AI Chatbot |
| `zod` | Skema validasi tipe data input form di sisi klien dan pelindung API. | Validasi Input Form |
| `react-hook-form` | Manajemen state input form dan penanganan error validasi. | Validasi Input Form |
| `@dnd-kit/core` & `sortable` | Fitur interaktif drag-and-drop untuk pengurutan elemen menu navigasi. | Manajemen Navigasi Sidebar |
| `@marsidev/react-turnstile` | Komponen proteksi Cloudflare Turnstile Captcha. | Keamanan Autentikasi Halaman Login |
| `bcryptjs` | Kriptografi satu arah untuk enkripsi password login. | Keamanan Autentikasi Akun |
| `browser-image-compression` | Pengompres ukuran file gambar secara lokal sebelum diunggah. | Unggah Foto Profil / Avatar |
| `react-easy-crop` | Fitur interaktif cropping/pemotongan area gambar foto profil. | Unggah Foto Profil / Avatar |
| `jspdf` & `html-to-image` | Konversi halaman berkas HTML dan konversi data ke format dokumen PDF. | Cetak KTM, Biodata, & Surat Keterangan |
| `xlsx` | Membaca dan mem-parsing berkas spreadsheet Excel menjadi array JSON. | Impor Massal Mahasiswa & Nilai Kuliah |
| `react-qr-code` | Pembuat QR-Code dinamis pembawa string verifikasi. | Cetak Kartu Tanda Mahasiswa |
| `framer-motion` | Engine pembuat animasi mikro transisi komponen antarmuka. | Animasi Transisi Halaman |

---

## Kebutuhan Sistem (System Requirements)

* Node.js v18.x atau versi di atasnya
* NPM, Yarn, PNPM, atau Bun sebagai package manager
* Database PostgreSQL Supabase dengan Storage diaktifkan
* Cloudflare Turnstile API Keys (untuk keamanan Captcha)
* Google Generative AI API Key (untuk asisten Chatbot AI)

---

## Struktur Project

Berikut adalah representasi seluruh berkas dan folder yang terdapat di dalam proyek:

```
siakad-ikmi/
├── app/                                    # Direktori utama Next.js App Router
│   ├── (pages)/                            # Halaman antarmuka pengguna
│   │   ├── api-key/                        # Halaman konfigurasi API Key Chatbot
│   │   ├── biodata/                        # Halaman cetak biodata mahasiswa
│   │   ├── dosen/                          # Halaman manajemen data dosen
│   │   ├── jadwal-sidang/                  # Halaman penjadwalan sidang skripsi
│   │   ├── khs/                            # Halaman Kartu Hasil Studi (KHS)
│   │   ├── krs/                            # Halaman pengisian rencana studi (KRS)
│   │   ├── ktm/                            # Halaman cetak Kartu Tanda Mahasiswa
│   │   ├── mahasiswa/                      # Halaman manajemen data mahasiswa
│   │   ├── matakuliah/                     # Halaman master kurikulum mata kuliah
│   │   ├── mbkm/                           # Halaman keikutsertaan program MBKM
│   │   ├── menus/                          # Halaman penataan sidebar menu dinamis
│   │   ├── nilai/                          # Halaman input dan impor nilai mahasiswa
│   │   ├── pejabat/                        # Halaman manajemen pejabat struktural
│   │   ├── pengaturan-akun/                # Halaman sunting profil akun pengguna
│   │   ├── pengaturan-sistem/              # Halaman konfigurasi sistem global
│   │   ├── predikat-yudisium/              # Halaman master kategori kelulusan IPK
│   │   ├── prodi/                          # Halaman master program studi kampus
│   │   ├── status/                         # Halaman dashboard utilisasi disk & kesehatan 
│   │   ├── surat-keterangan/               # Halaman cetak surat mahasiswa aktif
│   │   ├── surat-keterangan-lulus/         # Halaman cetak Surat Keterangan Lulus
│   │   ├── tahun-akademik/                 # Halaman master kalender akademik aktif
│   │   ├── transkrip/                      # Halaman cetak transkrip nilai kumulatif
│   │   ├── users/                          # Halaman manajemen akun pengguna
│   │   ├── ClientLayout.tsx                # Layout shell navigasi sisi klien
│   │   ├── DashboardClient.tsx             # Komponen dasbor statistik utama
│   │   ├── layout.tsx                      # Root layout pembungkus sesi autentikasi
│   │   └── page.tsx                        # Halaman masuk redirect berdasarkan peran
│   ├── actions/                            # Logika transaksi database (Server Actions)
│   │   ├── academic-years.ts               # Server Action pengelolaan tahun akademik
│   │   ├── add-superuser-to-menus.ts       # Server Action pendaftaran hak menu superuser
│   │   ├── auth.ts                         # Server Action proses login & logout NextAuth
│   │   ├── courses.ts                      # Server Action pengelolaan mata kuliah
│   │   ├── getSignature.ts                 # Server Action pengunduhan berkas tanda tangan
│   │   ├── grades.ts                       # Server Action pengelolaan nilai mahasiswa
│   │   ├── krs-bulk.ts                     # Server Action input KRS kolektif
│   │   ├── krs.ts                          # Server Action transaksi rencana studi
│   │   ├── lecturers.ts                    # Server Action pengelolaan data dosen
│   │   ├── mbkm.ts                         # Server Action pengelolaan program MBKM
│   │   ├── menus.ts                        # Server Action pemeliharaan menu dinamis
│   │   ├── officials.ts                    # Server Action kelola tanda tangan pejabat
│   │   ├── predikat-yudisium.ts            # Server Action kelola parameter kelulusan
│   │   ├── prodi.ts                        # Server Action kelola program studi
│   │   ├── sidang-skripsi.ts               # Server Action kelola jadwal sidang
│   │   ├── students.ts                     # Server Action kelola data mahasiswa & impor bulk
│   │   ├── switch-account.ts               # Server Action impersonasi peran akun
│   │   ├── system.ts                       # Server Action status utilitas hardware database
│   │   ├── upload.ts                       # Server Action pengunggahan foto profil user
│   │   └── users.ts                        # Server Action manajemen akun user
│   ├── api/                                # API endpoints sistem
│   │   ├── auth/                           # Handler API autentikasi NextAuth
│   │   │   └── [...nextauth]/              # Konfigurasi dynamic route handler NextAuth
│   │   ├── chat/                           # API asisten virtual chatbot AI
│   │   │   └── route.ts                    # Endpoint pemrosesan prompt chatbot AI
│   │   ├── settings/                       # API manajemen pengaturan AI
│   │   │   └── api-keys/                   # Endpoint CRUD kunci API terenkripsi
│   │   └── system-settings/                # API manajemen sistem global
│   │       └── route.ts                    # Endpoint mode maintenance & captcha
│   ├── context/                            # React Context Providers
│   │   └── QueryProvider.tsx               # Penyedia caching state aplikasi
│   ├── login/                              # Rute halaman login Turnstile
│   ├── maintenance/                        # Rute halaman pemblokiran maintenance
│   └── verify/                             # Rute halaman verifikasi QR-Code dokumen
├── components/                             # Komponen antarmuka pengguna (UI)
│   ├── chat/                               # Widget interaksi chatbot AI
│   ├── features/                           # Komponen visual fitur akademik terkelompok
│   ├── layout/                             # Struktur template navbar, sidebar, footer
│   └── ui/                                 # Komponen desain dasar (Shadcn UI)
├── hooks/                                  # Custom React Hooks
│   ├── use-pdf-print.ts                    # Hook untuk cetak dokumen ke format PDF
│   ├── use-toast-message.ts                # Hook untuk memicu pesan notifikasi
│   └── useSignature.ts                     # Hook pemuatan tanda tangan pejabat
├── lib/                                    # Library utilitas dan definisi sistem
│   ├── supabase/                           # Inisialisasi Supabase Clients
│   │   ├── admin.ts                        # Konfigurasi admin client (service role bypass)
│   │   ├── client.ts                       # Konfigurasi browser client
│   │   └── server.ts                       # Konfigurasi server-side client
│   ├── academic-utils.ts                   # Utilitas perhitungan semester berjalan
│   ├── cropImage.ts                        # Utilitas pemotongan gambar profil
│   ├── dashboard-helper.ts                 # Utilitas penghitung rekapitulasi dasbor
│   ├── encryption.ts                       # Utilitas kriptografi enkripsi AES-256-CBC
│   ├── grade-calculations.ts               # Utilitas kalkulasi IPK/IPS terdeduplikasi
│   ├── maintenance.ts                      # Utilitas pengecekan pemeliharaan sistem
│   ├── settings.ts                         # Utilitas pemuatan konfigurasi database
│   ├── turnstile.ts                        # Utilitas pemanggilan API verifikasi bot
│   ├── types.ts                            # Deklarasi tipe data & model antarmuka
│   └── utils.ts                            # Utilitas merger kelas Tailwind CSS
├── public/                                 # Aset gambar statis, ikon, dan berkas umum
├── .env                                    # Konfigurasi variabel lingkungan (lokal)
├── .gitignore                              # Definisi berkas yang diabaikan Git
├── auth.config.ts                          # Konfigurasi callback token JWT NextAuth
├── auth.ts                                 # Definisi Credentials provider NextAuth
├── components.json                         # Konfigurasi tata letak komponen UI
├── next-auth.d.ts                          # Kustomisasi tipe data session NextAuth
├── next-env.d.ts                           # Berkas deklarasi lingkungan Next.js
├── next.config.ts                          # Berkas konfigurasi kompilasi Next.js
├── package-lock.json                       # Catatan penguncian versi dependensi
├── package.json                            # Konfigurasi dependensi dan skrip proyek
├── postcss.config.mjs                      # Konfigurasi styles processor
├── proxy.ts                                # Konfigurasi reverse proxy lokal
├── tsconfig.json                           # Konfigurasi kompiler bahasa TypeScript
└── tsconfig.tsbuildinfo                    # Catatan cache kompilasi TypeScript
```

---

## Panduan Instalasi dan Setup

### 1. Kloning Repository
```bash
git clone https://github.com/azharanggakusuma/siakad-ikmi.git
cd siakad-ikmi
```

### 2. Instalasi Dependensi
Pasang semua paket pustaka pendukung yang dideklarasikan di dalam proyek:
```bash
npm install
# atau menggunakan bun
bun install
```

### 3. Konfigurasi File Environment Variables
Buat berkas `.env` pada direktori dasar proyek dan isikan dengan variabel lingkungan berikut:
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# NextAuth Configuration
AUTH_SECRET=your-nextauth-secret-key # Generate dengan command: npx auth secret
AUTH_URL=http://localhost:3000

# Cloudflare Turnstile Site Key
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your-turnstile-site-key
TURNSTILE_SECRET_KEY=your-turnstile-secret-key

# Google Generative AI (Gemini)
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-api-key

# Encryption Key (Kunci enkripsi API Key di database)
# Wajib diisi string acak sepanjang 32 karakter (256-bit)
ENCRYPTION_KEY=your-32-character-encryption-key
```

---

## Panduan Menjalankan Aplikasi

### Mode Pengembangan (Development Mode)
Untuk menjalankan server pengembangan lokal dengan fitur hot-reloading:
```bash
npm run dev
```
Setelah dijalankan, buka alamat `http://localhost:3000` di web browser Anda.

### Mode Produksi (Production Mode)
Guna merakit kode teroptimasi produksi dan meluncurkan server produksi lokal:
```bash
npm run build
npm run start
```

---

## Lisensi dan Kepemilikan

Proyek ini merupakan proyek pribadi yang dikembangkan oleh Azharangga Kusuma. Seluruh hak cipta dan kepemilikan kode sumber tunduk pada pengembang terkait.
