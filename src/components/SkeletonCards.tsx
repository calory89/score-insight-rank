import { Skeleton } from "@/components/ui/skeleton";

/** Dashboard analysis card skeleton */
export const DashboardCardSkeleton = () => (
  <div className="rounded-xl border border-border bg-card overflow-hidden">
    <div className="flex flex-col sm:flex-row">
      <Skeleton className="sm:w-40 h-32 sm:h-auto rounded-none" />
      <div className="flex-1 p-5 space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-14 w-14 rounded-lg" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-3 w-full" />
        <div className="flex justify-between">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </div>
  </div>
);

/** Rankings table row skeleton */
export const RankingRowSkeleton = () => (
  <div className="grid grid-cols-[1.5rem_1fr] sm:grid-cols-12 gap-x-2 sm:gap-2 px-3 sm:px-4 py-2.5 border-b border-border/50 items-center">
    <Skeleton className="h-3 w-4" />
    <div className="sm:col-span-5 space-y-1">
      <Skeleton className="h-3.5 w-3/4" />
      <Skeleton className="h-2.5 w-1/2" />
    </div>
    <div className="col-start-2 sm:col-span-6 sm:contents flex gap-2 mt-0.5">
      <Skeleton className="h-6 w-10 rounded sm:col-span-2 sm:mx-auto" />
      <Skeleton className="h-3 w-16 sm:col-span-2 sm:mx-auto" />
      <Skeleton className="h-5 w-14 rounded-full sm:col-span-2" />
    </div>
  </div>
);

/** Discover card skeleton */
export const DiscoverCardSkeleton = () => (
  <div className="rounded-xl border border-border bg-card overflow-hidden">
    <Skeleton className="h-40 w-full rounded-none" />
    <div className="p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-3.5 w-2/3" />
          <Skeleton className="h-2.5 w-1/3" />
        </div>
        <Skeleton className="h-12 w-14 rounded-lg" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-20" />
      </div>
      <div className="flex justify-between pt-3 border-t border-border/50">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
    </div>
  </div>
);

/** Profile header skeleton */
export const ProfileSkeleton = () => (
  <div className="text-center space-y-4">
    <Skeleton className="h-20 w-20 rounded-full mx-auto" />
    <Skeleton className="h-5 w-32 mx-auto" />
    <Skeleton className="h-3 w-20 mx-auto" />
    <div className="flex justify-center gap-6">
      <div className="text-center space-y-1">
        <Skeleton className="h-4 w-8 mx-auto" />
        <Skeleton className="h-2.5 w-14 mx-auto" />
      </div>
      <div className="text-center space-y-1">
        <Skeleton className="h-4 w-8 mx-auto" />
        <Skeleton className="h-2.5 w-14 mx-auto" />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-3 mt-6">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-xl" />
      ))}
    </div>
  </div>
);
