import { Sidebar } from "@/components/navigation/sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-950">
      <Sidebar />
      <section className="p-6 md:ml-72 md:p-10">{children}</section>
    </main>
  );
}
