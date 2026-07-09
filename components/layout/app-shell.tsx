import { MobileNav } from "@/components/navigation/mobile-nav";
import { Sidebar } from "@/components/navigation/sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-950">
      <Sidebar />
      <MobileNav />
      <section className="p-4 pb-24 md:ml-72 md:p-10 md:pb-10">{children}</section>
    </main>
  );
}
