import { PageHeader } from "../../components/ui/Card";
import { ErrorState, Spinner } from "../../components/ui/Feedback";
import Timetable from "../../components/Timetable";
import { useFetch } from "../../lib/useFetch";
import { getErrorMessage } from "../../api";

export default function StudentTimetable() {
  const { data, error, reload } = useFetch("/courses");

  return (
    <>
      <PageHeader eyebrow="Schedule" title="Timetable" description="Your classes this week. Today is highlighted." />
      {error ? (
        <ErrorState message={getErrorMessage(error)} onRetry={reload} />
      ) : !data ? (
        <Spinner className="py-16" />
      ) : (
        <Timetable courses={data.Courses} emptyMessage="Your school hasn't added class times for your courses yet." />
      )}
    </>
  );
}
