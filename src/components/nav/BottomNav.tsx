"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);

  const primary = NAV_ITEMS.filter((i) => i.primary);
  const secondary = NAV_ITEMS.filter((i) => !i.primary);
  const moreActive = secondary.some((item) => isActive(pathname, item.href));

  return (
    <>
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/90 backdrop-blur-md sm:hidden">
        <ul className="flex items-stretch justify-around">
          {primary.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition",
                    active ? "text-neutral-900" : "text-neutral-400",
                  )}
                >
                  <Icon
                    className="h-5 w-5"
                    strokeWidth={active ? 2.4 : 1.8}
                  />
                  {item.label}
                </Link>
              </li>
            );
          })}
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={cn(
                "flex w-full flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition",
                moreActive ? "text-neutral-900" : "text-neutral-400",
              )}
              aria-label="More sections"
            >
              <Menu
                className="h-5 w-5"
                strokeWidth={moreActive ? 2.4 : 1.8}
              />
              More
            </button>
          </li>
        </ul>
      </nav>

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="More">
        <ul className="space-y-1">
          {secondary.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <button
                  type="button"
                  onClick={() => {
                    setMoreOpen(false);
                    router.push(item.href);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition",
                    active
                      ? "bg-neutral-100 text-neutral-900"
                      : "text-neutral-600 hover:bg-neutral-50",
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </Modal>
    </>
  );
}
