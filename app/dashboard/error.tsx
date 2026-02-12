"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
        <span className="text-2xl">⚠️</span>
      </div>
      <h2 className="text-lg font-semibold text-sage-800 mb-2">
        Something went wrong
      </h2>
      <p className="text-sm text-sage-500 mb-6 max-w-sm">
        {error.message || "An unexpected error occurred. Please try again."}
      </p>
      <button
        onClick={reset}
        className="px-5 py-2.5 bg-sage-400 text-white rounded-lg font-medium hover:bg-sage-500 transition-colors cursor-pointer"
      >
        Try again
      </button>
    </div>
  );
}
