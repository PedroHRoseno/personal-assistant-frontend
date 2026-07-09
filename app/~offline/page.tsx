export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-center text-slate-200">
      <div>
        <h1 className="text-2xl font-bold">Você está offline</h1>
        <p className="mt-2 text-sm text-slate-400">
          O Personal Assistant não conseguiu carregar esta página. Verifique sua conexão e tente novamente.
        </p>
      </div>
    </main>
  );
}
