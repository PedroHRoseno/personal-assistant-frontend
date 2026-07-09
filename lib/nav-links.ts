import { BookOpenCheck, ClipboardList, Home, KanbanSquare, type LucideIcon } from "lucide-react";

export type NavLink = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const navLinks: NavLink[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "Trabalho", href: "/trabalho", icon: KanbanSquare },
  { label: "Estudos", href: "/estudos", icon: BookOpenCheck },
  { label: "Casa", href: "/pessoal/casa", icon: ClipboardList },
];

export function isNavLinkActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
