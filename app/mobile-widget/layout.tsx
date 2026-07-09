import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Widget",
  description: "Widget de foco e tarefas para a tela inicial.",
};

export const viewport: Viewport = {
  themeColor: "#020617",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function MobileWidgetLayout({ children }: { children: React.ReactNode }) {
  return <div className="h-screen w-screen overflow-hidden bg-black">{children}</div>;
}
