import { CheckCircle2 } from "lucide-react";

export function LoadingScreen({
  label = "Loading TaskFlow",
  dark = false,
}: {
  label?: string;
  dark?: boolean;
}) {
  return (
    <main
      className={`grid min-h-screen place-items-center ${dark ? "bg-slate-950" : "bg-slate-50"}`}
      aria-busy="true"
      aria-label={label}
    >
      <div className="flex flex-col items-center gap-4">
        <span
          className={`grid size-12 place-items-center rounded-2xl ${
            dark ? "bg-indigo-500 text-white" : "bg-indigo-600 text-white"
          }`}
        >
          <CheckCircle2 className="size-6" />
        </span>
        <span
          className={`size-7 animate-spin rounded-full border-2 border-t-transparent ${
            dark ? "border-indigo-300" : "border-indigo-600"
          }`}
        />
        <span className={`text-sm font-medium ${dark ? "text-slate-400" : "text-slate-500"}`}>
          {label}
        </span>
      </div>
    </main>
  );
}
