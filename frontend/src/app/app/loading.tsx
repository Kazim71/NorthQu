import { Skeleton, CardGridSkeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
        <Skeleton className="h-7 w-32" />
      </div>
      <div className="mx-auto max-w-4xl px-6 py-12">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="mt-2 h-4 w-72" />
        <div className="mt-8">
          <CardGridSkeleton count={4} />
        </div>
      </div>
    </div>
  );
}
