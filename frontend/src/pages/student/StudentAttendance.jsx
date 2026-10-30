import { BookOpen, Target } from "lucide-react";
import { Card, EmptyState, PageHeader } from "../../components/ui/Card";
import { Badge, ProgressBar, Ring } from "../../components/ui/Feedback";
import { InView, Reveal, Stagger } from "../../components/ui/Motion";
import usePortalStore from "../../store/usePortalStore";
import { ATTENDANCE_TARGET, attendanceOf, attendanceTone, classesNeeded, idOf, percent } from "../../lib/format";
import { STATUS, toneFor } from "../../lib/palette";
import { cn } from "../../lib/cn";

export default function StudentAttendance() {
  const profile = usePortalStore((s) => s.profile);
  const enrollments = profile.courses || [];
  const overall = attendanceOf(enrollments);
  const overallStatus = overall.total ? attendanceTone(overall.pct) : null;

  return (
    <>
      <PageHeader
        eyebrow="Progress"
        title="Attendance & Marks"
        description={`Keep each course at ${ATTENDANCE_TARGET}% or above to stay eligible for exams.`}
      />

      {enrollments.length === 0 ? (
        <Card><EmptyState icon={BookOpen} title="Not enrolled in any courses yet" /></Card>
      ) : (
        <>
          <InView>
            <Card className="relative overflow-hidden p-6 sm:p-8 mb-6 flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
              <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-linear-to-br from-violet-100 to-fuchsia-100 blur-2xl" aria-hidden="true" />
              <Ring value={overall.pct} size={150} stroke={14} color={overallStatus ? STATUS[overallStatus].hex : "#7c3aed"} colorTo="#c026d3" label="Overall attendance">
                <span className="font-display text-[34px] font-bold text-ink leading-none">{overall.total ? `${overall.pct}%` : "—"}</span>
                <span className="text-[12px] text-muted mt-1">overall</span>
              </Ring>
              <div className="relative text-center sm:text-left">
                <p className="font-display text-[24px] font-bold text-ink">
                  {!overall.total ? "No classes recorded yet" : overallStatus === "good" ? "You're on track 🎯" : "Let's catch up 💪"}
                </p>
                <p className="text-[15px] text-muted mt-1">{overall.attended} of {overall.total} classes attended across {enrollments.length} courses.</p>
                <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full bg-violet-50 text-violet-700 text-[13px] font-semibold">
                  <Target size={15} aria-hidden="true" /> Target: {ATTENDANCE_TARGET}% in every course
                </div>
              </div>
            </Card>
          </InView>

          <Stagger className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {enrollments.map((e) => {
              const pct = percent(e.attendedClasses, e.totalClasses);
              const needed = classesNeeded(e.attendedClasses, e.totalClasses);
              const tone = toneFor(idOf(e.course));
              const status = e.totalClasses ? attendanceTone(pct) : null;
              return (
                <Reveal key={e._id}>
                  <Card hover className="overflow-hidden h-full">
                    <div className={cn("bg-linear-to-r px-6 py-4 flex items-center justify-between gap-3", tone.gradient)}>
                      <h2 className="text-[19px] font-bold text-white truncate">{e.course?.courseName ?? "Course"}</h2>
                      {status && <span className="px-3 py-1 rounded-full bg-white/90 text-[13px] font-bold" style={{ color: STATUS[status].hex }}>{pct}%</span>}
                    </div>
                    <div className="p-6">
                      <ProgressBar value={pct} tone={status ?? tone.name} label={`${e.course?.courseName} attendance`} className="h-2.5" />
                      <dl className="grid grid-cols-3 gap-3 mt-5 text-center">
                        {[
                          ["Attended", e.attendedClasses],
                          ["Classes", e.totalClasses],
                          ["Marks", e.marks],
                        ].map(([label, value]) => (
                          <div key={label} className="rounded-2xl bg-canvas py-3">
                            <dt className="text-[11px] font-bold uppercase tracking-wider text-muted">{label}</dt>
                            <dd className="font-display text-[22px] font-bold text-ink mt-0.5">{value}</dd>
                          </div>
                        ))}
                      </dl>
                      {needed > 0 ? (
                        <Badge tone="warn" className="mt-4">Attend the next {needed} class{needed === 1 ? "" : "es"} to reach {ATTENDANCE_TARGET}%</Badge>
                      ) : e.totalClasses > 0 ? (
                        <Badge tone="good" className="mt-4">On track</Badge>
                      ) : null}
                    </div>
                  </Card>
                </Reveal>
              );
            })}
          </Stagger>
        </>
      )}
    </>
  );
}
