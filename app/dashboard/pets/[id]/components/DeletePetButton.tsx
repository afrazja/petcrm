"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TrashIcon } from "@/components/icons";
import { deletePet } from "@/app/dashboard/actions";

type Props = {
  petId: string;
  petName: string;
};

export default function DeletePetButton({ petId, petName }: Props) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    startTransition(async () => {
      const result = await deletePet(petId);
      if (result.success) {
        router.push("/dashboard/pets");
      }
    });
  }

  if (!showConfirm) {
    return (
      <button
        onClick={() => setShowConfirm(true)}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-50 text-red-600 font-medium rounded-xl hover:bg-red-100 transition-colors cursor-pointer"
      >
        <TrashIcon className="w-4 h-4" />
        Delete Pet
      </button>
    );
  }

  return (
    <div className="p-4 bg-red-50 rounded-xl border border-red-200">
      <p className="text-sm text-red-700 mb-3">
        Delete <strong>{petName}</strong>? This removes all visit history for
        this pet. This cannot be undone.
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => setShowConfirm(false)}
          className="flex-1 py-2.5 text-sm font-medium text-sage-600 bg-white border border-warm-gray/50 rounded-lg hover:bg-sage-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="flex-1 py-2.5 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
        >
          {isDeleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
  );
}
