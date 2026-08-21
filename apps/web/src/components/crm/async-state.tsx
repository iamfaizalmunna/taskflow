import { AlertCircle, Inbox, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type AsyncStateProps = {
  kind: "loading" | "empty" | "error";
  title: string;
  description?: string;
  onRetry?: () => void;
};

export function AsyncState({ kind, title, description, onRetry }: AsyncStateProps) {
  const Icon = kind === "loading" ? LoaderCircle : kind === "error" ? AlertCircle : Inbox;

  return (
    <div
      className="flex min-h-40 flex-col items-center justify-center px-6 py-10 text-center"
      role={kind === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      <Icon
        className={`mb-3 size-7 ${kind === "loading" ? "animate-spin text-indigo-500" : kind === "error" ? "text-red-500" : "text-slate-400"}`}
        aria-hidden="true"
      />
      <p className="font-semibold text-slate-700">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>}
      {onRetry && <Button className="mt-4" variant="secondary" onClick={onRetry}>Try again</Button>}
    </div>
  );
}
