"use client";

import { BarChart3, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { crmApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function CrmLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    const data = new FormData(event.currentTarget);
    try { await crmApi.login(String(data.get("username")), String(data.get("password"))); router.replace("/crm"); }
    catch (err) { setError(err instanceof Error ? err.message : "Sign in failed"); }
    finally { setLoading(false); }
  }
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 p-5">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center"><span className="grid size-12 place-items-center rounded-2xl bg-indigo-500 text-white shadow-lg shadow-indigo-950"><BarChart3 /></span></div>
        <section className="rounded-2xl border border-slate-700 bg-slate-900 p-7 text-white shadow-2xl sm:p-9">
          <div className="flex items-center gap-3"><LockKeyhole className="text-indigo-400" size={21} /><div><h1 className="text-xl font-bold">TaskFlow CRM</h1><p className="mt-1 text-sm text-slate-400">Authorized personnel only</p></div></div>
          <form onSubmit={submit} className="mt-8 space-y-4">
            <label className="block text-sm font-semibold text-slate-300">Username<Input name="username" autoComplete="username" required className="mt-2 border-slate-700 bg-slate-800 text-white placeholder:text-slate-500" /></label>
            <label className="block text-sm font-semibold text-slate-300">Password<Input name="password" type="password" autoComplete="current-password" required className="mt-2 border-slate-700 bg-slate-800 text-white" /></label>
            {error && <p role="alert" className="rounded-lg bg-red-950/50 p-3 text-sm text-red-300">{error}</p>}
            <Button disabled={loading} className="w-full">{loading ? "Signing in…" : "Sign in to CRM"}</Button>
          </form>
        </section>
      </div>
    </main>
  );
}
