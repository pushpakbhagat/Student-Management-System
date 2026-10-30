import { Globe2, Pin } from "lucide-react";
import Avatar from "./ui/Avatar";
import { Badge } from "./ui/Feedback";
import { fullName, idOf, timeAgo } from "../lib/format";
import { toneFor } from "../lib/palette";
import { cn } from "../lib/cn";

// One announcement; `actions` lets the admin page add pin/delete buttons
export default function AnnouncementCard({ announcement: a, actions, compact = false }) {
  const tone = a.course ? toneFor(idOf(a.course)) : null;
  return (
    <article className={cn(
      "relative overflow-hidden rounded-3xl border bg-surface",
      a.pinned ? "border-violet-200 shadow-soft" : "border-line",
      compact ? "p-4" : "p-5 sm:p-6"
    )}>
      {a.pinned && <span className="absolute inset-x-0 top-0 h-1 bg-brand-gradient" aria-hidden="true" />}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            {a.pinned && <Badge tone="indigo"><Pin size={11} aria-hidden="true" /> Pinned</Badge>}
            {tone ? <Badge palette={tone}>{a.course.courseName}</Badge> : <Badge><Globe2 size={11} aria-hidden="true" /> Everyone</Badge>}
          </div>
          <h3 className={cn("font-bold text-ink break-words", compact ? "text-[15px]" : "text-[18px]")}>{a.title}</h3>
          {a.body && <p className={cn("text-ink-soft leading-relaxed whitespace-pre-line break-words mt-1", compact ? "text-[13px] line-clamp-2" : "text-[14px]")}>{a.body}</p>}
          <div className="flex items-center gap-2 mt-3 text-[12px] text-muted">
            {a.author && <Avatar person={a.author} size="sm" className="w-6 h-6 text-[9px] rounded-lg" />}
            <span>{a.author ? fullName(a.author) : "Admin"} · {timeAgo(a.createdAt)}</span>
          </div>
        </div>
        {actions}
      </div>
    </article>
  );
}
