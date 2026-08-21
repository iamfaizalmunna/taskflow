"use client";

import { Bell, Calendar, Check, ChevronDown, Folder, FolderPlus, GripVertical, ListFilter, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent } from "react";
import { tasksApi } from "@/lib/api";
import type { Group, Priority, Task, TaskInput } from "@/lib/types";
import { useGroups } from "./groups-context";
import { useToast } from "./toast";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { Input } from "./ui/input";

type Tab = "all" | "active" | "completed";
const emptyTask: TaskInput = { title: "", description: "", priority: "medium", groupId: null, dueDate: null, reminderAt: null };

export function TaskWorkspace() {
  const params = useSearchParams();
  const toast = useToast();
  const { groups, createGroup } = useGroups();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [sort, setSort] = useState("position");
  const [quickTitle, setQuickTitle] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [draft, setDraft] = useState<TaskInput>(emptyTask);
  const [saving, setSaving] = useState(false);
  const [dragged, setDragged] = useState<string | null>(null);

  const [firedReminders, setFiredReminders] = useState<string[]>([]);

  useEffect(() => {
    tasksApi.list()
      .then(setTasks)
      .catch((error) => toast(error instanceof Error ? error.message : "Could not load tasks", "error"))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => {
    function checkReminders() {
      const now = Date.now();
      tasks.forEach((task) => {
        if (!task.reminderAt || task.completed || firedReminders.includes(task.id)) return;
        if (new Date(task.reminderAt).getTime() <= now) {
          setFiredReminders((ids) => [...ids, task.id]);
          toast(`Reminder: ${task.title}`);
        }
      });
    }
    checkReminders();
    const timer = window.setInterval(checkReminders, 30000);
    return () => window.clearInterval(timer);
  }, [tasks, firedReminders, toast]);

  const filtered = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const view = params.get("view");
    const group = params.get("group");
    const result = tasks.filter((task) => {
      const taskGroupId = task.groupId ?? task.group?.id ?? null;
      if (query && !`${task.title} ${task.description ?? ""}`.toLowerCase().includes(query.toLowerCase())) return false;
      if (tab === "active" && task.completed) return false;
      if (tab === "completed" && !task.completed) return false;
      if (group === "none" && taskGroupId) return false;
      if (group && group !== "none" && taskGroupId !== group) return false;
      if (view === "today" && task.dueDate?.slice(0, 10) !== today) return false;
      if (view === "overdue" && (!task.dueDate || task.dueDate.slice(0, 10) >= today || task.completed)) return false;
      return true;
    });
    return [...result].sort((a, b) => {
      if (sort === "due") return (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999");
      if (sort === "priority") return ({ high: 0, medium: 1, low: 2 }[a.priority] - { high: 0, medium: 1, low: 2 }[b.priority]);
      if (sort === "newest") return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
      return (a.position ?? a.order ?? 0) - (b.position ?? b.order ?? 0);
    });
  }, [tasks, query, tab, sort, params]);

  const activeGroupId = params.get("group") && params.get("group") !== "none" ? params.get("group") : null;
  const heading = params.get("group") === "none"
    ? "Ungrouped"
    : activeGroupId
      ? groups.find((group) => group.id === activeGroupId)?.name ?? "Group"
      : params.get("view") === "today" ? "Today" : params.get("view") === "overdue" ? "Overdue" : "All tasks";

  async function quickAdd(event: FormEvent) {
    event.preventDefault();
    if (!quickTitle.trim()) return;
    const title = quickTitle.trim();
    setQuickTitle("");
    try {
      const task = await tasksApi.create({ ...emptyTask, title, groupId: activeGroupId });
      setTasks((items) => [...items, task]);
      toast("Task added");
    } catch (error) {
      setQuickTitle(title);
      toast(error instanceof Error ? error.message : "Could not add task", "error");
    }
  }

  function openTask(task?: Task) {
    setEditing(task ?? null);
    setDraft(task ? {
      title: task.title, description: task.description ?? "", priority: task.priority,
      groupId: task.groupId ?? task.group?.id ?? null, dueDate: task.dueDate?.slice(0, 10) ?? null,
      reminderAt: task.reminderAt ? task.reminderAt.slice(0, 16) : null,
    } : { ...emptyTask, groupId: activeGroupId });
    setDialogOpen(true);
  }

  async function saveTask(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const result = editing ? await tasksApi.update(editing.id, draft) : await tasksApi.create(draft);
      setTasks((items) => editing ? items.map((item) => item.id === result.id ? result : item) : [...items, result]);
      setDialogOpen(false);
      toast(editing ? "Task updated" : "Task created");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not save task", "error");
    } finally { setSaving(false); }
  }

  async function toggle(task: Task) {
    const completed = !task.completed;
    setTasks((items) => items.map((item) => item.id === task.id ? { ...item, completed } : item));
    try { await tasksApi.update(task.id, { completed }); }
    catch (error) {
      setTasks((items) => items.map((item) => item.id === task.id ? task : item));
      toast(error instanceof Error ? error.message : "Could not update task", "error");
    }
  }

  async function moveToGroup(task: Task, groupId: string | null) {
    const previous = tasks;
    const group = groupId ? groups.find((item) => item.id === groupId) : undefined;
    setTasks((items) => items.map((item) => (item.id === task.id ? { ...item, groupId, group } : item)));
    try {
      const updated = await tasksApi.update(task.id, { groupId });
      setTasks((items) => items.map((item) => (item.id === task.id ? updated : item)));
      toast(group ? `Moved to “${group.name}”` : "Removed from group");
    } catch (error) {
      setTasks(previous);
      toast(error instanceof Error ? error.message : "Could not move task", "error");
    }
  }

  async function remove(task: Task) {
    if (!window.confirm(`Delete “${task.title}”?`)) return;
    const previous = tasks;
    setTasks((items) => items.filter((item) => item.id !== task.id));
    try { await tasksApi.remove(task.id); toast("Task deleted"); }
    catch (error) { setTasks(previous); toast(error instanceof Error ? error.message : "Could not delete task", "error"); }
  }

  async function drop(event: DragEvent, targetId: string) {
    event.preventDefault();
    if (!dragged || dragged === targetId) return;
    const next = [...tasks];
    const from = next.findIndex((task) => task.id === dragged);
    const to = next.findIndex((task) => task.id === targetId);
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setTasks(next);
    setDragged(null);
    try { await tasksApi.reorder(next.map((task) => task.id)); }
    catch (error) { toast(error instanceof Error ? error.message : "Could not save order", "error"); }
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-5 pb-16 pt-20 sm:px-8 lg:px-12 lg:pt-10">
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div><p className="text-sm font-semibold text-indigo-600">My workspace</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{heading}</h1><p className="mt-2 text-sm text-slate-500">{filtered.length} {filtered.length === 1 ? "task" : "tasks"} in this view</p></div>
        <Button onClick={() => openTask()}><Plus size={18} />New task</Button>
      </header>
      <div className="mt-8 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center">
        <label className="relative flex-1"><span className="sr-only">Search tasks</span><Search className="absolute left-3 top-2.5 text-slate-400" size={18} /><Input value={query} onChange={(e) => setQuery(e.target.value)} className="border-0 pl-10 shadow-none focus:ring-0" placeholder="Search tasks…" /></label>
        <div className="relative"><ListFilter className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={17} /><select aria-label="Sort tasks" value={sort} onChange={(e) => setSort(e.target.value)} className="h-10 appearance-none rounded-lg border border-slate-200 bg-white pl-9 pr-9 text-sm text-slate-600"><option value="position">Manual order</option><option value="due">Due date</option><option value="priority">Priority</option><option value="newest">Newest</option></select><ChevronDown className="pointer-events-none absolute right-3 top-3 text-slate-400" size={15} /></div>
      </div>
      <div className="mt-6 flex border-b border-slate-200">{(["all", "active", "completed"] as Tab[]).map((item) => <button key={item} onClick={() => setTab(item)} className={`border-b-2 px-4 py-3 text-sm font-semibold capitalize ${tab === item ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-400 hover:text-slate-700"}`}>{item}</button>)}</div>
      <form onSubmit={quickAdd} className="mt-5 flex items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white p-3 transition focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-50">
        <Plus className="ml-1 text-indigo-500" size={19} /><input value={quickTitle} onChange={(e) => setQuickTitle(e.target.value)} className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400" placeholder="Add a task and press Enter…" aria-label="Quick add task" /><Button type="submit" variant="ghost" className="h-8 px-3">Add</Button>
      </form>
      <section className="mt-4 space-y-2" aria-label="Tasks">
        {loading ? [1, 2, 3, 4].map((item) => <div key={item} className="skeleton h-20 rounded-xl" />) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center"><span className="mx-auto grid size-12 place-items-center rounded-full bg-indigo-50 text-indigo-600"><Check size={22} /></span><h2 className="mt-4 font-bold">You&apos;re all caught up</h2><p className="mt-1 text-sm text-slate-500">Add a task to start building momentum.</p></div>
        ) : filtered.map((task) => (
          <article key={task.id} draggable onDragStart={() => setDragged(task.id)} onDragEnd={() => setDragged(null)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => drop(event, task.id)} className={`group flex items-start gap-2 rounded-xl border bg-white p-3 shadow-sm transition hover:border-indigo-200 hover:shadow-md sm:items-center sm:gap-3 ${dragged === task.id ? "opacity-40" : "border-slate-200"}`}>
            <GripVertical className="mt-1 shrink-0 text-slate-300 sm:mt-0" size={18} aria-label="Drag to reorder" />
            <button onClick={() => toggle(task)} className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition sm:mt-0 ${task.completed ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 hover:border-indigo-500"}`} aria-label={task.completed ? `Mark ${task.title} active` : `Complete ${task.title}`}>{task.completed && <Check size={14} strokeWidth={3} />}</button>
            <div className="min-w-0 flex-1">
              <button onClick={() => openTask(task)} className="block w-full text-left">
                <span className={`block truncate text-sm font-semibold ${task.completed ? "text-slate-400 line-through" : "text-slate-800"}`}>{task.title}</span>
              </button>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <GroupPicker task={task} onSelect={(groupId) => moveToGroup(task, groupId)} onCreate={createGroup} />
                {task.dueDate && <span className="flex items-center gap-1"><Calendar size={13} />{new Date(task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>}
                {task.reminderAt && <Bell size={13} aria-label="Reminder set" />}
              </div>
            </div>
            <Badge tone={task.priority === "high" ? "red" : task.priority === "medium" ? "amber" : "slate"}>{task.priority}</Badge>
            <div className="hidden items-center gap-1 group-hover:flex">
              <button onClick={() => openTask(task)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-indigo-600" aria-label={`Edit ${task.title}`}><Pencil size={16} /></button>
              <button onClick={() => remove(task)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label={`Delete ${task.title}`}><Trash2 size={16} /></button>
            </div>
          </article>
        ))}
      </section>
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title={editing ? "Edit task" : "Create a task"} description="Add the details you need to stay on track.">
        <form onSubmit={saveTask} className="space-y-4">
          <label className="block text-sm font-semibold text-slate-700">Title<Input autoFocus required value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="mt-2" placeholder="What needs to be done?" /></label>
          <label className="block text-sm font-semibold text-slate-700">Description<textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={3} className="mt-2 w-full resize-none rounded-lg border border-slate-200 p-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="Add notes or context…" /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">Group<select value={draft.groupId ?? ""} onChange={(e) => setDraft({ ...draft, groupId: e.target.value || null })} className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="">No group</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select><span className="mt-1 block text-xs font-normal text-slate-400">Create groups from the sidebar.</span></label>
            <label className="text-sm font-semibold text-slate-700">Priority<select value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value as Priority })} className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
            <label className="text-sm font-semibold text-slate-700">Due date<Input type="date" value={draft.dueDate ?? ""} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value || null })} className="mt-2" /></label>
            <label className="text-sm font-semibold text-slate-700">Reminder<Input type="datetime-local" value={draft.reminderAt ?? ""} onChange={(e) => setDraft({ ...draft, reminderAt: e.target.value || null })} className="mt-2" /></label>
          </div>
          {draft.reminderAt && <button type="button" onClick={() => setDraft({ ...draft, reminderAt: null })} className="text-sm font-semibold text-red-600 hover:text-red-700">Remove reminder</button>}
          <div className="flex justify-end gap-3 pt-2"><Button type="button" variant="secondary" onClick={() => setDialogOpen(false)}>Cancel</Button><Button disabled={saving}>{saving ? "Saving…" : "Save task"}</Button></div>
        </form>
      </Dialog>
    </main>
  );
}

