"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { XIcon } from "@/components/icons";
import { logVisit } from "@/app/dashboard/actions";

type PetOption = {
  id: string;
  name: string;
};

type ServicePreset = { name: string; defaultPrice: number; defaultDuration: number };

type LogVisitModalProps = {
  clientId: string;
  clientName: string;
  pets: PetOption[];
  servicePresets?: ServicePreset[];
  onClose: () => void;
};

export default function LogVisitModal({
  clientId,
  clientName,
  pets,
  servicePresets = [],
  onClose,
}: LogVisitModalProps) {
  const [selectedPetId, setSelectedPetId] = useState(pets[0]?.id ?? "");
  const [service, setService] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("60");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!selectedPetId) {
      setError("Please select a pet.");
      return;
    }
    if (!service.trim()) {
      setError("Please enter a service.");
      return;
    }

    const priceNum = parseFloat(price) || 0;

    startTransition(async () => {
      const durationNum = parseInt(duration) || 60;
      const result = await logVisit(clientId, selectedPetId, service, priceNum, notes, durationNum);
      if (result.success) {
        onClose();
      } else {
        setError(result.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl animate-slide-up z-10"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div>
            <h3 className="text-lg font-semibold text-sage-800">Log Visit</h3>
            <p className="text-sm text-sage-400">{clientName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 -m-2 text-sage-400 hover:text-sage-600 transition-colors"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6">
          {/* Pet selector */}
          {pets.length > 1 ? (
            <div className="mb-4">
              <label className="block text-sm font-medium text-sage-600 mb-1.5">
                Pet
              </label>
              <select
                value={selectedPetId}
                onChange={(e) => setSelectedPetId(e.target.value)}
                className="w-full px-4 py-3 border border-warm-gray rounded-xl text-sage-800 bg-white focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-300 text-base"
              >
                {pets.map((pet) => (
                  <option key={pet.id} value={pet.id}>
                    {pet.name}
                  </option>
                ))}
              </select>
            </div>
          ) : pets.length === 1 ? (
            <div className="mb-4 px-4 py-3 bg-sage-50 rounded-xl">
              <p className="text-sm text-sage-600">
                Pet: <span className="font-medium">{pets[0].name}</span>
              </p>
            </div>
          ) : null}

          {/* Service presets */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-sage-600 mb-1.5">
              Service
            </label>
            {servicePresets.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {servicePresets.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      setService(preset.name);
                      setPrice(preset.defaultPrice.toString());
                      setDuration(preset.defaultDuration.toString());
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                      service === preset.name
                        ? "bg-sage-400 text-white border-sage-400"
                        : "bg-white text-sage-600 border-warm-gray hover:border-sage-300"
                    }`}
                  >
                    {preset.name}
                    <span className="ml-1 opacity-70">${preset.defaultPrice} · {preset.defaultDuration}min</span>
                  </button>
                ))}
              </div>
            )}
            <input
              type="text"
              value={service}
              onChange={(e) => setService(e.target.value)}
              placeholder="Or type a custom service..."
              className="w-full px-4 py-3 border border-warm-gray rounded-xl text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-300 text-base"
            />
          </div>

          {/* Price */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-sage-600 mb-1.5">
              Price
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sage-400 text-base font-medium">
                $
              </span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-3 border border-warm-gray rounded-xl text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-300 text-base"
              />
            </div>
          </div>

          {/* Duration */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-sage-600 mb-1.5">
              Duration
            </label>
            <div className="relative">
              <input
                type="number"
                inputMode="numeric"
                min="5"
                step="5"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="60"
                className="w-full px-4 pr-14 py-3 border border-warm-gray rounded-xl text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-300 text-base"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sage-400 text-sm font-medium">min</span>
            </div>
          </div>

          {/* Notes */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-sage-600 mb-1.5">
              Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes about this visit..."
              className="w-full px-4 py-3 border border-warm-gray rounded-xl text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-300 text-base resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600 mb-3">{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3.5 bg-sage-400 hover:bg-sage-500 text-white font-semibold rounded-xl active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-base"
          >
            {isPending ? "Saving..." : "Log Visit"}
          </button>
        </form>
      </div>
    </div>
  );
}
