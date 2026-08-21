"use client";

import { Eye, Pencil, Plus, Search, ShieldOff, ShieldCheck, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { crmApi } from "@/lib/api";
import type { User } from "@/lib/types";
import { useToast } from "./toast";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { Input } from "./ui/input";

export function CrmUsers() {
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  useEffect(() => {
    crmApi.users()
      .then(setUsers)
      .catch((error) => toast(error instanceof Error ? error.message : "Could not load users", "error"))
      .finally(() => setLoading(false));
  }, [toast]);

  const shown = useMemo(
    () => users.filter((user) => `${user.name} ${user.email}`.toLowerCase().includes(query.toLowerCase())),
    [users, query],
  );

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      const user = editing
        ? await crmApi.updateUser(editing.id, { name: String(data.get("name")), email: String(data.get("email")) })
        : await crmApi.createUser({
            name: String(data.get("name")),
            email: String(data.get("email")),
            password: String(data.get("password")),
          });
      setUsers((items) => (editing ? items.map((item) => (item.id === user.id ? user : item)) : [user, ...items]));
      setModal(false);
      toast(editing ? "User updated" : "User created");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not save user", "error");
    }
  }

  async function toggle(user: User) {
    try {
      const updated = await crmApi.updateUser(user.id, { isActive: user.isActive === false });
      setUsers((items) => items.map((item) => (item.id === user.id ? updated : item)));
      toast(updated.isActive === false ? "User disabled" : "User enabled");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not update user", "error");
    }
  }

  async function remove(user: User) {
    if (!window.confirm(`Permanently delete ${user.name}?`)) return;
    try {
      await crmApi.removeUser(user.id);
      setUsers((items) => items.filter((item) => item.id !== user.id));
      toast("User deleted");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not delete user", "error");
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-indigo-600">Customer management</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Users</h1>
          <p className="mt-2 text-sm text-slate-500">Manage TaskFlow accounts and access.</p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => { setEditing(null); setModal(true); }}>
          <Plus size={18} />Create user
        </Button>
      </div>

      <div className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-3">
        <Stat label="Total users" value={users.length} icon={<Users />} />
        <Stat label="Active" value={users.filter((user) => user.isActive !== false).length} icon={<ShieldCheck />} />
        <Stat label="Disabled" value={users.filter((user) => user.isActive === false).length} icon={<ShieldOff />} />
      </div>

      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <label className="relative block max-w-lg">
            <Search className="absolute left-3 top-3 text-slate-400" size={18} />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} className="pl-10" placeholder="Search users…" aria-label="Search users" />
          </label>
        </div>

        <div className="space-y-3 p-4 md:hidden">
          {loading && <p className="py-8 text-center text-sm text-slate-400">Loading users…</p>}
          {!loading && shown.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No users found.</p>}
          {shown.map((user) => (
            <UserCard key={user.id} user={user} onEdit={() => { setEditing(user); setModal(true); }} onToggle={() => toggle(user)} onRemove={() => remove(user)} />
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">User</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Tasks</th>
                <th className="px-5 py-3 font-semibold">Joined</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="p-10 text-center text-slate-400">Loading users…</td></tr>
              ) : shown.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="grid size-9 place-items-center rounded-full bg-indigo-100 font-bold text-indigo-700">{user.name?.charAt(0).toUpperCase()}</span>
                      <span>
                        <span className="block font-semibold text-slate-800">{user.name}</span>
                        <span className="text-xs text-slate-500">{user.email}</span>
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4"><Badge tone={user.isActive === false ? "red" : "green"}>{user.isActive === false ? "Disabled" : "Active"}</Badge></td>
                  <td className="px-5 py-4 text-slate-600">{user.taskCount ?? "—"}</td>
                  <td className="px-5 py-4 text-slate-500">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}</td>
                  <td className="px-5 py-4"><UserActions user={user} onEdit={() => { setEditing(user); setModal(true); }} onToggle={() => toggle(user)} onRemove={() => remove(user)} /></td>
                </tr>
              ))}
              {!loading && shown.length === 0 && <tr><td colSpan={5} className="p-12 text-center text-slate-400">No users found.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog open={modal} onClose={() => setModal(false)} title={editing ? "Edit user" : "Create user"} description={editing ? "Update this account's details." : "Create a TaskFlow account. The user can change their password later."}>
        <form onSubmit={save} className="space-y-4">
          <label className="block text-sm font-semibold text-slate-700">Name<Input name="name" defaultValue={editing?.name} required className="mt-2" /></label>
          <label className="block text-sm font-semibold text-slate-700">Email<Input name="email" type="email" defaultValue={editing?.email} required className="mt-2" /></label>
          {!editing && <label className="block text-sm font-semibold text-slate-700">Temporary password<Input name="password" type="password" minLength={8} required className="mt-2" /></label>}
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={() => setModal(false)}>Cancel</Button>
            <Button className="w-full sm:w-auto">{editing ? "Save changes" : "Create user"}</Button>
          </div>
        </form>
      </Dialog>
    </main>
  );
}

function UserCard({
  user,
  onEdit,
  onToggle,
  onRemove,
}: {
  user: User;
  onEdit: () => void;
  onToggle: () => void;
  onRemove: () => void;
}) {
  return (
    <article className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-10 place-items-center rounded-full bg-indigo-100 font-bold text-indigo-700">{user.name?.charAt(0).toUpperCase()}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold text-slate-800">{user.name}</p>
            <Badge tone={user.isActive === false ? "red" : "green"}>{user.isActive === false ? "Disabled" : "Active"}</Badge>
          </div>
          <p className="truncate text-xs text-slate-500">{user.email}</p>
          <p className="mt-2 text-xs text-slate-400">{user.taskCount ?? 0} tasks · joined {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}</p>
        </div>
      </div>
      <UserActions user={user} onEdit={onEdit} onToggle={onToggle} onRemove={onRemove} className="mt-3 justify-start" />
    </article>
  );
}

function UserActions({
  user,
  onEdit,
  onToggle,
  onRemove,
  className = "justify-end",
}: {
  user: User;
  onEdit: () => void;
  onToggle: () => void;
  onRemove: () => void;
  className?: string;
}) {
  return (
    <div className={`flex ${className} gap-1`}>
      <Link href={`/crm/users/${user.id}`} className="rounded-lg p-2 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600" aria-label={`View ${user.name}`}><Eye size={17} /></Link>
      <button onClick={onEdit} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label={`Edit ${user.name}`}><Pencil size={17} /></button>
      <button onClick={onToggle} className="rounded-lg p-2 text-slate-400 hover:bg-amber-50 hover:text-amber-600" aria-label={user.isActive === false ? `Enable ${user.name}` : `Disable ${user.name}`}>
        {user.isActive === false ? <ShieldCheck size={17} /> : <ShieldOff size={17} />}
      </button>
      <button onClick={onRemove} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label={`Delete ${user.name}`}><Trash2 size={17} /></button>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">{icon}</span>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs font-medium text-slate-500">{label}</p>
      </div>
    </div>
  );
}
