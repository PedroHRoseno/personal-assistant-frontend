"use client";

import { BookOpenCheck, ClipboardList, Home, KanbanSquare } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  {
    label: "Home",
    href: "/",
    icon: Home,
  },
  {
    label: "Trabalho",
    href: "/trabalho",
    icon: KanbanSquare,
  },
  {
    label: "Estudos",
    href: "/estudos",
    icon: BookOpenCheck,
  },
  {
    label: "Pessoal/Casa",
    href: "/pessoal/casa",
    icon: ClipboardList,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-slate-800 bg-slate-950/95 p-6 backdrop-blur md:block">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-slate-500">Productivity OS</p>
        <h1 className="mt-1 text-xl font-bold text-slate-100">Central de Navegação</h1>
      </div>

      <nav className="space-y-2">
        {links.map(({ label, href, icon: Icon }) => (
          <Link
            key={label}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
              pathname === href || pathname.startsWith(`${href}/`)
                ? "bg-slate-800 text-slate-100"
                : "text-slate-400 hover:bg-slate-900 hover:text-slate-100",
            )}
          >
            <Icon size={18} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
