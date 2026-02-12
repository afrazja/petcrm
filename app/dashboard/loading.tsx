export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Header skeleton */}
      <div>
        <div className="h-7 w-48 bg-sage-100 rounded-lg" />
        <div className="h-4 w-72 bg-sage-50 rounded-lg mt-2" />
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-6 shadow-sm border border-warm-gray/50"
          >
            <div className="w-10 h-10 rounded-xl bg-sage-50 mb-4" />
            <div className="h-8 w-16 bg-sage-100 rounded-lg" />
            <div className="h-4 w-24 bg-sage-50 rounded-lg mt-2" />
          </div>
        ))}
      </div>

      {/* List skeleton */}
      <div className="bg-white rounded-2xl shadow-sm border border-warm-gray/50 p-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-sage-50 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-sage-100 rounded" />
              <div className="h-3 w-20 bg-sage-50 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
