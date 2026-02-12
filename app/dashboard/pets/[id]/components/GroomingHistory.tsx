"use client";

import { useState } from "react";
import { ScissorsIcon, DollarIcon, ClockIcon, ChevronLeftIcon } from "@/components/icons";

type Visit = {
  id: string;
  service: string;
  price: number;
  completedAt: string;
  notes: string | null;
  duration: number;
  status: string;
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  scheduled: { label: "Scheduled", bg: "bg-blue-50", text: "text-blue-700" },
  completed: { label: "Completed", bg: "bg-emerald-50", text: "text-emerald-700" },
  "no-show": { label: "No-Show", bg: "bg-red-50", text: "text-red-600" },
};

export default function GroomingHistory({ visits }: { visits: Visit[] }) {
  const [showAll, setShowAll] = useState(false);

  if (visits.length === 0) return null;

  const displayed = showAll ? visits : visits.slice(0, 5);
  const totalSpent = visits
    .filter((v) => v.status === "completed")
    .reduce((sum, v) => sum + v.price, 0);
  const completedCount = visits.filter((v) => v.status === "completed").length;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-warm-gray/50 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sage-50 flex items-center justify-center text-sage-400">
            <ScissorsIcon className="w-4.5 h-4.5" />
          </div>
          <h3 className="text-lg font-semibold text-sage-700">Grooming History</h3>
        </div>
        <div className="flex items-center gap-3 text-xs text-sage-400">
          <span>{completedCount} visit{completedCount !== 1 ? "s" : ""}</span>
          <span className="font-medium text-sage-600">${totalSpent.toFixed(2)}</span>
        </div>
      </div>

      <div className="space-y-2">
        {displayed.map((visit) => {
          const date = new Date(visit.completedAt);
          const dateStr = date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
          const timeStr = date.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          });
          const cfg = STATUS_CONFIG[visit.status] ?? STATUS_CONFIG.completed;

          return (
            <div
              key={visit.id}
              className="px-4 py-3 rounded-xl bg-sage-50/50 border border-warm-gray/30"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium text-sage-700 text-sm truncate">
                    {visit.service}
                  </span>
                  {visit.status !== "completed" && (
                    <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full ${cfg.bg} ${cfg.text}`}>
                      {cfg.label}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 text-xs">
                  <span className="flex items-center gap-1 text-sage-500">
                    <ClockIcon className="w-3 h-3" />
                    {visit.duration}min
                  </span>
                  <span className="flex items-center gap-1 text-sage-700 font-medium">
                    <DollarIcon className="w-3 h-3" />
                    {visit.price.toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-sage-400">
                  {dateStr} at {timeStr}
                </p>
              </div>
              {visit.notes && (
                <p className="text-xs text-sage-400 italic mt-1.5">
                  {visit.notes}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {visits.length > 5 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-3 w-full flex items-center justify-center gap-1 py-2 text-xs font-medium text-sage-500 hover:text-sage-700 transition-colors cursor-pointer"
        >
          <ChevronLeftIcon className={`w-3.5 h-3.5 transition-transform ${showAll ? "rotate-90" : "-rotate-90"}`} />
          {showAll ? "Show less" : `Show all ${visits.length} visits`}
        </button>
      )}
    </div>
  );
}
