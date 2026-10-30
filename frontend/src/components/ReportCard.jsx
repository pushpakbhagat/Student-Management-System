import { GraduationCap, Printer } from "lucide-react";
import Avatar from "./ui/Avatar";
import Button from "./ui/Button";
import { Badge } from "./ui/Feedback";
import { attendanceTone, formatDate, formatShortDate, fullName, idOf } from "../lib/format";
import { gradeTone } from "../lib/grades";
import { toneFor } from "../lib/palette";
import { cn } from "../lib/cn";

// A printable report card. "Print / Save as PDF" uses the browser's print dialog;
// the app's sidebar, top bar and background are hidden when printing.
export default function ReportCard({ report }) {
  const { student, courses, gpa, attendance, generatedAt } = report;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-end gap-2 mb-4 print:hidden">
        <Button onClick={() => window.print()}>
          <Printer size={17} aria-hidden="true" /> Print / Save as PDF
        </Button>
      </div>

      <article className="bg-surface rounded-[28px] border border-line shadow-soft overflow-hidden print:shadow-none print:border-0 print:rounded-none">
        {/* header */}
        <header className="relative bg-brand-gradient text-white px-6 sm:px-10 py-8 print:bg-none print:text-ink print:border-b-2 print:border-ink print:px-0">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <Avatar person={student} size="xl" className="print:hidden" />
              <div>
                <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.2em] opacity-80">
                  <GraduationCap size={15} aria-hidden="true" /> StudentHub · Report card
                </p>
                <h1 className="text-[30px] font-extrabold leading-tight mt-1">{fullName(student)}</h1>
                <p className="text-[14px] opacity-85">{student.email}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <SummaryTile label="GPA" value={gpa ?? "—"} sub="out of 4.0" />
              <SummaryTile label="Attendance" value={attendance.total ? `${attendance.pct}%` : "—"} sub={`${attendance.attended}/${attendance.total} classes`} />
            </div>
          </div>
          <p className="text-[12px] opacity-75 mt-5">Generated {formatDate(generatedAt)}</p>
        </header>

        {/* courses */}
        <div className="px-6 sm:px-10 py-8 flex flex-col gap-6 print:px-0">
          {courses.length === 0 && <p className="text-[15px] text-muted">Not enrolled in any courses.</p>}
          {courses.map((c) => {
            const tone = toneFor(idOf(c.course));
            return (
              <section key={idOf(c.course)} className="break-inside-avoid rounded-3xl border border-line overflow-hidden print:rounded-none">
                <div className="flex flex-wrap items-center gap-3 px-5 py-4 bg-canvas print:bg-transparent print:border-b print:border-line">
                  <span className={cn("w-3 h-3 rounded-full bg-linear-to-br print:hidden", tone.gradient)} />
                  <h2 className="text-[18px] font-bold text-ink mr-auto">{c.course.courseName}</h2>
                  <Badge tone={c.attendance.total ? attendanceTone(c.attendance.pct) : "neutral"}>
                    Attendance {c.attendance.total ? `${c.attendance.pct}%` : "—"}
                  </Badge>
                  <Badge tone={c.grade ? gradeTone(c.grade.letter) : "neutral"} className="text-[13px]">
                    {c.grade ? `${c.grade.letter} · ${c.grade.percent}%` : "Not graded"}
                  </Badge>
                </div>
                {c.assessments.length > 0 && (
                  <table className="w-full text-left text-[14px]">
                    <thead>
                      <tr className="text-[11px] uppercase tracking-wider text-muted">
                        <th scope="col" className="px-5 py-2.5 font-bold">Assessment</th>
                        <th scope="col" className="px-5 py-2.5 font-bold hidden sm:table-cell print:table-cell">Type</th>
                        <th scope="col" className="px-5 py-2.5 font-bold text-right">Weight</th>
                        <th scope="col" className="px-5 py-2.5 font-bold text-right">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {c.assessments.map((a) => (
                        <tr key={a._id} className="border-t border-line/70">
                          <td className="px-5 py-2.5 font-semibold text-ink">
                            {a.title}
                            {a.date && <span className="block text-[12px] font-normal text-muted">{formatShortDate(a.date)}</span>}
                          </td>
                          <td className="px-5 py-2.5 text-ink-soft capitalize hidden sm:table-cell print:table-cell">{a.kind}</td>
                          <td className="px-5 py-2.5 text-right text-ink-soft tabular-nums">{a.weight}%</td>
                          <td className="px-5 py-2.5 text-right font-bold tabular-nums">
                            {a.score === null ? <span className="text-muted font-medium">—</span> : `${a.score} / ${a.maxScore}`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            );
          })}
          <p className="text-[12px] text-muted">
            Grading scale: A 90–100 · B 80–89 · C 70–79 · D 60–69 · F below 60. Course grades are weighted averages of graded assessments.
            Attendance target: 75%.
          </p>
        </div>
      </article>
    </div>
  );
}

function SummaryTile({ label, value, sub }) {
  return (
    <div className="rounded-2xl bg-white/15 ring-1 ring-white/25 px-5 py-3 text-center min-w-28 print:ring-ink/30 print:bg-transparent">
      <p className="text-[11px] font-bold uppercase tracking-widest opacity-80">{label}</p>
      <p className="font-display text-[28px] font-extrabold leading-none mt-1">{value}</p>
      <p className="text-[11px] opacity-75 mt-1">{sub}</p>
    </div>
  );
}
