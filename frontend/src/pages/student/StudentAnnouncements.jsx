import { Megaphone } from "lucide-react";
import AnnouncementCard from "../../components/AnnouncementCard";
import { Card, EmptyState, PageHeader } from "../../components/ui/Card";
import { ErrorState, Spinner } from "../../components/ui/Feedback";
import { Reveal, Stagger } from "../../components/ui/Motion";
import { useFetch } from "../../lib/useFetch";

export default function StudentAnnouncements() {
  const { data, loading, error, reload } = useFetch("/announcements");
  const list = data?.announcements ?? [];

  return (
    <>
      <PageHeader eyebrow="News" title="Announcements" description="School-wide news and notices for your courses." />
      {loading ? (
        <Spinner className="py-16" />
      ) : error ? (
        <ErrorState onRetry={reload} />
      ) : list.length === 0 ? (
        <Card><EmptyState icon={Megaphone} title="No announcements yet" message="When your school posts news, it shows up here." /></Card>
      ) : (
        <Stagger as="ul" className="flex flex-col gap-3 max-w-3xl">
          {list.map((a) => <Reveal as="li" key={a._id}><AnnouncementCard announcement={a} /></Reveal>)}
        </Stagger>
      )}
    </>
  );
}
