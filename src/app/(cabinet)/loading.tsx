export default function CabinetLoading() {
  return (
    <div className="space-y-6">
      {/* Heading skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-muted rounded-md animate-pulse" />
          <div className="h-4 w-64 bg-muted rounded-md animate-pulse" />
        </div>
        <div className="h-9 w-32 bg-muted rounded-md animate-pulse" />
      </div>

      {/* Content skeleton */}
      <div className="rounded-lg border p-4 space-y-3">
        <div className="h-4 w-full bg-muted rounded animate-pulse" />
        <div className="h-4 w-5/6 bg-muted rounded animate-pulse" />
        <div className="h-4 w-4/6 bg-muted rounded animate-pulse" />
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <div className="h-4 w-full bg-muted rounded animate-pulse" />
        <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
        <div className="h-4 w-5/6 bg-muted rounded animate-pulse" />
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <div className="h-4 w-full bg-muted rounded animate-pulse" />
        <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
        <div className="h-4 w-4/5 bg-muted rounded animate-pulse" />
      </div>
    </div>
  );
}
