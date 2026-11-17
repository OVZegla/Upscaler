import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { useToast } from "@/components/ui/use-toast";
import { useState } from "react";

export function Toaster() {
  const { toasts } = useToast();
  const [copied, setCopied] = useState<string | null>(null);

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid min-w-0 gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
              {/* A message nobody can copy is a message nobody can report. */}
              {typeof description === "string" && description.length > 60 && (
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(description);
                    setCopied(id);
                    setTimeout(() => setCopied(null), 1600);
                  }}
                  className="mt-1 self-start rounded border px-2 py-1 text-xs font-semibold opacity-80 hover:opacity-100"
                >
                  {copied === id ? "Copié" : "Copier le message"}
                </button>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
