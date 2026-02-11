"use client";

import { useState, useEffect, useTransition } from "react";
import { PlusIcon, XIcon } from "@/components/icons";
import { quickCheckIn } from "@/app/dashboard/actions";
import Button from "@/components/ui/Button";

export default function QuickCheckIn() {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await quickCheckIn(formData);
      if (result.success) {
        setIsOpen(false);
        setError(null);
      } else {
        setError(result.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <>
      {/* FAB — Big tappable "+" button */}
      <button
        onClick={() => {
          setIsOpen(true);
          setError(null);
        }}
        className="fixed bottom-6 right-6 z-40 w-16 h-16 rounded-full bg-sage-400 text-white shadow-lg hover:bg-sage-500 hover:shadow-xl active:scale-95 transition-all duration-200 flex items-center justify-center cursor-pointer"
        aria-label="Quick check-in"
      >
        <PlusIcon className="w-8 h-8" />
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-sage-900/20 backdrop-blur-sm animate-fade-in"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-6 sm:p-8 shadow-xl animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-sage-800">
                Quick Check-In
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 -mr-2 rounded-lg text-sage-400 hover:bg-sage-50 transition-colors cursor-pointer"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form action={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="petName"
                  className="block text-sm font-medium text-sage-700 mb-1.5"
                >
                  Pet Name
                </label>
                <input
                  id="petName"
                  name="petName"
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Buddy"
                  className="w-full px-4 py-3.5 text-base rounded-lg border border-warm-gray bg-soft-white text-sage-800 placeholder:text-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-transparent transition-colors"
                />
              </div>
              <div>
                <label
                  htmlFor="ownerPhone"
                  className="block text-sm font-medium text-sage-700 mb-1.5"
                >
                  Owner Phone
                </label>
                <input
                  id="ownerPhone"
                  name="ownerPhone"
                  type="tel"
                  required
                  placeholder="e.g. 555-123-4567"
                  className="w-full px-4 py-3.5 text-base rounded-lg border border-warm-gray bg-soft-white text-sage-800 placeholder:text-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-transparent transition-colors"
                />
              </div>
              <div>
                <label
                  htmlFor="breed"
                  className="block text-sm font-medium text-sage-700 mb-1.5"
                >
                  Breed
                </label>
                <input
                  id="breed"
                  name="breed"
                  type="text"
                  placeholder="e.g. Golden Retriever"
                  className="w-full px-4 py-3.5 text-base rounded-lg border border-warm-gray bg-soft-white text-sage-800 placeholder:text-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-transparent transition-colors"
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm text-center">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full mt-2"
                disabled={isPending}
              >
                {isPending ? "Saving..." : "Check In"}
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
