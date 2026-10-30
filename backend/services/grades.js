// Course grade = weighted average of the assessments the student has a score for.
// Weights are normalised over those assessments, so an ungraded final doesn't drag the grade down.
const LETTERS = [
    { min: 90, letter: "A", points: 4 },
    { min: 80, letter: "B", points: 3 },
    { min: 70, letter: "C", points: 2 },
    { min: 60, letter: "D", points: 1 },
    { min: 0, letter: "F", points: 0 },
]

function letterFor(percent) {
    return LETTERS.find(l => percent >= l.min)
}

function scoreOf(assessment, studentId) {
    return assessment.scores.find(s => String(s.student) === String(studentId))?.score
}

function computeGrade(assessments, studentId) {
    let weighted = 0
    let weightTotal = 0
    for (const a of assessments) {
        const score = scoreOf(a, studentId)
        if (score === undefined) continue
        const w = a.weight > 0 ? a.weight : 0
        weighted += w * Math.min(score / a.maxScore, 1)
        weightTotal += w
    }
    if (!weightTotal) return null
    const percent = Math.round((weighted / weightTotal) * 1000) / 10
    const { letter, points } = letterFor(percent)
    return { percent, letter, points }
}

function gpa(grades) {
    const graded = grades.filter(Boolean)
    if (!graded.length) return null
    return Math.round((graded.reduce((sum, g) => sum + g.points, 0) / graded.length) * 100) / 100
}

module.exports = { computeGrade, gpa, letterFor, scoreOf }
