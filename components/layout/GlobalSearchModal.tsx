'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import {
  LayoutDashboard,
  Users,
  FileSpreadsheet,
  CheckSquare,
  GraduationCap,
  FileText,
  Award,
  CreditCard,
  BookOpen,
  Building2,
  CalendarDays,
  UserCheck,
  AwardIcon,
  Calendar,
  Layers,
  Settings,
  Shield,
  Search,
  User,
  Book,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { searchGlobalData, GlobalSearchResult } from '@/app/actions/global-search';
import { Badge } from '@/components/ui/badge';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const PAGE_ITEMS = [
  { title: 'Beranda', url: '/', icon: LayoutDashboard, category: 'Navigasi Utam' },
  { title: 'Data Mahasiswa', url: '/mahasiswa', icon: Users, category: 'Akademik' },
  { title: 'Biodata Saya', url: '/biodata', icon: User, category: 'Akademik' },
  { title: 'Kartu Rencana Studi (KRS)', url: '/krs', icon: FileSpreadsheet, category: 'Akademik' },
  { title: 'Validasi & Kolektif KRS', url: '/validasi-krs', icon: CheckSquare, category: 'Akademik' },
  { title: 'Kartu Hasil Studi (KHS)', url: '/khs', icon: GraduationCap, category: 'Akademik' },
  { title: 'Transkrip Nilai', url: '/transkrip', icon: FileText, category: 'Akademik' },
  { title: 'Surat Keterangan Lulus (SKL)', url: '/surat-keterangan-lulus', icon: Award, category: 'Akademik' },
  { title: 'Kartu Tanda Mahasiswa (KTM)', url: '/ktm', icon: CreditCard, category: 'Akademik' },
  { title: 'Mata Kuliah', url: '/matakuliah', icon: BookOpen, category: 'Master Data' },
  { title: 'Program Studi', url: '/prodi', icon: Building2, category: 'Master Data' },
  { title: 'Tahun Akademik', url: '/tahun-akademik', icon: CalendarDays, category: 'Master Data' },
  { title: 'Data Dosen', url: '/dosen', icon: UserCheck, category: 'Master Data' },
  { title: 'Data Pejabat', url: '/pejabat', icon: AwardIcon, category: 'Master Data' },
  { title: 'Jadwal Sidang Skripsi', url: '/jadwal-sidang', icon: Calendar, category: 'Kegiatan' },
  { title: 'Program MBKM', url: '/mbkm', icon: Layers, category: 'Kegiatan' },
  { title: 'Pengaturan Profil', url: '/pengaturan', icon: Settings, category: 'Sistem' },
  { title: 'Manajemen User & Akses', url: '/users', icon: Shield, category: 'Sistem' },
];

export default function GlobalSearchModal({ isOpen, onOpenChange }: GlobalSearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GlobalSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Listen Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!isOpen);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onOpenChange]);

  // Debounced search for dynamic data
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await searchGlobalData(query);
        setSearchResults(res);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = useCallback((url: string) => {
    onOpenChange(false);
    setQuery('');
    router.push(url);
  }, [onOpenChange, router]);

  const studentResults = searchResults.filter(r => r.type === 'student');
  const courseResults = searchResults.filter(r => r.type === 'course');
  const filteredPages = PAGE_ITEMS.filter(
    (p) =>
      !query.trim() ||
      p.title.toLowerCase().includes(query.toLowerCase()) ||
      p.category.toLowerCase().includes(query.toLowerCase()) ||
      p.url.toLowerCase().includes(query.toLowerCase())
  );

  const hasAnyResults = studentResults.length > 0 || courseResults.length > 0 || filteredPages.length > 0;

  return (
    <CommandDialog open={isOpen} onOpenChange={onOpenChange} shouldFilter={false}>
      <CommandInput
        placeholder="Ketik pencarian (menu, nama mahasiswa, NIM, matkul, kode)..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList className="max-h-[380px] p-2 overflow-y-auto">
        {!hasAnyResults && (
          <CommandEmpty>
            {isSearching ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Mencari data...
              </div>
            ) : (
              <div className="py-6 text-center text-sm text-slate-500">
                Tidak ada hasil yang ditemukan untuk <span className="font-semibold text-slate-700">"{query}"</span>
              </div>
            )}
          </CommandEmpty>
        )}

        {/* DYNAMIC RESULTS: MAHASISWA */}
        {studentResults.length > 0 && (
          <CommandGroup heading="Data Mahasiswa">
            {studentResults.map((item) => (
              <CommandItem
                key={`student-${item.id}`}
                value={`student-${item.id}-${item.title}`}
                onSelect={() => handleSelect(item.url)}
                className="flex items-center justify-between py-2.5 px-3 rounded-lg cursor-pointer hover:bg-slate-100/80 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-md bg-blue-50 text-blue-600 shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-sm text-slate-900 leading-snug">{item.title}</span>
                    <span className="text-xs text-slate-500">{item.subtitle}</span>
                  </div>
                </div>
                {item.badge && (
                  <Badge variant="outline" className="text-[10px] font-medium border-blue-200 bg-blue-50 text-blue-700">
                    {item.badge}
                  </Badge>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {studentResults.length > 0 && <CommandSeparator />}

        {/* DYNAMIC RESULTS: MATA KULIAH */}
        {courseResults.length > 0 && (
          <CommandGroup heading="Mata Kuliah">
            {courseResults.map((item) => (
              <CommandItem
                key={`course-${item.id}`}
                value={`course-${item.id}-${item.title}`}
                onSelect={() => handleSelect(item.url)}
                className="flex items-center justify-between py-2.5 px-3 rounded-lg cursor-pointer hover:bg-slate-100/80 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-md bg-emerald-50 text-emerald-600 shrink-0">
                    <Book className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-sm text-slate-900 leading-snug">{item.title}</span>
                    <span className="text-xs text-slate-500">{item.subtitle}</span>
                  </div>
                </div>
                {item.badge && (
                  <Badge variant="outline" className="text-[10px] font-medium border-emerald-200 bg-emerald-50 text-emerald-700">
                    {item.badge}
                  </Badge>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {(studentResults.length > 0 || courseResults.length > 0) && filteredPages.length > 0 && <CommandSeparator />}

        {/* PAGES & MENUS */}
        {filteredPages.length > 0 && (
          <CommandGroup heading="Halaman & Navigasi Sistem">
            {filteredPages.map((page) => {
              const Icon = page.icon;
              return (
                <CommandItem
                  key={page.url}
                  value={`page-${page.url}-${page.title}`}
                  onSelect={() => handleSelect(page.url)}
                  className="flex items-center justify-between py-2 px-3 rounded-lg cursor-pointer hover:bg-slate-100/80 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-md bg-slate-100 text-slate-600 shrink-0">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="font-medium text-sm text-slate-800">{page.title}</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">{page.url}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}
      </CommandList>

      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2 text-xs text-slate-400 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span>Pencarian Global SIAKAD</span>
        </div>
        <div className="flex items-center gap-3">
          <span><kbd className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-600">↑↓</kbd> Navigasi</span>
          <span><kbd className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-600">↵</kbd> Pilih</span>
          <span><kbd className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-600">ESC</kbd> Tutup</span>
        </div>
      </div>
    </CommandDialog>
  );
}
