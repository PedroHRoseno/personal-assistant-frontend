"use client";

import { Pause, Play, RotateCcw, Timer } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getNotificationPermission,
  notifyViaServiceWorker,
  requestNotificationPermission,
} from "@/lib/notifications";
import { fetchPomodoroDailySummary, getLocalDayKey, recordPomodoroSession } from "@/lib/pomodoro";
import { cn } from "@/lib/utils";

type Phase = "focus" | "break";
type TimerStatus = "idle" | "running" | "paused";

const FOCUS_STORAGE_KEY = "pomodoro-focus-minutes";
const BREAK_STORAGE_KEY = "pomodoro-break-minutes";

function clampMinutes(value: number) {
  return Math.min(120, Math.max(1, value));
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function readStoredMinutes(key: string, fallback: number) {
  if (typeof window === "undefined") return fallback;
  const stored = Number(localStorage.getItem(key));
  return Number.isFinite(stored) && stored > 0 ? clampMinutes(stored) : fallback;
}

export function PomodoroTimer() {
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [phase, setPhase] = useState<Phase>("focus");
  const [status, setStatus] = useState<TimerStatus>("idle");
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [sessionsToday, setSessionsToday] = useState(0);
  const [totalFocusMinutes, setTotalFocusMinutes] = useState(0);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [permissionHint, setPermissionHint] = useState<string | null>(null);

  const endAtRef = useRef<number | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSeconds = (phase === "focus" ? focusMinutes : breakMinutes) * 60;
  const progress = totalSeconds > 0 ? 1 - secondsLeft / totalSeconds : 0;

  const clearTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const loadDailySummary = useCallback(async () => {
    try {
      const summary = await fetchPomodoroDailySummary();
      setSessionsToday(summary.count);
      setTotalFocusMinutes(summary.total_focus_minutes);
      setSyncError(null);
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "Falha ao carregar progresso do dia.");
    }
  }, []);

  const resetToPhase = useCallback(
    (nextPhase: Phase, nextStatus: TimerStatus = "idle") => {
      clearTick();
      endAtRef.current = null;
      setPhase(nextPhase);
      setStatus(nextStatus);
      setSecondsLeft((nextPhase === "focus" ? focusMinutes : breakMinutes) * 60);
    },
    [breakMinutes, clearTick, focusMinutes],
  );

  const handlePhaseComplete = useCallback(async () => {
    clearTick();
    endAtRef.current = null;
    setStatus("idle");

    if (phase === "focus") {
      try {
        const session = await recordPomodoroSession({
          focus_minutes: focusMinutes,
          break_minutes: breakMinutes,
          day: getLocalDayKey(),
        });
        setSessionsToday((current) => current + 1);
        setTotalFocusMinutes((current) => current + session.focus_minutes);
        setSyncError(null);
      } catch (error) {
        setSyncError(error instanceof Error ? error.message : "Falha ao salvar pomodoro concluído.");
      }

      await notifyViaServiceWorker("Tempo de foco concluído!", {
        body: "Hora do descanso. Respire e relaxe por alguns minutos.",
        tag: "pomodoro-focus-done",
      });

      const breakTotal = breakMinutes * 60;
      setPhase("break");
      setSecondsLeft(breakTotal);
      setStatus("running");
      endAtRef.current = Date.now() + breakTotal * 1000;
      return;
    }

    await notifyViaServiceWorker("Descanso concluído!", {
      body: "Pronto para mais um ciclo de foco?",
      tag: "pomodoro-break-done",
    });

    const focusTotal = focusMinutes * 60;
    setPhase("focus");
    setSecondsLeft(focusTotal);
  }, [breakMinutes, clearTick, focusMinutes, phase]);

  const startTick = useCallback(() => {
    clearTick();
    tickRef.current = setInterval(() => {
      if (!endAtRef.current) return;
      const remaining = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        void handlePhaseComplete();
      }
    }, 250);
  }, [clearTick, handlePhaseComplete]);

  useEffect(() => {
    setFocusMinutes(readStoredMinutes(FOCUS_STORAGE_KEY, 25));
    setBreakMinutes(readStoredMinutes(BREAK_STORAGE_KEY, 5));
    void loadDailySummary();
  }, [loadDailySummary]);

  useEffect(() => {
    if (status !== "running") {
      clearTick();
      return;
    }
    startTick();
    return clearTick;
  }, [clearTick, startTick, status]);

  useEffect(() => {
    if (status === "idle") {
      setSecondsLeft((phase === "focus" ? focusMinutes : breakMinutes) * 60);
    }
  }, [breakMinutes, focusMinutes, phase, status]);

  const handleStart = async () => {
    const permission = getNotificationPermission();
    if (permission === "default") {
      const result = await requestNotificationPermission();
      if (result === "denied") {
        setPermissionHint("Notificações bloqueadas. O timer funciona, mas você não será avisado ao terminar.");
      } else {
        setPermissionHint(null);
      }
    }

    const remaining = status === "paused" ? secondsLeft : (phase === "focus" ? focusMinutes : breakMinutes) * 60;
    setSecondsLeft(remaining);
    endAtRef.current = Date.now() + remaining * 1000;
    setStatus("running");
  };

  const handlePause = () => {
    if (!endAtRef.current) return;
    const remaining = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000));
    setSecondsLeft(remaining);
    endAtRef.current = null;
    setStatus("paused");
  };

  const handleReset = () => {
    resetToPhase(phase, "idle");
    setPermissionHint(null);
  };

  const handleFocusMinutesChange = (value: number) => {
    const next = clampMinutes(value);
    setFocusMinutes(next);
    localStorage.setItem(FOCUS_STORAGE_KEY, String(next));
    if (phase === "focus" && status === "idle") {
      setSecondsLeft(next * 60);
    }
  };

  const handleBreakMinutesChange = (value: number) => {
    const next = clampMinutes(value);
    setBreakMinutes(next);
    localStorage.setItem(BREAK_STORAGE_KEY, String(next));
    if (phase === "break" && status === "idle") {
      setSecondsLeft(next * 60);
    }
  };

  const isRunning = status === "running";
  const inputsDisabled = isRunning || status === "paused";

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Timer size={18} className="text-indigo-400" />
              Pomodoro
            </CardTitle>
            <CardDescription className="mt-1">
              {phase === "focus" ? "Modo foco" : "Modo descanso"}
              {totalFocusMinutes > 0 ? ` · ${totalFocusMinutes} min focados hoje` : ""}
            </CardDescription>
          </div>
          <span className="rounded-full border border-indigo-700/50 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-300">
            {sessionsToday} hoje
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="relative mx-auto flex h-40 w-40 items-center justify-center">
          <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="rgb(30 41 59)" strokeWidth="8" />
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke={phase === "focus" ? "rgb(99 102 241)" : "rgb(52 211 153)"}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 52}
              strokeDashoffset={2 * Math.PI * 52 * (1 - progress)}
              className="transition-[stroke-dashoffset] duration-300"
            />
          </svg>
          <div className="text-center">
            <p className="font-mono text-4xl font-bold tracking-tight text-slate-100">{formatTime(secondsLeft)}</p>
            <p
              className={cn(
                "mt-1 text-xs font-medium uppercase tracking-wider",
                phase === "focus" ? "text-indigo-400" : "text-emerald-400",
              )}
            >
              {phase === "focus" ? "Foco" : "Pausa"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1 text-xs text-slate-400">
            Foco (min)
            <input
              type="number"
              min={1}
              max={120}
              value={focusMinutes}
              disabled={inputsDisabled}
              onChange={(event) => handleFocusMinutesChange(Number(event.target.value))}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-indigo-500 disabled:opacity-50"
            />
          </label>
          <label className="space-y-1 text-xs text-slate-400">
            Descanso (min)
            <input
              type="number"
              min={1}
              max={120}
              value={breakMinutes}
              disabled={inputsDisabled}
              onChange={(event) => handleBreakMinutesChange(Number(event.target.value))}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-indigo-500 disabled:opacity-50"
            />
          </label>
        </div>

        <div className="flex gap-2">
          {isRunning ? (
            <Button className="flex-1" variant="outline" onClick={handlePause}>
              <Pause size={16} />
              Pausar
            </Button>
          ) : (
            <Button className="flex-1" onClick={() => void handleStart()}>
              <Play size={16} />
              {status === "paused" ? "Retomar" : "Iniciar"}
            </Button>
          )}
          <Button variant="outline" onClick={handleReset} aria-label="Resetar timer">
            <RotateCcw size={16} />
          </Button>
        </div>

        {permissionHint ? <p className="text-xs text-amber-400">{permissionHint}</p> : null}
        {syncError ? <p className="text-xs text-rose-400">{syncError}</p> : null}
      </CardContent>
    </Card>
  );
}
