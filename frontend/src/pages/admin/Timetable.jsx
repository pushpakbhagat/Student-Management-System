import { Link } from "react-router-dom";
import { PageHeader } from "../../components/ui/Card";
import Timetable from "../../components/Timetable";
import useAdminStore from "../../store/useAdminStore";
import useSessionStore from "../../store/useSessionStore";

export default function AdminTimetable() {
  const courses = useAdminStore((s) => s.courses);
  const role = useSessionStore((s) => s.role);

  return (
    <>
      <PageHeader
        eyebrow="Schedule"
        title="Timetable"
        description={role === "admin" ? "Every course's weekly classes. Set class times from a course's roster." : "The weekly classes for the courses you teach."}
      />
      <Timetable
        courses={courses}
        emptyMessage={role === "admin" ? <>Open a course on the <Link to="/admin/courses" className="font-semibold text-violet-600">Courses</Link> page to add its class times.</> : "An admin hasn't added class times for your courses yet."}
      />
    </>
  );
}
