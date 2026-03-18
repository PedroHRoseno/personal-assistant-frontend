import confetti from "canvas-confetti";

type Category = "work" | "study";

const colorMap: Record<Category, string[]> = {
  work: ["#10b981", "#06b6d4", "#34d399"],
  study: ["#6366f1", "#8b5cf6", "#a78bfa"],
};

export function celebrateTaskCompletion(category: Category) {
  confetti({
    particleCount: 120,
    spread: 72,
    startVelocity: 38,
    origin: { y: 0.72 },
    colors: colorMap[category],
  });
}
