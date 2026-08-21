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

  useEffect(() => {
    crmApi.me().then(setAdmin).catch(() => router.replace("/crm/login"));
  }, [router]);

  if (!admin) {
    return (
      <main className="grid min-h-dvh place-items-center bg-slate-950" aria-label="Checking CRM session">
        <div className="size-8 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
      </main>
    );
  }

  return (
    <div className="min-h-dvh bg-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950 text-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:h-16 sm:px-8">
          <Link href="/crm" className="flex min-w-0 items-center gap-2 font-bold">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-indigo-500">
              <BarChart3 size={18} />
            </span>
            <span className="truncate">TaskFlow</span>
            <span className="hidden rounded bg-slate-800 px-2 py-1 text-[10px] uppercase tracking-wider text-slate-300 sm:inline">
              CRM
            </span>
          </Link>
          <nav className="ml-2 sm:ml-6">
            <Link href="/crm" className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white">
              <Users size={17} />
              <span className="hidden sm:inline">Users</span>
            </Link>
          </nav>
          <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
            <span className="hidden truncate text-sm text-slate-400 sm:inline">{admin.name || admin.username}</span>
            <button
              onClick={() => crmApi.logout().finally(() => router.replace("/crm/login"))}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              aria-label="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
