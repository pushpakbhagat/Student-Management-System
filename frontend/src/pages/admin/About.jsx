import { BookOpen, CalendarCheck, ClipboardList, LayoutDashboard, ShieldCheck, Users } from "lucide-react";
import { Card, PageHeader } from "../../components/ui/Card";
import { InView, Reveal, Stagger } from "../../components/ui/Motion";
import { TONES } from "../../lib/palette";
import { cn } from "../../lib/cn";

const FEATURES = [
  { icon: Users, tone: TONES.violet, title: "Student management", desc: "Add, edit and remove students, with photo, courses and login details." },
  { icon: BookOpen, tone: TONES.teal, title: "Courses", desc: "Create courses and manage who is enrolled in each one." },
  { icon: CalendarCheck, tone: TONES.coral, title: "Attendance & grades", desc: "Record each class day by day, and grade quizzes, assignments and exams with weights." },
  { icon: ClipboardList, tone: TONES.amber, title: "Assignments", desc: "Set coursework with due dates; students only see their own courses' work." },
  { icon: ShieldCheck, tone: TONES.sky, title: "Role-based access", desc: "Admins manage everything, students see only their data — enforced by the server." },
  { icon: LayoutDashboard, tone: TONES.pink, title: "Live dashboard", desc: "Enrollment, attendance and upcoming deadlines at a glance." },
];

const TECH = ["React 19", "Vite", "Tailwind CSS", "Motion", "Zustand", "React Router", "Express 5", "MongoDB", "Mongoose", "JWT"];

const FLOW = [
  { title: "Admin signs in", desc: "Secure, httpOnly cookie session; every request is checked on the server." },
  { title: "Students are enrolled", desc: "Add students and choose their courses, or manage a whole course roster at once." },
  { title: "Classes are recorded", desc: "Attendance is recorded per day and grades are entered per assessment." },
  { title: "Students follow along", desc: "Students log in to see their attendance history, grades, news and upcoming assignments." },
];

export default function About() {
  return (
    <>
      <PageHeader eyebrow="About" title={<>Student<span className="text-brand-gradient">Hub</span></>} description="A full-stack academic management system for admins and students." />

      <Stagger className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 mb-12">
        {FEATURES.map(({ icon: Icon, tone, title, desc }) => (
          <Reveal key={title}>
            <Card hover className="p-6 h-full group">
              <div className={cn("w-12 h-12 rounded-2xl bg-linear-to-br text-white flex items-center justify-center mb-5 shadow-soft transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6", tone.gradient)}>
                <Icon size={22} aria-hidden="true" />
              </div>
              <p className="font-display text-[18px] font-bold text-ink mb-1.5">{title}</p>
              <p className="text-[14px] text-muted leading-relaxed">{desc}</p>
            </Card>
          </Reveal>
        ))}
      </Stagger>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <InView>
          <Card className="p-6 sm:p-8 h-full">
            <h2 className="text-[22px] font-bold text-ink mb-5">Built with</h2>
            <div className="flex flex-wrap gap-2">
              {TECH.map((t, i) => {
                const tone = Object.values(TONES)[i % 6];
                return <span key={t} className={cn("px-3.5 py-1.5 rounded-full ring-1 ring-inset text-[13px] font-semibold", tone.soft)}>{t}</span>;
              })}
            </div>
          </Card>
        </InView>

        <InView delay={0.1}>
          <Card className="p-6 sm:p-8 h-full">
            <h2 className="text-[22px] font-bold text-ink mb-5">How it works</h2>
            <ol className="flex flex-col">
              {FLOW.map((step, i) => (
                <li key={step.title} className="flex gap-4 pb-6 last:pb-0">
                  <div className="flex flex-col items-center">
                    <span className="w-8 h-8 rounded-xl bg-brand-gradient text-white text-[13px] font-bold flex items-center justify-center shadow-glow">{i + 1}</span>
                    {i < FLOW.length - 1 && <span className="w-0.5 flex-1 bg-linear-to-b from-violet-200 to-transparent mt-2" />}
                  </div>
                  <div className="pb-1">
                    <p className="text-[15px] font-bold text-ink">{step.title}</p>
                    <p className="text-[14px] text-muted mt-0.5">{step.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </InView>
      </div>
    </>
  );
}
