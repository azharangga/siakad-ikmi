# 🤖 SIAKAD Chatbot - Fitur & Kemampuan

## 📋 Ringkasan
Chatbot AI berbasis Google Gemini yang terintegrasi dengan database SIAKAD untuk memberikan informasi akademik secara real-time.

---

## 🎯 Fitur Utama

### 1. **Role-Based Access**
Chatbot menyesuaikan kemampuan berdasarkan role pengguna:

#### 👨‍🎓 **Mahasiswa**
- ✅ Lihat biodata pribadi
- ✅ Cek IPK kumulatif (Transkrip)
- ✅ Lihat KHS per semester dengan IPS
- ✅ Lihat KRS semester aktif
- ✅ Informasi program studi
- ✅ Tahun akademik aktif

**Contoh Pertanyaan:**
- "Tampilkan biodata saya"
- "Berapa IPK saya sekarang?"
- "Lihat KHS semester 4"
- "Apa saja mata kuliah KRS saya?"

#### 👨‍🏫 **Dosen**
- ✅ Statistik mahasiswa
- ✅ Cari mahasiswa (nama/NIM)
- ✅ Detail mahasiswa + IPK
- ✅ Cari dosen (nama/NIDN)
- ✅ Cari mata kuliah
- ✅ Daftar mahasiswa per prodi
- ✅ Statistik per program studi

**Contoh Pertanyaan:**
- "Tampilkan statistik mahasiswa"
- "Cari mahasiswa bernama Ahmad"
- "Berapa total dosen aktif?"
- "Daftar mahasiswa Sistem Informasi"
- "Siapa mahasiswa dengan IPK tertinggi?"

#### 👨‍💼 **Admin/Superuser**
- ✅ Semua fitur dosen +
- ✅ Statistik lengkap SIAKAD
- ✅ Top mahasiswa berdasarkan IPK
- ✅ Statistik per program studi
- ✅ Pencarian advanced

**Contoh Pertanyaan:**
- "Tampilkan statistik SIAKAD"
- "Cari mahasiswa dengan IPK tertinggi"
- "Berapa jumlah mahasiswa per prodi?"
- "Cari mata kuliah Algoritma"

---

## 🚀 Fitur Advanced

### 1. **Dynamic Suggestions**
- Suggestions berubah otomatis sesuai role
- Quick actions untuk pertanyaan umum
- Sparkle button untuk akses cepat

### 2. **Export Chat**
- Download riwayat percakapan (.txt)
- Format: `chat-siakad-YYYY-MM-DD.txt`
- Tombol download di header

### 3. **Smart Data Fetching**
- Deduplikasi nilai mengulang (ambil nilai terbaik)
- Filter otomatis nilai kosong (-)
- Hitung IPK/IPS akurat

### 4. **Connection Status**
- Real-time status: Online/Offline/Connecting
- Auto-reconnect saat koneksi kembali
- Error handling yang jelas

### 5. **Responsive UI**
- Mode normal: 380px × 500px
- Mode expanded: 520px × 650px
- Mobile-friendly

---

## ⚡ Optimasi Token (Hemat Biaya)

### Strategi Penghematan:
1. **Prompt Compression** (~50% lebih hemat)
   - Instruksi super ringkas
   - Hapus kata-kata tidak perlu
   - Format singkat & padat

2. **Response Limiting**
   - KHS: Max 20 mata kuliah
   - Transkrip: Max 25 mata kuliah
   - Pencarian: Max 5 hasil
   - Top mahasiswa: Max 10

3. **Model Configuration**
   - `maxTokens: 1024` — batasi output
   - `maxSteps: 5` — batasi tool calls
   - `temperature: 0.7` — fokus, kurang verbose

4. **JSON Compression**
   - Hapus field tidak perlu
   - Singkat property names
   - Return array langsung (tanpa wrapper)

### Estimasi Biaya:
- **Sebelum**: ~500-800 token/request
- **Sesudah**: ~250-400 token/request
- **Hemat**: 40-50% biaya API

---

## 🛠️ Tools Available

### Mahasiswa Tools:
| Tool | Deskripsi | Input |
|------|-----------|-------|
| `getProfilSaya` | Biodata mahasiswa | - |
| `getKHSSaya` | KHS per semester | semester (optional) |
| `getTranskripSaya` | Transkrip + IPK | - |
| `getKRSSaya` | KRS semester aktif | - |
| `getInfoProdi` | Daftar prodi | - |
| `getTahunAkademik` | Tahun akademik | - |

### Admin/Dosen Tools:
| Tool | Deskripsi | Input |
|------|-----------|-------|
| `getStatistik` | Statistik umum | - |
| `getStatistikProdi` | Statistik per prodi | - |
| `cariMahasiswa` | Cari mahasiswa | keyword |
| `getDetailMahasiswa` | Detail + IPK | nim |
| `cariDosen` | Cari dosen | keyword |
| `cariMatakuliah` | Cari mata kuliah | keyword |
| `getMahasiswaByProdi` | Mahasiswa per prodi | prodi |
| `getTopMahasiswa` | Top mahasiswa IPK | limit (optional) |

---

## 🔒 Security & Privacy

1. **Authentication Required**
   - Hanya user login yang bisa akses
   - Session-based authentication
   - Role-based access control

2. **Data Privacy**
   - Mahasiswa hanya lihat data sendiri
   - Admin/Dosen lihat semua data
   - No sensitive data in logs

3. **API Key Management**
   - Fallback ke .env jika DB key limit
   - Auto-disable key saat error
   - Encrypted storage di database

---

## 📊 Error Handling

### User-Friendly Messages:
- ❌ "Data tidak ditemukan" (bukan error teknis)
- ❌ "Belum ada nilai" (bukan null/undefined)
- ❌ "Tahun akademik aktif tidak ditemukan"
- ❌ "Gangguan layanan atau masalah koneksi"

### Auto-Recovery:
- Retry connection saat online kembali
- Fallback API key otomatis
- Graceful degradation

---

## 🎨 UI/UX Features

1. **Typing Indicator**
   - Animated dots saat AI mengetik
   - Status badge (Online/Offline/Connecting)

2. **Message Actions**
   - Copy message
   - Export chat
   - Reset conversation

3. **Quick Actions**
   - Sparkle button untuk suggestions
   - One-click common questions

4. **Markdown Support**
   - Bold, italic, lists
   - Code blocks
   - Tables (via remarkGfm)

---

## 🔧 Configuration

### Environment Variables:
```env
GOOGLE_GENERATIVE_AI_API_KEY=your_key_here
```

### Database Tables:
- `api_keys` — Custom API keys dengan fallback
- `students`, `grades`, `krs` — Data akademik
- `lecturers`, `courses` — Data master

---

## 📈 Future Enhancements

- [ ] Voice input/output
- [ ] Multi-language support
- [ ] Chat history persistence
- [ ] Advanced analytics
- [ ] File upload support
- [ ] Integration dengan notifikasi
- [ ] Scheduled reminders (KRS, pembayaran)

---

## 🐛 Known Limitations

1. **Token Limit**: Max 1024 token per response
2. **Tool Steps**: Max 5 tool calls per request
3. **Data Limit**: Response dibatasi untuk hemat token
4. **No History**: Chat tidak disimpan (session only)

---

## 📞 Support

Jika ada masalah:
1. Cek koneksi internet
2. Refresh halaman
3. Reset chat (tombol ↻)
4. Hubungi admin jika masih error
