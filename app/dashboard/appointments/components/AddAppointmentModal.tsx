"use client";

import { useState, useEffect, useTransition } from "react";
import { PlusIcon, XIcon } from "@/components/icons";
import { addAppointment } from "@/app/dashboard/actions";
import Button from "@/components/ui/Button";

type PetOption = {
  id: string;
  name: string;
  ownerName: string;
};

type Props = {
  pets: PetOption[];
};

const SERVICE_PRESETS = [
  "Full Groom",
  "Bath & Brush",
  "Nail Trim",
  "De-shedding",
  "Puppy Cut",
  "Teeth Cleaning",
];

export default function AddAppointmentModal({ pets }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [service, setService] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  function handleSubmit(formData: FormData) {
    // Inject the service value (since presets control it via state)
    formData.set("service", service);
    startTransition(async () => {
      const result = await addAppointment(formData);
      if (result.success) {
        setIsOpen(false);
        setError(null);
        setService("");
      } else {
        setError(result.error ?? "Something went wrong.");
      }
    });
  }

  // Default datetime to now (formatted for datetime-local input)
  const now = new Date();
  const defaultDateTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => {
          setIsOpen(true);
          setError(null);
        }}
        className="fixed bottom-6 right-6 z-40 w-16 h-16 rounded-full bg-sage-400 text-white shadow-lg hover:bg-sage-500 hover:shadow-xl active:scale-95 transition-all duration-200 flex items-center justify-center cursor-pointer"
        aria-label="Add appointment"
      >
        <PlusIcon className="w-8 h-8" />
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-sage-900/20 backdrop-blur-sm animate-fade-in"
            onClick={() => setIsOpen(false)}
          />

          <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-6 sm:p-8 shadow-xl animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-sage-800">
                Add Appointment
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 -mr-2 rounded-lg text-sage-400 hover:bg-sage-50 transition-colors cursor-pointer"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <form action={handleSubmit} className="space-y-4">
              {/* Pet selector */}
              <div>
                <label htmlFor="apptPet" className="block text-sm font-medium text-sage-700 mb-1.5">
                  Pet
                </label>
                {pets.length === 0 ? (
                  <p className="text-sm text-sage-400 py-2">
                    No pets yet. Add a pet first.
                  </p>
                ) : (
                  <select
                    id="apptPet"
                    name="petId"
                    required
                    className="w-full px-4 py-3.5 text-base rounded-lg border border-warm-gray bg-soft-white text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-transparent transition-colors"
                  >
                    <option value="">Select a pet...</option>
                    {pets.map((pet) => (
                      <option key={pet.id} value={pet.id}>
                        {pet.name} ({pet.ownerName})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Service presets */}
              <div>
                <label className="block text-sm font-medium text-sage-700 mb-1.5">
                  Service
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {SERVICE_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setService(preset)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                        service === preset
                          ? "bg-sage-400 text-white border-sage-400"
                          : "bg-white text-sage-600 border-warm-gray hover:border-sage-300"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  placeholder="Or type a custom service..."
                  className="w-full px-4 py-3.5 text-base rounded-lg border border-warm-gray bg-soft-white text-sage-800 placeholder:text-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-transparent transition-colors"
                />
              </div>

              {/* Price */}
              <div>
                <label htmlFor="apptPrice" className="block text-sm font-medium text-sage-700 mb-1.5">
                  Price
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sage-400 text-base font-medium">
                    $
                  </span>
                  <input
                    id="apptPrice"
                    name="price"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-3.5 text-base rounded-lg border border-warm-gray bg-soft-white text-sage-800 placeholder:text-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-transparent transition-colors"
                  />
                </div>
              </div>

              {/* Date/Time */}
              <div>
                <label htmlFor="apptDateTime" className="block text-sm font-medium text-sage-700 mb-1.5">
                  Date & Time
                </label>
                <input
                  id="apptDateTime"
                  name="scheduledAt"
                  type="datetime-local"
                  required
                  defaultValue={defaultDateTime}
                  className="w-full px-4 py-3.5 text-base rounded-lg border border-warm-gray bg-soft-white text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-transparent transition-colors"
                />
              </div>

              {/* Notes */}
              <div>
                <label htmlFor="apptNotes" className="block text-sm font-medium text-sage-700 mb-1.5">
                  Notes
                </label>
                <textarea
                  id="apptNotes"
                  name="notes"
                  rows={2}
                  placeholder="e.g. Was a bit anxious today..."
                  className="w-full px-4 py-3.5 text-base rounded-lg border border-warm-gray bg-soft-white text-sage-800 placeholder:text-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-transparent transition-colors resize-none"
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
                disabled={isPending || pets.length === 0}
              >
                {isPending ? "Saving..." : "Add Appointment"}
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
