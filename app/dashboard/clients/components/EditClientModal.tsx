"use client";

import { useState, useEffect, useTransition } from "react";
import { PencilIcon, XIcon } from "@/components/icons";
import { editClient } from "@/app/dashboard/actions";
import Button from "@/components/ui/Button";

type Props = {
  client: {
    id: string;
    fullName: string;
    phone: string | null;
    email: string | null;
    notes: string | null;
  };
};

export default function EditClientModal({ client }: Props) {
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
      const result = await editClient(formData);
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
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
          setError(null);
        }}
        className="p-1.5 rounded-lg text-sage-400 hover:text-sage-600 hover:bg-sage-50 transition-colors cursor-pointer"
        aria-label="Edit client"
      >
        <PencilIcon className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-sage-900/20 backdrop-blur-sm animate-fade-in"
            onClick={() => setIsOpen(false)}
          />

          <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-6 sm:p-8 shadow-xl animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-sage-800">
                Edit Client
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 -mr-2 rounded-lg text-sage-400 hover:bg-sage-50 transition-colors cursor-pointer"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <form action={handleSubmit} className="space-y-4">
              <input type="hidden" name="clientId" value={client.id} />
              <div>
                <label htmlFor="editFullName" className="block text-sm font-medium text-sage-700 mb-1.5">
                  Full Name
                </label>
                <input
                  id="editFullName"
                  name="fullName"
                  type="text"
                  required
                  autoFocus
                  defaultValue={client.fullName}
                  className="w-full px-4 py-3.5 text-base rounded-lg border border-warm-gray bg-soft-white text-sage-800 placeholder:text-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-transparent transition-colors"
                />
              </div>
              <div>
                <label htmlFor="editPhone" className="block text-sm font-medium text-sage-700 mb-1.5">
                  Phone
                </label>
                <input
                  id="editPhone"
                  name="phone"
                  type="tel"
                  defaultValue={client.phone ?? ""}
                  className="w-full px-4 py-3.5 text-base rounded-lg border border-warm-gray bg-soft-white text-sage-800 placeholder:text-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-transparent transition-colors"
                />
              </div>
              <div>
                <label htmlFor="editEmail" className="block text-sm font-medium text-sage-700 mb-1.5">
                  Email
                </label>
                <input
                  id="editEmail"
                  name="email"
                  type="email"
                  defaultValue={client.email ?? ""}
                  className="w-full px-4 py-3.5 text-base rounded-lg border border-warm-gray bg-soft-white text-sage-800 placeholder:text-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-transparent transition-colors"
                />
              </div>
              <div>
                <label htmlFor="editNotes" className="block text-sm font-medium text-sage-700 mb-1.5">
                  Notes
                </label>
                <textarea
                  id="editNotes"
                  name="notes"
                  rows={2}
                  defaultValue={client.notes ?? ""}
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
