import { forwardRef, type InputHTMLAttributes } from "react";

type Tone = "light" | "dark";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { tone?: Tone }>(
  function Input({ className = "", tone = "light", ...props }, ref) {
    const tones: Record<Tone, string> = {
      light:
        "border-slate-200 bg-white text-slate-900 caret-slate-900 placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-500 focus:ring-indigo-100",
      dark:
        "border-slate-600 bg-slate-950 text-slate-50 caret-white placeholder:text-slate-400 hover:border-slate-500 focus:border-indigo-400 focus:ring-indigo-500/25 [&:-webkit-autofill]:[-webkit-text-fill-color:#f8fafc] [&:-webkit-autofill]:[box-shadow:inset_0_0_0_1000px_#020617]",
    };
    return (
      <input
        ref={ref}
        className={`h-11 w-full rounded-lg border px-3 text-sm shadow-sm transition focus:ring-2 ${tones[tone]} ${className}`}
        {...props}
      />
    );
  },
);
