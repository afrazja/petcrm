"use client";

import { useState, useEffect, useTransition } from "react";
import { PlusIcon, XIcon, CheckCircleIcon } from "@/components/icons";
import { addAppointment, rebookAppointment } from "@/app/dashboard/actions";
import type { ActionResultWithRebook } from "@/app/dashboard/actions";
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

function getSixWeeksFrom(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    // Fallback: 6 weeks from now
    const now = new Date();
    now.setDate(now.getDate() + 42);
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  }
  d.setDate(d.getDate() + 42);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function AddAppointmentModal({ pets }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [service, setService] = useState("");

  // Rebook state
  const [rebookData, setRebookData] = useState<ActionResultWithRebook["rebookData"] | null>(null);
  const [rebookDate, setRebookDate] = useState("");
  const [rebookPending, setRebookPending] = useState(false);
  const [rebookSuccess, setRebookSuccess] = useState(false);
  // Store the original appointment date for calculating rebook date
  const [originalDate, setOriginalDate] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  function handleClose() {
    setIsOpen(false);
    setError(null);
    setService("");
    setRebookData(null);
    setRebookSuccess(false);
    setOriginalDate("");
  }

  function handleSubmit(formData: FormData) {
    // Inject the service value (since presets control it via state)
    formData.set("service", service);
    const scheduledAt = formData.get("scheduledAt") as string;
    startTransition(async () => {
      const result = await addAppointment(formData);
      if (result.success && result.rebookData) {
        setError(null);
        setRebookData(result.rebookData);
        setOriginalDate(scheduledAt);
        setRebookDate(getSixWeeksFrom(scheduledAt));
        setRebookSuccess(false);
      } else if (result.success) {
        handleClose();
      } else {
        setError(result.error ?? "Something went wrong.");
      }
    });
  }

  async function handleRebook() {
    if (!rebookData) return;
    setRebookPending(true);
    try {
      const result = await rebookAppointment({
        petId: rebookData.petId,
        clientId: rebookData.clientId,
        service: rebookData.service,
        scheduledAt: rebookDate,
      });
      if (result.success) {
        setRebookSuccess(true);
        setTimeout(() => handleClose(), 1200);
      } else {
        setError(result.error ?? "Failed to rebook.");
      }
    } finally {
      setRebookPending(false);
    }
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
          setRebookData(null);
          setRebookSuccess(false);
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
            onClick={handleClose}
          />

          <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-6 sm:p-8 shadow-xl animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-sage-800">
                {rebookData ? "Rebook" : "Add Appointment"}
              </h2>
              <button
                onClick={handleClose}
                className="p-2 -mr-2 rounded-lg text-sage-400 hover:bg-sage-50 transition-colors cursor-pointer"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Rebook Step */}
            {rebookData ? (
              <div className="space-y-5">
                {/* Success banner */}
                <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                  <CheckCircleIcon className="w-6 h-6 text-emerald-500 flex-shrink-0" />
                  <p className="text-sm font-medium text-emerald-700">
                    Appointment saved!
                  </p>
                </div>

                {rebookSuccess ? (
                  <div className="text-center py-4">
                    <CheckCircleIcon className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-sage-700">
                      Rebooked {rebookData.petName}!
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-sage-600">
                      Rebook <span className="font-semibold text-sage-800">{rebookData.petName}</span> for their next visit?
                    </p>

                    {/* Date picker */}
                    <div>
                      <label htmlFor="rebookDateAppt" className="block text-sm font-medium text-sage-700 mb-1.5">
                        Date & Time
                      </label>
                      <input
                        id="rebookDateAppt"
                        type="datetime-local"
                        value={rebookDate}
                        onChange={(e) => setRebookDate(e.target.value)}
                        className="w-full px-4 py-3.5 text-base rounded-lg border border-warm-gray bg-soft-white text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-transparent transition-colors"
                      />
                      <p className="mt-1 text-xs text-sage-400">
                        Default: 6 weeks from appointment date
                      </p>
                    </div>

                    {/* Service (read-only) */}
                    <div>
                      <label className="block text-sm font-medium text-sage-700 mb-1.5">
                        Service
                      </label>
                      <div className="px-4 py-3.5 text-base rounded-lg border border-warm-gray bg-sage-50 text-sage-600">
                        {rebookData.service}
                      </div>
                    </div>

                    {error && (
                      <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm text-center">
                        {error}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="secondary"
                        size="lg"
                        className="flex-1"
                        onClick={handleClose}
                      >
                        Skip
                      </Button>
                      <Button
                        type="button"
                        size="lg"
                        className="flex-1"
                        onClick={handleRebook}
                        disabled={rebookPending}
                      >
                        {rebookPending ? "Booking..." : "Rebook"}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              /* Add Appointment Form */
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
            )}
          </div>
        </div>
      )}
    </>
  );
}
