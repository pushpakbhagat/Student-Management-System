import { Award, GraduationCap } from "lucide-react";
import { Card, EmptyState, PageHeader } from "../../components/ui/Card";
import { Badge, ErrorState, ProgressBar, Ring, Spinner } from "../../components/ui/Feedback";
import { InView, Reveal, Stagger } from "../../components/ui/Motion";
import { useFetch } from "../../lib/useFetch";
import { gradeTone } from "../../lib/grades";
import { formatShortDate, idOf } from "../../lib/format";
import { STATUS, toneFor } from "../../lib/palette";
import { cn } from "../../lib/cn";

export default function StudentGrades() {
  const { data, loading, error, reload } = useFetch("/me/grades");

  return (
    <>
      <PageHeader eyebrow="Progress" title="Grades" description="Your score on every assessment and your grade in each course." />
      {loading ? (
        <Spinner className="py-16" />
      ) : error ? (
        <ErrorState onRetry={reload} />
      ) : !data.courses.length ? (
        <Card><EmptyState icon={GraduationCap} title="Not enrolled in any courses yet" /></Card>
      ) : (
        <>
          <InView>
            <Card className="relative overflow-hidden p-6 sm:p-8 mb-6 flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
              <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-linear-to-br from-violet-100 to-fuchsia-100 blur-2xl" aria-hidden="true" />
              <Ring value={data.gpa === null ? 0 : (data.gpa / 4) * 100} size={150} stroke={14} color="#7c3aed" colorTo="#f97316" label="GPA">
                <span className="font-display text-[36px] font-bold text-ink leading-none">{data.gpa ?? "—"}</span>
                <span className="text-[12px] text-muted mt-1">GPA / 4.0</span>
              </Ring>
              <div className="relative text-center sm:text-left">
                <p className="font-display text-[24px] font-bold text-ink">
                  {data.gpa === null ? "No grades yet" : data.gpa >= 3.5 ? "Outstanding work 🏆" : data.gpa >= 2.5 ? "Solid progress 👏" : "Room to grow 💪"}
                </p>
                <p className="text-[15px] text-muted mt-1">Across {data.courses.length} course{data.courses.length === 1 ? "" : "s"}. A = 4, B = 3, C = 2, D = 1.</p>
              </div>
            </Card>
          </InView>

          <Stagger className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {data.courses.map(({ course, grade, assessments }) => {
              const tone = toneFor(idOf(course));
              return (
                <Reveal key={idOf(course)}>
                  <Card hover className="overflow-hidden h-full">
                    <div className={cn("bg-linear-to-r px-6 py-5 flex items-center justify-between gap-4", tone.gradient)}>
                      <div className="min-w-0">
                        <h2 className="text-[20px] font-bold text-white truncate">{course.courseName}</h2>
                        <p className="text-[13px] text-white/80">{grade ? `${grade.percent}% overall` : "Not graded yet"}</p>
                      </div>
                      <span className="w-14 h-14 rounded-2xl bg-white/95 flex items-center justify-center font-display text-[28px] font-extrabold"
                        style={{ color: grade ? STATUS[gradeTone(grade.letter)]?.hex : "#94a3b8" }}>
                        {grade?.letter ?? "–"}
                      </span>
                    </div>
                    {assessments.length === 0 ? (
                      <p className="px-6 py-6 text-[14px] text-muted">No assessments yet.</p>
                    ) : (
                      <ul className="px-6 py-4 flex flex-col gap-4">
                        {assessments.map((a) => {
                          const pct = a.score === null ? null : Math.round((a.score / a.maxScore) * 100);
                          return (
                            <li key={a._id}>
                              <div className="flex items-center justify-between gap-3 mb-1.5">
                                <div className="min-w-0">
                                  <p className="text-[14px] font-semibold text-ink truncate">{a.title}</p>
                                  <p className="text-[12px] text-muted">{a.kind[0].toUpperCase() + a.kind.slice(1)} · {a.weight}% of grade{a.date ? ` · ${formatShortDate(a.date)}` : ""}</p>
                                </div>
                                {a.score === null ? <Badge>Not graded</Badge> : (
                                  <span className="text-[14px] font-bold text-ink tabular-nums">{a.score}<span className="text-muted font-medium">/{a.maxScore}</span></span>
                                )}
                              </div>
                              {pct !== null && <ProgressBar value={pct} tone={pct >= 80 ? "good" : pct >= 60 ? "warn" : "bad"} label={`${a.title} score`} />}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </Card>
                </Reveal>
              );
            })}
          </Stagger>
          <p className="flex items-center gap-2 text-[13px] text-muted mt-6"><Award size={15} className="text-violet-500" aria-hidden="true" /> Grades only count assessments that have been marked, weighted by their share of the course.</p>
        </>
      )}
    </>
  );
}
