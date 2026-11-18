import { useState, useCallback } from "react";

type ToastVariant = "default" | "destructive";

interface Toast {
  id: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  variant?: ToastVariant;
}

let toastCount = 0;

const listeners: Array<(toasts: Toast[]) => void> = [];
let memoryState: Toast[] = [];

function dispatch(toasts: Toast[]) {
  memoryState = toasts;
  listeners.forEach((listener) => listener(toasts));
}

export function toast(props: Omit<Toast, "id">) {
  const id = String(toastCount++);
  const newToast = { ...props, id };
  dispatch([...memoryState, newToast]);
  setTimeout(() => {
    dispatch(memoryState.filter((t) => t.id !== id));
  }, 5000);
  return id;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>(memoryState);

  useCallback(() => {
    listeners.push(setToasts);
    return () => {
      const index = listeners.indexOf(setToasts);
      if (index > -1) listeners.splice(index, 1);
    };
  }, [])();

  return { toasts, toast };
}
