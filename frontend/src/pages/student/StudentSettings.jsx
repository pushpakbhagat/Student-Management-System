import { BookOpen, Mail, UserRound } from "lucide-react";
import Avatar from "../../components/ui/Avatar";
import ChangePasswordForm from "../../components/ChangePasswordForm";
import { Card, PageHeader } from "../../components/ui/Card";
import { Reveal, Stagger } from "../../components/ui/Motion";
import usePortalStore from "../../store/usePortalStore";
import { fullName } from "../../lib/format";

export default function StudentSettings() {
  const profile = usePortalStore((s) => s.profile);

  return (
    <>
      <PageHeader eyebrow="Account" title="Settings" description="Your profile and password." />

      <Stagger className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <Reveal>
          <Card className="overflow-hidden">
            <div className="h-24 bg-brand-gradient relative" aria-hidden="true">
              <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(rgb(255 255 255 / 0.5) 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
            </div>
            <div className="px-6 pb-6 -mt-10">
              <Avatar person={profile} size="xl" className="ring-4" />
              <p className="font-display text-[22px] font-bold text-ink mt-3">{fullName(profile)}</p>
              <ul className="mt-4 flex flex-col gap-3 text-[14px] text-ink-soft">
                <li className="flex items-center gap-3"><Mail size={16} className="text-violet-500" aria-hidden="true" /><span className="truncate">{profile.email}</span></li>
                <li className="flex items-center gap-3"><UserRound size={16} className="text-fuchsia-500" aria-hidden="true" />{profile.gender || "—"}</li>
                <li className="flex items-center gap-3"><BookOpen size={16} className="text-orange-500" aria-hidden="true" />{profile.courses?.length ?? 0} courses</li>
              </ul>
              <p className="text-[13px] text-muted mt-5 bg-canvas rounded-2xl px-4 py-3">To change your name or email, contact your admin.</p>
            </div>
          </Card>
        </Reveal>

        <Reveal className="lg:col-span-2">
          <ChangePasswordForm />
        </Reveal>
      </Stagger>
    </>
  );
}
