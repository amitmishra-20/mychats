export default function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-lg bg-secondary ${className ?? ""}`}
    />
  );
}

export function DocumentSkeleton() {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="p-2 rounded-lg bg-secondary border border-border">
          <div className="flex items-start gap-2">
            <Skeleton className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-2.5 w-1/3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
