import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Personal Assistant",
  description: "Painel pessoal com tarefas, estudos e rotina.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
