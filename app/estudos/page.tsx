"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import type { Course } from "@/lib/types";

export default function EstudosPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadCourses() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Course[]>("/courses");
      setCourses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar cursos.");
    } finally {
      setLoading(false);
    }
  }

  async function createCourse() {
    if (!title.trim()) {
      return;
    }

    try {
      const created = await apiFetch<Course>("/courses", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
        }),
      });
      setCourses((prev) => [created, ...prev]);
      setTitle("");
      setDescription("");
      setShowModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar curso.");
    }
  }

  useEffect(() => {
    loadCourses();
  }, []);

  return (
    <AppShell>
      <header className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 md:text-3xl">Gerenciamento de Cursos</h1>
          <p className="mt-2 text-sm text-slate-400">Galeria de cards dos seus cursos.</p>
        </div>
        <Button onClick={() => setShowModal(true)}>Adicionar Novo Curso</Button>
      </header>

      {error ? <p className="mb-4 text-sm text-rose-400">{error}</p> : null}
      {loading ? <p className="text-sm text-slate-400">Carregando cursos...</p> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {courses.map((course) => (
          <Link key={course.id} href={`/estudos/${course.id}`}>
            <Card className="h-full transition hover:-translate-y-0.5 hover:shadow-md">
              <CardHeader>
                <CardTitle>{course.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-slate-400">
                <p>{course.description || "Sem descrição cadastrada."}</p>
                <p>{course.pinned_links.length} link(s) fixado(s)</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Adicionar Novo Curso</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <input
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                placeholder="Título"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
              <textarea
                className="h-24 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                placeholder="Descrição"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowModal(false)}>
                  Cancelar
                </Button>
                <Button onClick={createCourse}>Criar</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </AppShell>
  );
}
