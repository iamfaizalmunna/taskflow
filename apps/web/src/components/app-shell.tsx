"use client";

import { CalendarDays, Check, CheckCircle2, Clock3, Folder, FolderOpen, LogOut, Menu, Pencil, Plus, Trash2, UserRound, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { authApi } from "@/lib/api";
import type { Group, User } from "@/lib/types";
import { GroupsProvider, useGroups } from "./groups-context";
import { Input } from "./ui/input";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <GroupsProvider>
      <Shell>{children}</Shell>
    </GroupsProvider>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    authApi.me().then(setUser).catch(() => router.replace("/login"));
  }, [router]);

  const taskLink = (view?: string) => `/tasks${view ? `?view=${view}` : ""}`;
  const activeView = params.get("group") ? "" : params.get("view") ?? "all";
  const nav = [
    { href: taskLink(), key: "all", label: "All tasks", icon: CheckCircle2 },
    { href: taskLink("today"), key: "today", label: "Today", icon: CalendarDays },
    { href: taskLink("overdue"), key: "overdue", label: "Overdue", icon: Clock3 },
  ];

  if (!user) {
    return (
      <main className="grid min-h-screen place-items-center">
        <div className="size-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[260px_1fr]">
      <button onClick={() => setMobileOpen(true)} className="fixed left-4 top-4 z-30 rounded-lg border bg-white p-2 shadow-sm lg:hidden" aria-label="Open navigation"><Menu size={20} /></button>
      {mobileOpen && <button className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-slate-200 bg-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-20 items-center justify-between px-5">
          <Link href="/tasks" className="flex items-center gap-2 text-lg font-bold"><span className="grid size-9 place-items-center rounded-xl bg-indigo-600 text-white"><CheckCircle2 size={20} /></span>TaskFlow</Link>
          <button onClick={() => setMobileOpen(false)} className="p-2 lg:hidden" aria-label="Close"><X size={20} /></button>
        </div>
        <nav className="space-y-1 px-3" aria-label="Task views">
          {nav.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${pathname === "/tasks" && activeView === item.key ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"}`}
            >
              <item.icon size={18} />{item.label}
            </Link>
          ))}
        </nav>
        <GroupList onNavigate={() => setMobileOpen(false)} />
        <div className="border-t border-slate-100 p-3">
          <Link href="/profile" className="flex items-center gap-3 rounded-xl p-3 hover:bg-slate-50">
            <span className="grid size-9 place-items-center rounded-full bg-indigo-100 font-bold text-indigo-700">{user.name?.charAt(0).toUpperCase() || <UserRound size={18} />}</span>
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{user.name}</span><span className="block truncate text-xs text-slate-400">{user.email}</span></span>
          </Link>
          <button onClick={() => authApi.logout().finally(() => router.replace("/login"))} className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-red-50 hover:text-red-600"><LogOut size={16} />Sign out</button>
        </div>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function GroupList({ onNavigate }: { onNavigate: () => void }) {
  const params = useSearchParams();
  const router = useRouter();
  const { groups, createGroup, renameGroup, deleteGroup } = useGroups();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const selected = params.get("group");

  async function submitNew(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setAdding(false);
    setName("");
    setAdding(false);
    const group = await createGroup(trimmed);
    if (group) router.push(`/tasks?group=${group.id}`);
  }

  async function confirmDelete(group: Group) {
    if (!window.confirm(`Delete “${group.name}”? Its tasks stay, just without a group.`)) return;
    await deleteGroup(group.id);
    if (selected === group.id) router.push("/tasks");
  }

  return (
    <>
      <div className="mt-7 flex items-center justify-between px-6">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Groups</p>
        <button onClick={() => setAdding(true)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-indigo-600" aria-label="Create group"><Plus size={16} /></button>
      </div>
      <div className="mt-2 flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {groups.map((group) => editingId === group.id ? (
          <GroupNameForm
            key={group.id}
            defaultValue={group.name}
            onCancel={() => setEditingId(null)}
            onSubmit={async (value) => {
              setEditingId(null);
              if (value !== group.name) await renameGroup(group.id, value);
            }}
          />
        ) : (
          <div key={group.id} className={`group flex items-center rounded-lg ${selected === group.id ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"}`}>
            <Link href={`/tasks?group=${group.id}`} className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-sm font-medium" onClick={onNavigate}>
              <Folder size={17} className="shrink-0" />
              <span className="truncate">{group.name}</span>
            </Link>
            <button onClick={() => setEditingId(group.id)} className="rounded p-1.5 text-slate-400 opacity-0 hover:text-indigo-600 focus:opacity-100 group-hover:opacity-100" aria-label={`Rename ${group.name}`}><Pencil size={14} /></button>
            <button onClick={() => confirmDelete(group)} className="mr-1.5 rounded p-1.5 text-slate-400 opacity-0 hover:text-red-600 focus:opacity-100 group-hover:opacity-100" aria-label={`Delete ${group.name}`}><Trash2 size={14} /></button>
          </div>
        ))}

        {adding ? (
          <form onSubmit={submitNew} className="flex items-center gap-1 px-1 py-1">
            <Input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              onBlur={submitNew}
              onKeyDown={(event) => event.key === "Escape" && (setAdding(false), setName(""))}
              placeholder="Group name"
              aria-label="New group name"
              className="h-9 text-sm"
            />
            <button type="submit" className="rounded-lg p-2 text-indigo-600 hover:bg-indigo-50" aria-label="Save group"><Check size={16} /></button>
          </form>
        ) : (
          <button onClick={() => setAdding(true)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-slate-50 hover:text-indigo-600">
            <Plus size={17} />New group
          </button>
        )}

        {groups.length > 0 && (
          <Link
            href="/tasks?group=none"
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${selected === "none" ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:bg-slate-50"}`}
          >
            <FolderOpen size={17} />Ungrouped
          </Link>
        )}
      </div>
    </>
  );
}

function GroupNameForm({
  defaultValue,
  onSubmit,
  onCancel,
}: {
  defaultValue: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(defaultValue);
  function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return onCancel();
    onSubmit(trimmed);
  }
  return (
    <form onSubmit={submit} className="flex items-center gap-1 px-1 py-1">
      <Input
        autoFocus
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={submit}
        onKeyDown={(event) => event.key === "Escape" && onCancel()}
        aria-label="Group name"
        className="h-9 text-sm"
      />
      <button type="submit" className="rounded-lg p-2 text-indigo-600 hover:bg-indigo-50" aria-label="Save group name"><Check size={16} /></button>
    </form>
  );
}
