"use client";

import { Plus } from "lucide-react";

export function Fab({
  onClick,
  label = "Add",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-neutral-900 text-white shadow-lg shadow-neutral-900/20 transition active:scale-95 sm:bottom-8 sm:right-8"
    >
      <Plus className="h-6 w-6" />
    </button>
  );
}
