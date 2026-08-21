"use client";

import { BarChart3, LockKeyhole, Shield } from "lucide-react";
import Link from "next/link";
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
    event.preventDefault();
    setLoading(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      await crmApi.login(String(data.get("username")).trim(), String(data.get("password")));
      router.replace("/crm");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh bg-slate-950 px-4 py-8 sm:px-6 sm:py-12 lg:grid lg:place-items-center lg:px-10">
      <div className="mx-auto grid w-full max-w-md gap-8 lg:max-w-4xl lg:grid-cols-2 lg:items-center lg:gap-16">
        <section className="text-center text-white lg:text-left">
          <div className="mb-6 inline-flex items-center gap-2">
            <span className="grid size-11 place-items-center rounded-2xl bg-indigo-500 text-white shadow-lg shadow-indigo-950">
              <BarChart3 size={22} />
            </span>
            <span className="text-lg font-bold">TaskFlow</span>
            <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-300">CRM</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Admin console</h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-400 lg:mx-0">
            Manage TaskFlow accounts, access, and activity. Authorized personnel only.
          </p>
          <p className="mt-6 hidden items-center gap-2 text-sm text-slate-500 lg:flex">
            <Shield size={16} className="text-indigo-400" /> Separate login from the user workspace
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl sm:p-8">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
              <LockKeyhole size={18} />
            </span>
            <div>
              <h2 className="text-xl font-bold">Sign in to CRM</h2>
            <p className="mt-1 text-sm text-slate-500">Admin username only. Users created in CRM sign in at the TaskFlow login page.</p>
            </div>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block text-sm font-semibold text-slate-700">
              Username
              <Input
                name="username"
                autoComplete="username"
                required
                autoFocus
                className="mt-2"
                placeholder="admin"
              />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Password
              <Input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="mt-2"
                placeholder="Enter your password"
              />
            </label>
            {error && (
              <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}
            <Button disabled={loading} className="h-11 w-full">
              {loading ? "Signing in…" : "Sign in to CRM"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Not an admin?{" "}
            <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-700">
              User sign in
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
