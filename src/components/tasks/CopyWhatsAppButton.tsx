'use client';

import { useState } from 'react';
import { Check, Share2 } from 'lucide-react';
import { formatDeadlineID } from '@/lib/utils/urgency';
import type { TaskType } from '@/types/database';

interface CopyWhatsAppProps {
  title: string;
  subjectName: string;
  dueDate: string;
  type: TaskType;
  description?: string | null;
}

export function CopyWhatsAppButton({
  title,
  subjectName,
  dueDate,
  type,
  description,
}: CopyWhatsAppProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const snippet = description
      ? `\nCatatan: ${description.length > 100 ? description.slice(0, 100) + '...' : description}`
      : '';

    const message = [
      `📌 *INFO TUGAS*`,
      ``,
      `📚 *Mapel:* ${subjectName}`,
      `📝 *Tugas:* ${title}`,
      `📍 *Tipe:* ${type === 'online' ? 'Online' : 'Offline'}`,
      `⏰ *Deadline:* ${formatDeadlineID(dueDate)}`,
      snippet,
      ``,
      `✅ Cek detail lengkap & centang progresmu di sini:`,
      appUrl,
    ]
      .join('\n')
      .replace(/\n{3,}/g, '\n\n');

    await navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all active:scale-95 ${
        copied
          ? 'bg-emerald-600 text-white'
          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300'
      }`}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
      {copied ? 'Tersalin! Paste di Grup WA' : 'Salin ke WA'}
    </button>
  );
}
