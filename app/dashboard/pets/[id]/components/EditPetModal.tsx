"use client";

import { useState, useEffect, useTransition } from "react";
import { PencilIcon, XIcon } from "@/components/icons";
import { editPet } from "@/app/dashboard/actions";
import Button from "@/components/ui/Button";

type Props = {
  pet: {
    id: string;
    name: string;
    breed: string | null;
    dateOfBirth: string | null;
    weight: number | null;
    vaccineExpiryDate: string | null;
    notes: string | null;
  };
};

export default function EditPetModal({ pet }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
      const result = await editPet(formData);
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
      <button
        onClick={() => {
          setIsOpen(true);
          setError(null);
        }}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-sage-500 hover:text-sage-700 hover:bg-sage-50 rounded-lg transition-colors cursor-pointer"
        aria-label="Edit pet"
      >
        <PencilIcon className="w-4 h-4" />
        Edit
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-sage-900/20 backdrop-blur-sm animate-fade-in"
            onClick={() => setIsOpen(false)}
          />

          <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-6 sm:p-8 shadow-xl animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-sage-800">Edit Pet</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 -mr-2 rounded-lg text-sage-400 hover:bg-sage-50 transition-colors cursor-pointer"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <form action={handleSubmit} className="space-y-4">
              <input type="hidden" name="petId" value={pet.id} />
              <div>
                <label htmlFor="editPetName" className="block text-sm font-medium text-sage-700 mb-1.5">
                  Pet Name
                </label>
                <input
                  id="editPetName"
                  name="name"
                  type="text"
                  required
                  autoFocus
                  defaultValue={pet.name}
                  className="w-full px-4 py-3.5 text-base rounded-lg border border-warm-gray bg-soft-white text-sage-800 placeholder:text-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-transparent transition-colors"
                />
              </div>
              <div>
                <label htmlFor="editBreed" className="block text-sm font-medium text-sage-700 mb-1.5">
                  Breed
                </label>
                <input
                  id="editBreed"
                  name="breed"
                  type="text"
                  defaultValue={pet.breed ?? ""}
                  placeholder="e.g. Golden Retriever"
                  className="w-full px-4 py-3.5 text-base rounded-lg border border-warm-gray bg-soft-white text-sage-800 placeholder:text-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-transparent transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="editDob" className="block text-sm font-medium text-sage-700 mb-1.5">
                    Date of Birth
                  </label>
                  <input
                    id="editDob"
                    name="dateOfBirth"
                    type="date"
                    defaultValue={pet.dateOfBirth ?? ""}
                    className="w-full px-4 py-3.5 text-base rounded-lg border border-warm-gray bg-soft-white text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-transparent transition-colors"
                  />
                </div>
                <div>
                  <label htmlFor="editWeight" className="block text-sm font-medium text-sage-700 mb-1.5">
                    Weight (lbs)
                  </label>
                  <input
                    id="editWeight"
                    name="weight"
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min="0"
                    defaultValue={pet.weight ?? ""}
                    placeholder="e.g. 25"
                    className="w-full px-4 py-3.5 text-base rounded-lg border border-warm-gray bg-soft-white text-sage-800 placeholder:text-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-transparent transition-colors"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="editVaccine" className="block text-sm font-medium text-sage-700 mb-1.5">
                  Vaccine Expiry Date
                </label>
                <input
                  id="editVaccine"
                  name="vaccineExpiryDate"
                  type="date"
                  defaultValue={pet.vaccineExpiryDate ?? ""}
                  className="w-full px-4 py-3.5 text-base rounded-lg border border-warm-gray bg-soft-white text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-transparent transition-colors"
                />
              </div>
              <div>
                <label htmlFor="editPetNotes" className="block text-sm font-medium text-sage-700 mb-1.5">
                  Notes
                </label>
                <textarea
                  id="editPetNotes"
                  name="notes"
                  rows={3}
                  defaultValue={pet.notes ?? ""}
                  placeholder="e.g. Sensitive around ears, prefers warm water..."
                  className="w-full px-4 py-3.5 text-base rounded-lg border border-warm-gray bg-soft-white text-sage-800 placeholder:text-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-transparent transition-colors resize-none"
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm text-center">
                  {error}
                </div>
              )}

              <Button type="submit" size="lg" className="w-full mt-2" disabled={isPending}>
                {isPending ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