function GroupPicker({
  task,
  onSelect,
  onCreate,
}: {
  task: Task;
  onSelect: (groupId: string | null) => void;
  onCreate: (name: string) => Promise<Group | null>;
}) {
  const { groups } = useGroups();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const container = useRef<HTMLDivElement>(null);
  const currentId = task.groupId ?? task.group?.id ?? null;
  const current = groups.find((group) => group.id === currentId);

  useEffect(() => {
    if (!open) return;
    function handleClick(event: MouseEvent) {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  async function submitNew(event: FormEvent) {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setNewName("");
    const group = await onCreate(name);
    setOpen(false);
    if (group) onSelect(group.id);
  }

  return (
    <div ref={container} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition ${current ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100" : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"}`}
      >
        {current ? <Folder size={12} /> : <FolderPlus size={12} />}
        {current ? current.name : "Add to group"}
      </button>
      {open && (
        <div role="menu" draggable={false} onDragStart={(event) => event.preventDefault()} className="absolute left-0 top-7 z-20 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
          {groups.map((group) => (
            <button
              key={group.id}
              type="button"
              role="menuitem"
              onClick={() => { setOpen(false); if (group.id !== currentId) onSelect(group.id); }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              <Folder size={14} className="shrink-0 text-slate-400" />
              <span className="min-w-0 flex-1 truncate">{group.name}</span>
              {group.id === currentId && <Check size={14} className="text-indigo-600" />}
            </button>
          ))}
          {current && (
            <button
              type="button"
              role="menuitem"
              onClick={() => { setOpen(false); onSelect(null); }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            >
              <Trash2 size={14} />Remove from group
            </button>
          )}
          <form onSubmit={submitNew} className="mt-1 flex items-center gap-1 border-t border-slate-100 pt-1.5">
            <Input
              draggable={false}
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="New group…"
              aria-label="New group name"
              className="h-8 border-0 text-sm shadow-none focus:ring-0"
            />
            <button type="submit" className="rounded-lg p-1.5 text-indigo-600 hover:bg-indigo-50" aria-label="Create group and move task"><Plus size={15} /></button>
          </form>
        </div>
      )}
    </div>
  );
}
