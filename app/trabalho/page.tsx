"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BriefcaseBusiness, Factory, ShieldCheck } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import type { WorkHub } from "@/lib/types";

const iconMap = [BriefcaseBusiness, Factory, ShieldCheck];

export default function TrabalhoPage() {
  const [hubs, setHubs] = useState<WorkHub[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadHubs() {
      try {
        const data = await apiFetch<WorkHub[]>("/work-hubs");
        setHubs(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao carregar hubs de trabalho.");
      }
    }
    loadHubs();
  }, []);

  return (
    <AppShell>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100 md:text-3xl">Hubs de Trabalho</h1>
        <p className="mt-2 text-sm text-slate-400">Escolha um contexto para abrir o hub operacional.</p>
      </header>

      {error ? <p className="mb-4 text-sm text-rose-400">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {hubs.map((hub, index) => {
          const Icon = iconMap[index] ?? BriefcaseBusiness;
          return (
            <Link key={hub.id} href={`/trabalho/${hub.id}`}>
              <Card className="h-full transition hover:-translate-y-0.5 hover:shadow-md">
                <CardHeader>
                  <div className="mb-2 inline-flex w-fit rounded-md border border-slate-700 p-2 text-slate-300">
                    <Icon size={18} />
                  </div>
                  <CardTitle>{hub.name}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-slate-400">
                  {hub.description || "Sem descrição cadastrada."}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}
