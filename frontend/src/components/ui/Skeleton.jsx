import { cn } from "../../lib/cn";

export function Skeleton({ className }) {
  return <div className={cn("skeleton", className)} aria-hidden="true" />;
}

// Placeholder that looks like a dashboard while data loads
export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading">
      <Skeleton className="h-44 sm:h-52 rounded-[32px] mb-6" />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-5 mb-6">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32 sm:h-36 rounded-3xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Skeleton className="h-72 rounded-3xl lg:col-span-2" />
        <Skeleton className="h-72 rounded-3xl" />
      </div>
    </div>
  );
}
