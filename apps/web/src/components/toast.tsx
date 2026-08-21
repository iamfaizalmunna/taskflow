"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type Toast = { id: number; message: string; type: "success" | "error" };
const ToastContext = createContext<(message: string, type?: Toast["type"]) => void>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toast = useCallback((message: string, type: Toast["type"] = "success") => {
    const id = Date.now();
    setToasts((items) => [...items, { id, message, type }]);
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 3500);
  }, []);
  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-5 right-5 z-[70] flex w-[min(360px,calc(100vw-40px))] flex-col gap-2" aria-live="polite">
        {toasts.map((item) => (
          <div key={item.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700 shadow-xl">
            {item.type === "success" ? <CheckCircle2 className="text-emerald-500" size={19} /> : <XCircle className="text-red-500" size={19} />}
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
