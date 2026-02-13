"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { SearchIcon, PawPrintIcon } from "@/components/icons";

type PetData = {
  id: string;
  name: string;
  breed: string | null;
  ageLabel: string | null;
  weight: number | null;
  createdAt: string;
  ownerName: string;
  ownerPhone: string | null;
};

export default function PetSearch({ pets }: { pets: PetData[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return pets;

    const textQ = query.toLowerCase();

    return pets.filter((pet) => {
      // Match by pet name
      if (pet.name.toLowerCase().includes(textQ)) return true;

      // Match by breed
      if (pet.breed?.toLowerCase().includes(textQ)) return true;

      // Match by owner name
      if (pet.ownerName.toLowerCase().includes(textQ)) return true;

      // Match by owner phone (digits only)
      if (pet.ownerPhone) {
        const phoneDigits = pet.ownerPhone.replace(/\D/g, "");
        const queryDigits = query.replace(/\D/g, "");
        if (queryDigits.length > 0 && phoneDigits.includes(queryDigits))
          return true;
      }

      return false;
    });
  }, [pets, query]);

  return (
    <div>
      {/* Search bar */}
      <div className="relative mb-6">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-sage-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by pet name, breed, or owner..."
          className="w-full pl-12 pr-4 py-3.5 bg-white border border-warm-gray/50 rounded-lg text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-300 text-base shadow-sm"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-sage-400 hover:text-sage-600 text-sm font-medium transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Results count */}
      {query && (
        <p className="text-sm text-sage-400 mb-4">
          {filtered.length} result{filtered.length !== 1 ? "s" : ""} for &ldquo;
          {query}&rdquo;
        </p>
      )}

      {/* Pet list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-warm-gray/50 text-center">
          <PawPrintIcon className="w-12 h-12 text-sage-300 mx-auto mb-3" />
          <p className="text-sage-500">
            {query
              ? "No pets match your search."
              : "No pets yet. Check in your first pet from the dashboard."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-warm-gray/50">
          <div className="px-4 py-2">
            {filtered.map((pet) => (
              <Link
                key={pet.id}
                href={`/dashboard/pets/${pet.id}`}
                className="flex items-center gap-4 py-4 px-2 border-b border-warm-gray/30 last:border-b-0 hover:bg-sage-50/50 rounded-xl transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-sage-50 flex items-center justify-center text-sage-400 flex-shrink-0">
                  <PawPrintIcon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sage-800 truncate">
                    {pet.name}
                  </p>
                  <p className="text-sm text-sage-500 truncate">
                    {[pet.breed, pet.ageLabel, pet.weight ? `${pet.weight} lbs` : null].filter(Boolean).join(" · ") ||
                      "No details"}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm text-sage-500">{pet.ownerName}</p>
                  <p className="text-xs text-sage-400">
                    {new Date(pet.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
