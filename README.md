# TugasKelas — Web Daftar Tugas Kelas Berbasis Role

Aplikasi web *mobile-first* untuk memantau tugas sekolah (*offline* & *online*) tanpa tertimbun chat grup, dilengkapi autentikasi **Google OAuth**, kontrol akses berlapis (**Admin**, **Sub-Admin**, **Siswa**), kompresi foto papan tulis ke **WebP**, arsip tugas, tombol **Salin ke WhatsApp**, dan statistik progres kelas anonim via PostgreSQL RPC.

## Stack Teknologi
- **Frontend & Server Actions:** Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS v4
- **Backend, Auth & Storage:** Supabase (PostgreSQL, Row Level Security, Google OAuth, Storage)
- **Deployment:** Vercel

---

## Langkah Cepat Menjalankan & Debugging di VS Code

1. **Ekstrak folder** dan buka folder `tugas-kelas-app` di VS Code.
2. **Pasang dependensi:**
   ```bash
   npm install
   ```
3. **Jalankan Skema Database Supabase:**
   - Buka [Supabase Dashboard](https://supabase.com/dashboard) -> **SQL Editor**.
   - Salin seluruh isi file `supabase/schema.sql`, lalu jalankan (*Run*).
4. **Aktifkan Google OAuth:**
   - Di Google Cloud Console, buat OAuth Client ID (*Web application*) dengan *Authorized redirect URI* mengarah ke `https://KODE_PROYEK_KAMU.supabase.co/auth/v1/callback`.
   - Ubah status OAuth Consent Screen (**Audience**) ke **In Production** agar seluruh siswa bisa login.
   - Masukkan Client ID & Secret di **Supabase -> Authentication -> Providers -> Google**.
   - Di **Supabase -> Authentication -> URL Configuration**, tambahkan `http://localhost:3000/auth/callback` ke **Redirect URLs**.
5. **Siapkan Environment Variables:**
   ```bash
   cp .env.example .env.local
   ```
   Isi `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` di `.env.local`.
6. **Jalankan & Debug di VS Code:**
   - Via terminal: `npm run dev`
   - Atau tekan **F5** di VS Code dan pilih **`Next.js: debug full stack`** (konfigurasi sudah tersedia di `.vscode/launch.json`).
7. **Promosikan Akunmu Jadi Admin:**
   - Login pertama kali di `http://localhost:3000` dengan akun Google-mu.
   - Jalankan query berikut satu kali di SQL Editor Supabase:
     ```sql
     UPDATE public.profiles SET role = 'admin' WHERE email = 'emailkamu@gmail.com';
     ```
   - Muat ulang halaman (`F5`)—menu **Kelola** dan **Admin** akan langsung aktif.

---

## Verifikasi Sebelum Deploy ke Vercel

Jalankan dua perintah ini di terminal VS Code untuk memastikan tidak ada error TypeScript maupun lint:

```bash
npm run typecheck
npm run build
```

## Deploy ke Vercel

1. Push folder ini ke repositori GitHub milikmu (`.env.local` otomatis diabaikan oleh `.gitignore`).
2. Import repositori di [Vercel](https://vercel.com), lalu isi *Environment Variables*:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Setelah *deploy* selesai, perbarui **Site URL** dan tambahkan `https://domain-kamu.vercel.app/auth/callback` di **Supabase -> Authentication -> URL Configuration**, serta tambahkan domain Vercel ke **Authorized JavaScript origins** di Google Cloud Console.
