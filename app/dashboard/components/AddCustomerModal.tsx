"use client";

import { useState, useEffect, useTransition } from "react";
import { PlusIcon, XIcon, TrashIcon, CheckCircleIcon } from "@/components/icons";
import { addCustomerWithPets } from "@/app/dashboard/actions";
import Button from "@/components/ui/Button";

type PetEntry = {
  name: string;
  breed: string;
  dateOfBirth: string;
};

const emptyPet = (): PetEntry => ({ name: "", breed: "", dateOfBirth: "" });

export default function AddCustomerModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [pets, setPets] = useState<PetEntry[]>([emptyPet()]);

  // Close on Escape
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
    setSuccess(false);
    setPets([emptyPet()]);
  }

  function handleOpen() {
    setIsOpen(true);
    setError(null);
    setSuccess(false);
    setPets([emptyPet()]);
  }

  function addPetEntry() {
    setPets((prev) => [...prev, emptyPet()]);
  }

  function removePetEntry(index: number) {
    setPets((prev) => prev.filter((_, i) => i !== index));
  }

  function updatePet(index: number, field: keyof PetEntry, value: string) {
    setPets((prev) =>
      prev.map((pet, i) => (i === index ? { ...pet, [field]: value } : pet))
    );
  }

  function handleSubmit(formData: FormData) {
    // Attach pets as JSON
    formData.set("pets", JSON.stringify(pets));

    startTransition(async () => {
      const result = await addCustomerWithPets(formData);
      if (result.success) {
        setError(null);
        setSuccess(true);
        setTimeout(() => handleClose(), 1200);
      } else {
        setError(result.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <>
      {/* Add Client Button */}
      <button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 z-40 px-6 py-3.5 rounded-2xl bg-sage-400 text-white shadow-lg hover:bg-sage-500 hover:shadow-xl active:scale-95 transition-all duration-200 flex items-center gap-2 cursor-pointer font-medium text-base"
      >
        <PlusIcon className="w-5 h-5" />
        Add Client
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-sage-900/20 backdrop-blur-sm animate-fade-in"
            onClick={handleClose}
          />

          {/* Panel */}
          <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-6 sm:p-8 shadow-xl animate-slide-up max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-sage-800">
                Add New Customer
              </h2>
              <button
                onClick={handleClose}
                className="p-2 -mr-2 rounded-lg text-sage-400 hover:bg-sage-50 transition-colors cursor-pointer"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {success ? (
              <div className="text-center py-8">
                <CheckCircleIcon className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <p className="text-base font-medium text-sage-700">
                  Customer added!
                </p>
              </div>
            ) : (
              <form action={handleSubmit} className="space-y-4">
                {/* ── Client Info ── */}
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-sage-600 uppercase tracking-wide">
                    Owner Details
                  </p>

                  <div>
                    <label
                      htmlFor="fullName"
                      className="block text-sm font-medium text-sage-700 mb-1.5"
                    >
                      Full Name
                    </label>
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      required
                      autoFocus
                      placeholder="e.g. Sarah Johnson"
                      className="w-full px-4 py-3.5 text-base rounded-lg border border-warm-gray bg-soft-white text-sage-800 placeholder:text-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-transparent transition-colors"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="phone"
                      className="block text-sm font-medium text-sage-700 mb-1.5"
                    >
                      Phone
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      required
                      placeholder="e.g. 555-123-4567"
                      className="w-full px-4 py-3.5 text-base rounded-lg border border-warm-gray bg-soft-white text-sage-800 placeholder:text-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-transparent transition-colors"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-sage-700 mb-1.5"
                    >
                      Email
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="e.g. sarah@example.com"
                      className="w-full px-4 py-3.5 text-base rounded-lg border border-warm-gray bg-soft-white text-sage-800 placeholder:text-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-transparent transition-colors"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="notes"
                      className="block text-sm font-medium text-sage-700 mb-1.5"
                    >
                      Notes
                    </label>
                    <textarea
                      id="notes"
                      name="notes"
                      rows={2}
                      placeholder="e.g. Prefers morning appointments"
                      className="w-full px-4 py-3 text-base rounded-lg border border-warm-gray bg-soft-white text-sage-800 placeholder:text-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-transparent transition-colors resize-none"
                    />
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-warm-gray/50 pt-4">
                  <p className="text-sm font-semibold text-sage-600 uppercase tracking-wide mb-3">
                    Pets
                  </p>
                </div>

                {/* ── Pet Entries ── */}
                {pets.map((pet, index) => (
                  <div
                    key={index}
                    className="space-y-3 p-4 rounded-xl bg-sage-50/50 border border-sage-100"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-sage-600">
                        Pet {pets.length > 1 ? `#${index + 1}` : ""}
                      </p>
                      {pets.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePetEntry(index)}
                          className="p-1.5 rounded-lg text-sage-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                          aria-label={`Remove pet ${index + 1}`}
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-sage-700 mb-1.5">
                        Pet Name
                      </label>
                      <input
                        type="text"
                        required
                        value={pet.name}
                        onChange={(e) =>
                          updatePet(index, "name", e.target.value)
                        }
                        placeholder="e.g. Buddy"
                        className="w-full px-4 py-3.5 text-base rounded-lg border border-warm-gray bg-white text-sage-800 placeholder:text-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-transparent transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-sage-700 mb-1.5">
                        Breed
                      </label>
                      <input
                        type="text"
                        value={pet.breed}
                        onChange={(e) =>
                          updatePet(index, "breed", e.target.value)
                        }
                        placeholder="e.g. Golden Retriever"
                        className="w-full px-4 py-3.5 text-base rounded-lg border border-warm-gray bg-white text-sage-800 placeholder:text-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-transparent transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-sage-700 mb-1.5">
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        value={pet.dateOfBirth}
                        onChange={(e) =>
                          updatePet(index, "dateOfBirth", e.target.value)
                        }
                        max={new Date().toISOString().split("T")[0]}
                        className="w-full px-4 py-3.5 text-base rounded-lg border border-warm-gray bg-white text-sage-800 placeholder:text-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-transparent transition-colors"
                      />
                    </div>
                  </div>
                ))}

                {/* Add another pet button */}
                <button
                  type="button"
                  onClick={addPetEntry}
                  className="w-full py-3 rounded-lg border-2 border-dashed border-sage-200 text-sage-500 text-sm font-medium hover:border-sage-300 hover:text-sage-600 hover:bg-sage-50/50 transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add another pet
                </button>

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
                  {isPending ? "Saving..." : "Add Customer"}
                </Button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
