import { useMemo } from "react";
import { BookOpen, History, Target } from "lucide-react";
import { Card, CardHeader, EmptyState, PageHeader } from "../../components/ui/Card";
import { Badge, ProgressBar, Ring, Spinner } from "../../components/ui/Feedback";
import { InView, Reveal, Stagger } from "../../components/ui/Motion";
import usePortalStore from "../../store/usePortalStore";
import { useFetch } from "../../lib/useFetch";
import { STATUS_BY_VALUE, STATUS_OPTIONS } from "../../lib/attendance";
import { ATTENDANCE_TARGET, attendanceOf, attendanceTone, classesNeeded, formatDay, idOf, percent } from "../../lib/format";
import { STATUS, toneFor } from "../../lib/palette";
import { cn } from "../../lib/cn";

export default function StudentAttendance() {
  const profile = usePortalStore((s) => s.profile);
  const { data, loading } = useFetch("/me/attendance");
  const history = useMemo(() => data?.history ?? [], [data]);

  const enrollments = profile.courses || [];
  const overall = attendanceOf(enrollments);
  const overallStatus = overall.total ? attendanceTone(overall.pct) : null;

  // newest 12 days per course, oldest first, for the dot strip
  const recentByCourse = useMemo(() => {
    const map = new Map();
    for (const h of history) {
      const key = idOf(h.course);
      const list = map.get(key) ?? [];
      if (list.length < 12) list.push(h);
      map.set(key, list);
    }
    for (const [key, list] of map) map.set(key, list.reverse());
    return map;
  }, [history]);

  return (
    <>
      <PageHeader
        eyebrow="Progress"
        title="Attendance"
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

          <Stagger className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
            {enrollments.map((e) => {
              const pct = percent(e.attendedClasses, e.totalClasses);
              const needed = classesNeeded(e.attendedClasses, e.totalClasses);
              const tone = toneFor(idOf(e.course));
              const status = e.totalClasses ? attendanceTone(pct) : null;
              const recent = recentByCourse.get(idOf(e.course)) ?? [];
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
                          ["Counted", e.totalClasses],
                          ["Missed", e.totalClasses - e.attendedClasses],
                        ].map(([label, value]) => (
                          <div key={label} className="rounded-2xl bg-canvas py-3">
                            <dt className="text-[11px] font-bold uppercase tracking-wider text-muted">{label}</dt>
                            <dd className="font-display text-[22px] font-bold text-ink mt-0.5">{value}</dd>
                          </div>
                        ))}
                      </dl>
                      {recent.length > 0 && (
                        <div className="mt-5">
                          <p className="text-[12px] font-semibold text-muted mb-2">Last {recent.length} classes</p>
                          <div className="flex flex-wrap gap-1.5">
                            {recent.map((h) => (
                              <span key={h._id} title={`${formatDay(h.date)}: ${STATUS_BY_VALUE[h.status]?.label}`}
                                className={cn("w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-white", STATUS_BY_VALUE[h.status]?.dot)}>
                                {STATUS_BY_VALUE[h.status]?.short}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
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

          <InView>
            <Card>
              <CardHeader title="Day by day" subtitle="Every recorded class, newest first" icon={History}
                action={
                  <div className="hidden sm:flex gap-3 text-[12px] text-muted">
                    {STATUS_OPTIONS.map((o) => <span key={o.value} className="inline-flex items-center gap-1.5"><span className={cn("w-2.5 h-2.5 rounded-full", o.dot)} />{o.label}</span>)}
                  </div>
                } />
              {loading ? (
                <Spinner className="py-10" />
              ) : history.length === 0 ? (
                <EmptyState icon={History} title="No classes recorded yet" className="py-10" />
              ) : (
                <ul className="px-3 pb-3 max-h-[32rem] overflow-y-auto" data-lenis-prevent>
                  {history.map((h) => {
                    const tone = toneFor(idOf(h.course));
                    const s = STATUS_BY_VALUE[h.status];
                    return (
                      <li key={h._id} className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-violet-50/60">
                        <span className={cn("w-2.5 h-2.5 rounded-full bg-linear-to-br flex-shrink-0", tone.gradient)} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-semibold text-ink truncate">{h.course?.courseName}</p>
                          <p className="text-[12px] text-muted truncate">{formatDay(h.date)}{h.topic ? ` · ${h.topic}` : ""}</p>
                        </div>
                        <Badge tone={s?.tone}>{s?.label}</Badge>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </InView>
        </>
      )}
    </>
  );
}
