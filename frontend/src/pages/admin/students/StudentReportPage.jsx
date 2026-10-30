import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import ReportCard from "../../../components/ReportCard";
import { ErrorState, Spinner } from "../../../components/ui/Feedback";
import { useFetch } from "../../../lib/useFetch";
import { getErrorMessage } from "../../../api";

export default function StudentReportPage() {
  const { id } = useParams();
  const { data, loading, error, reload } = useFetch(`/students/${id}/report`);

  return (
    <>
      <Link to="/admin/students" className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-violet-600 hover:text-fuchsia-600 mb-4 group print:hidden">
        <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" aria-hidden="true" /> Students
      </Link>
      {loading ? <Spinner className="py-16" /> : error ? <ErrorState message={getErrorMessage(error)} onRetry={reload} /> : <ReportCard report={data.report} />}
    </>
  );
}
