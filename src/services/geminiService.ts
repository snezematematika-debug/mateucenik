export interface MathProblem {
  question: string;
  answer: string;
  options?: string[];
  explanation?: string;
}

export async function generateMathProblems(
  grade: string,
  topic: string,
  content: string,
  count: number = 5,
  customApiKey?: string | null
): Promise<MathProblem[]> {
  const response = await fetch("/api/problems", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grade,
      topic,
      content,
      count,
      customApiKey,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to fetch problems");
  }

  return response.json();
}

export async function getUserProgress(username: string) {
  const response = await fetch(`/api/user/${username}`);
  if (!response.ok) throw new Error("Failed to fetch user progress");
  return response.json();
}

export async function saveUserProgress(username: string, xp: number, total_score: number, level: number) {
  const response = await fetch("/api/user/progress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, xp, total_score, level }),
  });
  if (!response.ok) throw new Error("Failed to save progress");
  return response.json();
}

export async function getLeaderboard() {
  const response = await fetch("/api/leaderboard");
  if (!response.ok) throw new Error("Failed to fetch leaderboard");
  return response.json();
}

export async function saveGameHistory(data: {
  username: string;
  game_type: string;
  score: number;
  xp_gained: number;
  grade: string;
  topic: string;
  content: string;
}) {
  const response = await fetch("/api/history", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to save history");
  return response.json();
}

export async function getUserHistory(username: string) {
  const response = await fetch(`/api/history/${username}`);
  if (!response.ok) throw new Error("Failed to fetch history");
  return response.json();
}
