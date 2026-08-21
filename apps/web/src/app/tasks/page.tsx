import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { TaskWorkspace } from "@/components/task-workspace";

export default function TasksPage() {
  return <Suspense fallback={<div className="min-h-screen bg-slate-50" />}><AppShell><TaskWorkspace /></AppShell></Suspense>;
}
