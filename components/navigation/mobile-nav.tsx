"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { isNavLinkActive, navLinks } from "@/lib/nav-links";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-800 bg-slate-950/95 backdrop-blur md:hidden"
    >
      <div className="grid grid-cols-4 gap-1 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        {navLinks.map(({ label, href, icon: Icon }) => {
          const active = isNavLinkActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-[11px] font-medium transition",
                active ? "bg-slate-800 text-indigo-300" : "text-slate-400 hover:bg-slate-900 hover:text-slate-100",
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.25 : 2} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
