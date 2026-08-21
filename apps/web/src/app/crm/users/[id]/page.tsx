"use client";

import { ArrowLeft, Calendar, CheckCircle2, Clock3, Folder, KeyRound, Mail, UserRound } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { CrmShell } from "@/components/crm-shell";
import { useToast } from "@/components/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { crmApi } from "@/lib/api";
import type { CrmUserDetail } from "@/lib/types";

export default function CrmUserPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const [user, setUser] = useState<CrmUserDetail | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  useEffect(() => { crmApi.user(id).then(setUser).catch((e) => toast(e instanceof Error ? e.message : "Could not load user", "error")); }, [id, toast]);
  async function reset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try { await crmApi.resetPassword(id, String(data.get("password"))); setResetOpen(false); toast("Password reset"); }
    catch (error) { toast(error instanceof Error ? error.message : "Could not reset password", "error"); }
  }
  return (
    <CrmShell>
      <main className="mx-auto max-w-7xl p-5 sm:p-8">
        <Link href="/crm" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600"><ArrowLeft size={17} />Back to users</Link>
        {!user ? <div className="mt-8 skeleton h-40 rounded-2xl" /> : <>
          <section className="mt-6 flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center">
            <span className="grid size-16 place-items-center rounded-2xl bg-indigo-100 text-2xl font-bold text-indigo-700">{user.name?.charAt(0).toUpperCase() || <UserRound />}</span>
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-3"><h1 className="truncate text-2xl font-bold">{user.name}</h1><Badge tone={user.isActive === false ? "red" : "green"}>{user.isActive === false ? "Disabled" : "Active"}</Badge></div><p className="mt-2 flex items-center gap-2 text-sm text-slate-500"><Mail size={15} />{user.email}</p></div>
            <Button variant="secondary" onClick={() => setResetOpen(true)}><KeyRound size={17} />Reset password</Button>
          </section>
          <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
            <div className="space-y-6">
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-bold">Tasks <span className="ml-2 text-sm font-normal text-slate-400">{user.tasks?.length ?? 0}</span></h2><div className="mt-4 divide-y divide-slate-100">{user.tasks?.length ? user.tasks.map((task) => <div key={task.id} className="flex items-center gap-3 py-3"><span className={`grid size-5 place-items-center rounded border ${task.completed ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300"}`}>{task.completed && <CheckCircle2 size={13} />}</span><span className={`min-w-0 flex-1 truncate text-sm font-medium ${task.completed ? "text-slate-400 line-through" : ""}`}>{task.title}</span><Badge tone={task.priority === "high" ? "red" : task.priority === "medium" ? "amber" : "slate"}>{task.priority}</Badge>{task.dueDate && <span className="hidden text-xs text-slate-400 sm:block">{new Date(task.dueDate).toLocaleDateString()}</span>}</div>) : <p className="py-8 text-center text-sm text-slate-400">No tasks.</p>}</div></section>
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-bold">Activity</h2><div className="mt-4 space-y-4">{user.activity?.length ? user.activity.map((item) => <div key={item.id} className="flex gap-3"><span className="mt-1 size-2 rounded-full bg-indigo-500" /><div><p className="text-sm font-medium">{item.description || item.action}</p><p className="mt-1 text-xs text-slate-400">{new Date(item.createdAt).toLocaleString()}</p></div></div>) : <p className="py-6 text-center text-sm text-slate-400">No recent activity.</p>}</div></section>
            </div>
            <aside className="space-y-6">
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-bold">Account metadata</h2><dl className="mt-5 space-y-4 text-sm"><Meta icon={<Calendar />} label="Created" value={user.createdAt ? new Date(user.createdAt).toLocaleString() : "—"} /><Meta icon={<Clock3 />} label="Last login" value={user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "Never"} /><Meta icon={<UserRound />} label="User ID" value={user.id} /></dl></section>
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="font-bold">Groups</h2><div className="mt-4 space-y-2">{user.groups?.length ? user.groups.map((group) => <div key={group.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm"><Folder size={15} className="text-indigo-500" /><span className="flex-1 truncate">{group.name}</span><span className="text-xs text-slate-400">{group.taskCount ?? 0}</span></div>) : <p className="text-sm text-slate-400">No groups.</p>}</div></section>
            </aside>
          </div>
        </>}
      </main>
      <Dialog open={resetOpen} onClose={() => setResetOpen(false)} title="Reset password" description="Set a temporary password for this user.">
        <form onSubmit={reset} className="space-y-4"><label className="block text-sm font-semibold text-slate-700">New password<Input name="password" type="password" minLength={8} required className="mt-2" /></label><div className="flex justify-end gap-3"><Button type="button" variant="secondary" onClick={() => setResetOpen(false)}>Cancel</Button><Button>Reset password</Button></div></form>
      </Dialog>
    </CrmShell>
  );
}

function Meta({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="flex gap-3"><span className="text-slate-400 [&>svg]:size-4">{icon}</span><div className="min-w-0"><dt className="text-xs text-slate-400">{label}</dt><dd className="mt-0.5 break-all font-medium text-slate-700">{value}</dd></div></div>;
}
