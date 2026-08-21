"use client";

import { BarChart3, LogOut, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { crmApi } from "@/lib/api";
import type { User } from "@/lib/types";

export function CrmShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [admin, setAdmin] = useState<User | null>(null);
  useEffect(() => { crmApi.me().then(setAdmin).catch(() => router.replace("/crm/login")); }, [router]);
  if (!admin) return <main className="grid min-h-screen place-items-center bg-slate-950"><div className="size-8 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" /></main>;
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-800 bg-slate-950 text-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-5 sm:px-8">
          <Link href="/crm" className="flex items-center gap-2 font-bold"><span className="grid size-8 place-items-center rounded-lg bg-indigo-500"><BarChart3 size={18} /></span>TaskFlow <span className="rounded bg-slate-800 px-2 py-1 text-[10px] uppercase tracking-wider text-slate-300">CRM</span></Link>
          <nav className="ml-8 hidden sm:block"><Link href="/crm" className="flex items-center gap-2 text-sm text-slate-300 hover:text-white"><Users size={17} />Users</Link></nav>
          <div className="ml-auto flex items-center gap-3"><span className="hidden text-sm text-slate-400 sm:inline">{admin.name || admin.username}</span><button onClick={() => crmApi.logout().finally(() => router.replace("/crm/login"))} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Sign out"><LogOut size={18} /></button></div>
        </div>
      </header>
      {children}
    </div>
  );
}
