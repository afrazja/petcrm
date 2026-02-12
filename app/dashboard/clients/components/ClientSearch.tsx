"use client";

import { useState, useMemo } from "react";
import { SearchIcon, UsersIcon } from "@/components/icons";
import ClientCard from "./ClientCard";

type PetSummary = {
  id: string;
  name: string;
  ageLabel: string | null;
};

type VisitRecord = {
  id: string;
  petName: string;
  service: string;
  price: number;
  completedAt: string;
  notes: string | null;
  duration: number;
  status: string;
};

type ClientData = {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  pets: PetSummary[];
  lastVisit: string | null;
  totalSpent: number;
  visits: VisitRecord[];
};

type ServicePreset = { name: string; defaultPrice: number; defaultDuration: number };

export default function ClientSearch({ clients, servicePresets = [] }: { clients: ClientData[]; servicePresets?: ServicePreset[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return clients;

    const textQ = query.toLowerCase();

    return clients.filter((client) => {
      // Match by name
      if (client.fullName.toLowerCase().includes(textQ)) return true;

      // Match by phone (compare digits only)
      if (client.phone) {
        const phoneDigits = client.phone.replace(/\D/g, "");
        const queryDigits = query.replace(/\D/g, "");
        if (queryDigits.length > 0 && phoneDigits.includes(queryDigits))
          return true;
      }

      // Match by pet name
      if (client.pets.some((pet) => pet.name.toLowerCase().includes(textQ)))
        return true;

      return false;
    });
  }, [clients, query]);

  return (
    <div>
      {/* Search bar */}
      <div className="relative mb-6">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-sage-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, phone, or pet..."
          className="w-full pl-12 pr-4 py-3.5 bg-white border border-warm-gray/50 rounded-2xl text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-300 text-base shadow-sm"
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

      {/* Client list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-warm-gray/50 text-center">
          <UsersIcon className="w-12 h-12 text-sage-300 mx-auto mb-3" />
          <p className="text-sage-500">
            {query
              ? "No clients match your search."
              : "No clients yet. Check in your first pet from the dashboard."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((client) => (
            <ClientCard
              key={client.id}
              id={client.id}
              fullName={client.fullName}
              phone={client.phone}
              email={client.email}
              notes={client.notes}
              pets={client.pets}
              lastVisit={client.lastVisit}
              totalSpent={client.totalSpent}
              visits={client.visits}
              servicePresets={servicePresets}
            />
          ))}
        </div>
      )}
    </div>
  );
}
