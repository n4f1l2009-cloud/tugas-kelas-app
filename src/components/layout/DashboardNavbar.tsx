'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { CheckSquare, ClipboardEdit, LogOut, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/types/database';
import { RoleBadge } from '@/components/ui/RoleBadge';

interface DashboardNavbarProps {
  profile: Profile;
}

export function DashboardNavbar({ profile }: DashboardNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const canManage = profile.role === 'admin' || profile.role === 'sub_admin';
  const isAdmin = profile.role === 'admin';

  const navItems = [
    { href: '/', label: 'Tugas', icon: CheckSquare, visible: true },
    { href: '/manage', label: 'Kelola', icon: ClipboardEdit, visible: canManage },
    { href: '/admin', label: 'Admin', icon: ShieldCheck, visible: isAdmin },
  ].filter((item) => item.visible);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  };

  const initials = (profile.full_name ?? profile.email).slice(0, 1).toUpperCase();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/85">
      <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-2 px-4">
        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/"
            className="mr-2 flex items-center gap-2 font-bold text-slate-900 dark:text-white"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <CheckSquare className="h-4 w-4" />
            </span>
            <span className="hidden text-sm tracking-tight sm:inline">TugasKelas</span>
          </Link>

          <nav className="flex items-center gap-1" aria-label="Navigasi utama">
            {navItems.map(({ href, label, icon: Icon }) => {
              const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-slate-900 text-white dark:bg-indigo-600'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden text-right sm:block">
            <p className="max-w-[130px] truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
              {profile.full_name ?? 'Siswa'}
            </p>
            <RoleBadge role={profile.role} />
          </div>

          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.full_name ?? 'Avatar'}
              referrerPolicy="no-referrer"
              className="h-8 w-8 rounded-full border border-slate-200 object-cover dark:border-slate-700"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
              {initials}
            </div>
          )}

          <button
            type="button"
            onClick={handleLogout}
            title="Keluar"
            aria-label="Keluar dari akun"
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-950/60 dark:hover:text-rose-300"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
