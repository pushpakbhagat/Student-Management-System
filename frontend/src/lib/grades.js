// Same rules as the server (backend/services/grades.js): weighted average of the
// assessments a student has a score for; A ≥ 90, B ≥ 80, C ≥ 70, D ≥ 60, else F.
export const KINDS = ["quiz", "assignment", "midterm", "final", "project", "other"];

const LETTERS = [
  { min: 90, letter: "A", points: 4 },
  { min: 80, letter: "B", points: 3 },
  { min: 70, letter: "C", points: 2 },
  { min: 60, letter: "D", points: 1 },
  { min: 0, letter: "F", points: 0 },
];

export function letterFor(percent) {
  return LETTERS.find((l) => percent >= l.min);
}

// assessments: [{ maxScore, weight, score }] with score = number | null
export function computeGrade(items) {
  let weighted = 0;
  let weightTotal = 0;
  for (const a of items) {
    if (a.score === null || a.score === undefined || a.score === "") continue;
    const w = a.weight > 0 ? a.weight : 0;
    weighted += w * Math.min(Number(a.score) / a.maxScore, 1);
    weightTotal += w;
  }
  if (!weightTotal) return null;
  const percent = Math.round((weighted / weightTotal) * 1000) / 10;
  return { percent, ...letterFor(percent) };
}

// colour for a letter grade
export function gradeTone(letter) {
  if (letter === "A" || letter === "B") return "good";
  if (letter === "C") return "warn";
  if (!letter) return "neutral";
  return "bad";
}
