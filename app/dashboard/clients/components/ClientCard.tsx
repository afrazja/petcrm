"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  PhoneIcon,
  PawPrintIcon,
  ClockIcon,
  DollarIcon,
  PlusIcon,
  ChevronLeftIcon,
  ScissorsIcon,
  TrashIcon,
} from "@/components/icons";
import LogVisitModal from "./LogVisitModal";
import EditClientModal from "./EditClientModal";
import { deleteClient } from "@/app/dashboard/actions";

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
};

type ServicePreset = { name: string; defaultPrice: number };

type ClientCardProps = {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  pets: PetSummary[];
  lastVisit: string | null;
  totalSpent: number;
  visits: VisitRecord[];
  servicePresets?: ServicePreset[];
};

export default function ClientCard({
  id,
  fullName,
  phone,
  email,
  notes,
  pets,
  lastVisit,
  totalSpent,
  visits,
  servicePresets = [],
}: ClientCardProps) {
  const [showModal, setShowModal] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();

  // Calculate "DUE" badge: last visit > 6 weeks ago
  const sixWeeksMs = 6 * 7 * 24 * 60 * 60 * 1000;
  const isDue =
    lastVisit != null &&
    new Date().getTime() - new Date(lastVisit).getTime() > sixWeeksMs;

  const lastVisitFormatted = lastVisit
    ? new Date(lastVisit).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "No visits yet";

  function handleDelete() {
    startDeleteTransition(async () => {
      await deleteClient(id);
      setShowDeleteConfirm(false);
    });
  }

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-warm-gray/50 p-5 hover:shadow-md transition-shadow">
        {/* Top row: name + action buttons + DUE badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-sage-800 truncate">
              {fullName}
            </h3>
            {phone && (
              <a
                href={`tel:${phone}`}
                className="inline-flex items-center gap-1.5 mt-1 text-sm text-sage-500 hover:text-sage-700 transition-colors"
              >
                <PhoneIcon className="w-3.5 h-3.5" />
                <span>{phone}</span>
              </a>
            )}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {isDue && (
              <span className="px-2.5 py-1 text-xs font-bold bg-red-50 text-red-600 rounded-full uppercase tracking-wide mr-1">
                Due
              </span>
            )}
            <EditClientModal
              client={{ id, fullName, phone, email, notes }}
            />
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1.5 rounded-lg text-sage-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
              aria-label="Delete client"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Delete confirmation */}
        {showDeleteConfirm && (
          <div className="mt-3 p-3 bg-red-50 rounded-xl border border-red-200">
            <p className="text-sm text-red-700 mb-3">
              Delete <strong>{fullName}</strong>? This removes{" "}
              {pets.length > 0
                ? `${pets.length} pet${pets.length !== 1 ? "s" : ""} and all`
                : "all"}{" "}
              visit history. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 text-sm font-medium text-sage-600 bg-white border border-warm-gray/50 rounded-lg hover:bg-sage-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        )}

        {/* Pet pills */}
        {pets.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {pets.map((pet) => (
              <Link
                key={pet.id}
                href={`/dashboard/pets/${pet.id}`}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-sage-50 text-sage-600 text-xs font-medium rounded-full hover:bg-sage-100 transition-colors"
              >
                <PawPrintIcon className="w-3 h-3" />
                {pet.name}
                {pet.ageLabel && (
                  <span className="text-sage-400 ml-0.5">({pet.ageLabel})</span>
                )}
              </Link>
            ))}
          </div>
        )}

        {/* Stats row: last visit + total spent */}
        <div className="mt-4 pt-3 border-t border-warm-gray/30 flex items-center justify-between text-sm">
          <div className="flex items-center gap-1.5 text-sage-500">
            <ClockIcon className="w-3.5 h-3.5" />
            <span>{lastVisitFormatted}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sage-600 font-medium">
            <DollarIcon className="w-3.5 h-3.5" />
            <span>${totalSpent.toFixed(2)}</span>
          </div>
        </div>

        {/* Action row: Log Visit + View History */}
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => setShowModal(true)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-sage-400 hover:bg-sage-500 text-white text-sm font-semibold rounded-xl active:scale-[0.98] transition-all"
          >
            <PlusIcon className="w-4 h-4" />
            Log Visit
          </button>
          {visits.length > 0 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center justify-center gap-1 px-3 py-2.5 border border-warm-gray/50 text-sage-500 hover:text-sage-700 hover:border-sage-300 text-sm font-medium rounded-xl transition-colors"
            >
              <ChevronLeftIcon
                className={`w-4 h-4 transition-transform duration-200 ${
                  expanded ? "rotate-90" : "-rotate-90"
                }`}
              />
              {visits.length}
            </button>
          )}
        </div>

        {/* Expandable visit history */}
        {expanded && visits.length > 0 && (
          <div className="mt-3 pt-3 border-t border-warm-gray/30 space-y-2">
            <p className="text-xs font-semibold text-sage-500 uppercase tracking-wide mb-2">
              Visit History
            </p>
            {visits.map((visit) => (
              <div
                key={visit.id}
                className="flex items-center gap-3 px-3 py-2 bg-sage-50/50 rounded-lg text-sm"
              >
                <ScissorsIcon className="w-3.5 h-3.5 text-sage-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sage-700 font-medium">
                    {visit.service}
                  </span>
                  <span className="text-sage-400 mx-1.5">&middot;</span>
                  <span className="text-sage-500">{visit.petName}</span>
                </div>
                <div className="flex-shrink-0 text-right">
                  <span className="text-sage-700 font-medium">
                    ${visit.price.toFixed(2)}
                  </span>
                  <p className="text-xs text-sage-400">
                    {new Date(visit.completedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Log Visit Modal */}
      {showModal && (
        <LogVisitModal
          clientId={id}
          clientName={fullName}
          pets={pets}
          servicePresets={servicePresets}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
