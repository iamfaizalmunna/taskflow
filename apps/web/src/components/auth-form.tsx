"use client";

import { CheckCircle2, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authApi } from "@/lib/api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isLogin = mode === "login";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      if (isLogin) {
        await authApi.login(String(data.get("email")), String(data.get("password")));
      } else {
        await authApi.register(String(data.get("name")), String(data.get("email")), String(data.get("password")));
      }
      router.replace("/tasks");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-2">
      <section className="hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold"><span className="grid size-9 place-items-center rounded-xl bg-indigo-500"><CheckCircle2 size={21} /></span>TaskFlow</Link>
        <div className="max-w-lg">
          <p className="mb-5 text-sm font-semibold uppercase tracking-[.2em] text-indigo-300">Less clutter. More momentum.</p>
          <h1 className="text-5xl font-semibold leading-tight tracking-tight">Turn every plan into meaningful progress.</h1>
          <p className="mt-6 text-lg leading-8 text-slate-300">A calm, structured workspace for the work that matters.</p>
        </div>
        <p className="text-sm text-slate-500">TaskFlow · Your work, in flow.</p>
      </section>
      <section className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-2 text-xl font-bold lg:hidden"><span className="grid size-9 place-items-center rounded-xl bg-indigo-600 text-white"><CheckCircle2 size={21} /></span>TaskFlow</div>
          <div className="mb-8">
            <div className="mb-4 grid size-11 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><LockKeyhole size={21} /></div>
            <h2 className="text-3xl font-bold tracking-tight">{isLogin ? "Welcome back" : "Create your account"}</h2>
            <p className="mt-2 text-slate-500">{isLogin ? "Sign in to continue to your workspace." : "Start organizing your work in minutes."}</p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            {!isLogin && <label className="block text-sm font-semibold text-slate-700">Full name<Input name="name" autoComplete="name" required className="mt-2" placeholder="Alex Morgan" /></label>}
            <label className="block text-sm font-semibold text-slate-700">Email address<Input name="email" type="email" autoComplete="email" required className="mt-2" placeholder="you@company.com" /></label>
            <label className="block text-sm font-semibold text-slate-700">Password<Input name="password" type="password" minLength={8} autoComplete={isLogin ? "current-password" : "new-password"} required className="mt-2" placeholder="At least 8 characters" /></label>
            {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <Button disabled={loading} className="w-full">{loading ? "Please wait…" : isLogin ? "Sign in" : "Create account"}</Button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-500">
            {isLogin ? "New to TaskFlow? " : "Already have an account? "}
            <Link className="font-semibold text-indigo-600 hover:text-indigo-700" href={isLogin ? "/register" : "/login"}>{isLogin ? "Create an account" : "Sign in"}</Link>
          </p>
          {isLogin && <p className="mt-8 text-center text-xs text-slate-400">Workspace administrator? <Link className="underline" href="/crm/login">CRM sign in</Link></p>}
        </div>
      </section>
    </main>
  );
}
