-- =========================================================================
-- TUGASKELAS - SKEMA DATABASE, RLS, STORAGE BUCKET, & RPC STATISTIK ANONIM
-- Jalankan seluruh skrip ini satu kali di Supabase Dashboard -> SQL Editor
-- =========================================================================

-- ==========================================
-- 1. ENUM TYPES
-- ==========================================
CREATE TYPE public.user_role AS ENUM ('admin', 'sub_admin', 'student');
CREATE TYPE public.task_type AS ENUM ('offline', 'online');

-- ==========================================
-- 2. TABEL UTAMA
-- ==========================================

-- A. Profiles (terhubung ke auth.users bawaan Supabase)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  role public.user_role NOT NULL DEFAULT 'student',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- B. Mata Pelajaran (Subjects)
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  teacher_name TEXT,
  color_hex TEXT NOT NULL DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- C. Daftar Tugas (Tasks)
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT,
  type public.task_type NOT NULL DEFAULT 'offline',
  attachment_url TEXT,       -- URL foto papan tulis / PDF di Supabase Storage
  external_link TEXT,        -- Tautan Google Classroom / Drive / Form
  due_date TIMESTAMPTZ NOT NULL,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- D. Status Centang Siswa (Task Completions)
CREATE TABLE public.task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, task_id)
);

-- Indexes untuk performa query & agregasi
CREATE INDEX idx_tasks_due_date ON public.tasks (due_date ASC) WHERE is_archived = FALSE;
CREATE INDEX idx_completions_user_id ON public.task_completions (user_id);
CREATE INDEX idx_completions_task_id ON public.task_completions (task_id);

-- ==========================================
-- 3. TRIGGERS & HELPER FUNCTIONS
-- ==========================================

-- Otomatis membuat profil dengan role 'student' saat login Google pertama kali
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Siswa'),
    NEW.raw_user_meta_data->>'avatar_url',
    'student'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Otomatis memperbarui kolom updated_at saat tugas diedit
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Helper membaca role user saat ini secara aman tanpa infinite recursion di RLS
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- ==========================================
-- 4. ROW LEVEL SECURITY (RLS) TABEL UTAMA
-- ==========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;

-- --- POLICIES: profiles ---
CREATE POLICY "Profiles viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Only admin can update profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- --- POLICIES: subjects ---
CREATE POLICY "Subjects viewable by authenticated users"
  ON public.subjects FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Admin and sub_admin can manage subjects"
  ON public.subjects FOR ALL
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'sub_admin'))
  WITH CHECK (public.get_my_role() IN ('admin', 'sub_admin'));

-- --- POLICIES: tasks ---
CREATE POLICY "Tasks viewable by authenticated users"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Admin and sub_admin can insert tasks"
  ON public.tasks FOR INSERT
  TO authenticated
  WITH CHECK (public.get_my_role() IN ('admin', 'sub_admin'));

CREATE POLICY "Admin and sub_admin can update tasks"
  ON public.tasks FOR UPDATE
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'sub_admin'))
  WITH CHECK (public.get_my_role() IN ('admin', 'sub_admin'));

CREATE POLICY "Admin and sub_admin can delete tasks"
  ON public.tasks FOR DELETE
  TO authenticated
  USING (public.get_my_role() IN ('admin', 'sub_admin'));

-- --- POLICIES: task_completions ---
CREATE POLICY "Users can view own completions"
  ON public.task_completions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own completions"
  ON public.task_completions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own completions"
  ON public.task_completions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ==========================================
-- 5. STORAGE BUCKET & RLS LAMPIRAN TUGAS
-- ==========================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'task-attachments',
  'task-attachments',
  true,
  5242880, -- Batas keras 5 MB per file
  ARRAY['image/webp', 'image/jpeg', 'image/png', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Public read access for task attachments"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'task-attachments');

CREATE POLICY "Admin and sub_admin can upload task attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'task-attachments'
    AND public.get_my_role() IN ('admin', 'sub_admin')
  );

CREATE POLICY "Admin and sub_admin can update task attachments"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'task-attachments'
    AND public.get_my_role() IN ('admin', 'sub_admin')
  )
  WITH CHECK (
    bucket_id = 'task-attachments'
    AND public.get_my_role() IN ('admin', 'sub_admin')
  );

CREATE POLICY "Admin and sub_admin can delete task attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'task-attachments'
    AND public.get_my_role() IN ('admin', 'sub_admin')
  );

-- ==========================================
-- 6. RPC STATISTIK PROGRES KELAS (AGREGAT ANONIM)
-- ==========================================

CREATE OR REPLACE FUNCTION public.get_active_task_stats()
RETURNS TABLE (
  task_id UUID,
  completed_count INT,
  total_members INT,
  completion_pct INT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.user_role;
  v_total_members INT;
BEGIN
  v_role := public.get_my_role();
  IF v_role IS NULL OR v_role NOT IN ('admin', 'sub_admin') THEN
    RAISE EXCEPTION 'Akses ditolak: hanya Admin dan Sub-Admin yang dapat mengakses statistik kelas.'
      USING ERRCODE = '42501';
  END IF;

  SELECT COUNT(*)::INT INTO v_total_members FROM public.profiles;

  RETURN QUERY
  SELECT
    t.id AS task_id,
    COUNT(tc.id)::INT AS completed_count,
    v_total_members AS total_members,
    CASE
      WHEN v_total_members = 0 THEN 0
      ELSE ROUND((COUNT(tc.id)::NUMERIC / v_total_members) * 100)::INT
    END AS completion_pct
  FROM public.tasks t
  LEFT JOIN public.task_completions tc ON tc.task_id = t.id
  WHERE t.is_archived = FALSE
  GROUP BY t.id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_active_task_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_active_task_stats() TO authenticated;

-- =========================================================================
-- LANGKAH BOOTSTRAP ADMIN (Jalankan TERPISAH setelah kamu login pertama kali)
-- =========================================================================
-- UPDATE public.profiles
-- SET role = 'admin'
-- WHERE email = 'emailkamu@gmail.com';
