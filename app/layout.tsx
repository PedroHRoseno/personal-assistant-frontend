import type { Metadata, Viewport } from "next";

import { PwaProvider } from "@/components/pwa/pwa-provider";

import "./globals.css";

const APP_NAME = "Personal Assistant";
const APP_DEFAULT_TITLE = "Personal Assistant";
const APP_TITLE_TEMPLATE = "%s | Personal Assistant";
const APP_DESCRIPTION = "Painel pessoal com tarefas, estudos, rotina e foco.";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE,
  },
  description: APP_DESCRIPTION,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_DEFAULT_TITLE,
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <PwaProvider>{children}</PwaProvider>
      </body>
    </html>
  );
}
