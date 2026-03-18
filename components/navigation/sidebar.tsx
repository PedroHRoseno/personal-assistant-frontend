"use client";

import { BookOpenCheck, ClipboardList, Home, KanbanSquare } from "lucide-react";
import { motion } from "framer-motion";
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
    label: "Casa",
    href: "/casa",
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

      <div className="mt-8 rounded-lg border border-slate-800 bg-slate-900/70 p-3">
        <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
          <span>XP Semanal</span>
          <span>72%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-800">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500"
            initial={{ width: "0%" }}
            animate={{ width: "72%", backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
            transition={{
              width: { duration: 0.7, ease: "easeOut" },
              backgroundPosition: { duration: 3, repeat: Infinity, ease: "linear" },
            }}
            style={{ backgroundSize: "200% 200%" }}
          />
        </div>
      </div>
    </aside>
  );
}
