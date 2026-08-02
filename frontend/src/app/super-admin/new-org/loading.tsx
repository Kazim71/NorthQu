import { Skeleton, CardSkeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <CardSkeleton height="h-64" />
        <CardSkeleton height="h-64" />
      </div>
    </div>
  );
}
