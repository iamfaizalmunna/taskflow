import type { HTMLAttributes } from "react";

export function Badge({
  className = "",
  tone = "slate",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: "slate" | "indigo" | "green" | "amber" | "red" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-600",
    indigo: "bg-indigo-50 text-indigo-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]} ${className}`}
      {...props}
    />
  );
}
