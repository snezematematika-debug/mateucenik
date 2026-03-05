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
