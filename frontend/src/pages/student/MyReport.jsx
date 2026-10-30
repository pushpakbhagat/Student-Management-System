import ReportCard from "../../components/ReportCard";
import { PageHeader } from "../../components/ui/Card";
import { ErrorState, Spinner } from "../../components/ui/Feedback";
import { useFetch } from "../../lib/useFetch";

export default function MyReport() {
  const { data, loading, error, reload } = useFetch("/me/report");
  return (
    <>
      <div className="print:hidden">
        <PageHeader eyebrow="Progress" title="Report card" description="Your attendance and grades in one page. Print it or save it as a PDF." />
      </div>
      {loading ? <Spinner className="py-16" /> : error ? <ErrorState onRetry={reload} /> : <ReportCard report={data.report} />}
    </>
  );
}
