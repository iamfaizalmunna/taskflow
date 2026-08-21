"use client";

import { ArrowLeft, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { authApi } from "@/lib/api";
import type { User } from "@/lib/types";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ProfilePage() {
  const router = useRouter();
  const toast = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { authApi.me().then(setUser).catch(() => router.replace("/login")); }, [router]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const data = new FormData(event.currentTarget);
    try {
      const updated = await authApi.profile({ name: String(data.get("name")), email: String(data.get("email")) });
      setUser(updated); toast("Profile updated");
    } catch (error) { toast(error instanceof Error ? error.message : "Could not save profile", "error"); }
    finally { setSaving(false); }
  }
  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await authApi.profile({ currentPassword: String(data.get("currentPassword")), password: String(data.get("password")) });
      form.reset(); toast("Password changed");
    } catch (error) { toast(error instanceof Error ? error.message : "Could not change password", "error"); }
  }

  if (!user) return <main className="grid min-h-screen place-items-center"><div className="size-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" /></main>;
  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10">
      <div className="mx-auto max-w-3xl">
        <Link href="/tasks" className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600"><ArrowLeft size={17} />Back to tasks</Link>
        <div className="mb-8 flex items-center gap-4"><span className="grid size-14 place-items-center rounded-2xl bg-indigo-100 text-indigo-700"><UserRound size={25} /></span><div><h1 className="text-3xl font-bold">Profile settings</h1><p className="mt-1 text-sm text-slate-500">Manage your account details and security.</p></div></div>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><h2 className="font-bold">Personal information</h2><form onSubmit={saveProfile} className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold text-slate-700">Name<Input name="name" defaultValue={user.name} required className="mt-2" /></label><label className="text-sm font-semibold text-slate-700">Email<Input name="email" type="email" defaultValue={user.email} required className="mt-2" /></label><div className="sm:col-span-2"><Button disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button></div></form></section>
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><div className="flex items-center gap-2"><ShieldCheck className="text-indigo-600" size={20} /><h2 className="font-bold">Change password</h2></div><form onSubmit={changePassword} className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold text-slate-700">Current password<Input name="currentPassword" type="password" required className="mt-2" /></label><label className="text-sm font-semibold text-slate-700">New password<Input name="password" type="password" minLength={8} required className="mt-2" /></label><div className="sm:col-span-2"><Button variant="secondary">Update password</Button></div></form></section>
      </div>
    </main>
  );
}
