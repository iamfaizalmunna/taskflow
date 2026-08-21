"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    authApi.me().then(() => router.replace("/tasks")).catch(() => router.replace("/login"));
  }, [router]);
  return <main className="grid min-h-screen place-items-center bg-slate-50"><div className="size-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" aria-label="Checking session" /></main>;
}
