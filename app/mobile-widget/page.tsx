"use client";

import { useEffect } from "react";

import { WidgetTaskChecklist } from "@/components/mobile-widget/widget-task-checklist";
import { PomodoroWidgetTimer } from "@/components/pomodoro/pomodoro-widget-timer";

export default function MobileWidgetPage() {
  useEffect(() => {
    const { documentElement, body } = document;
    const previousHtmlOverflow = documentElement.style.overflow;
    const previousBodyOverflow = body.style.overflow;

    documentElement.style.overflow = "hidden";
    body.style.overflow = "hidden";

    return () => {
      documentElement.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
    };
  }, []);

  return (
    <main className="flex h-screen w-screen flex-col overflow-hidden bg-black text-slate-100">
      <section className="shrink-0 border-b border-slate-800/80 px-4 py-3">
        <PomodoroWidgetTimer />
      </section>

      <section className="flex min-h-0 flex-1 flex-col px-4 py-3">
        <WidgetTaskChecklist />
      </section>
    </main>
  );
}
