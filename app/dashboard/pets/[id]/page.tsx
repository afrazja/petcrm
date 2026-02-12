import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  ChevronLeftIcon,
  PawPrintIcon,
  PhoneIcon,
  WhatsAppIcon,
} from "@/components/icons";
import type { HealthMapMarker } from "@/lib/types/database";
import HealthMap from "./components/HealthMap";
import EditPetModal from "./components/EditPetModal";
import DeletePetButton from "./components/DeletePetButton";

export default async function PetProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: pet, error } = await supabase
    .from("pets")
    .select(
      `
      id,
      name,
      breed,
      date_of_birth,
      vaccine_expiry_date,
      notes,
      health_map,
      created_at,
      clients!inner ( id, full_name, phone )
    `
    )
    .eq("id", id)
    .single();

  if (error || !pet) {
    notFound();
  }

  const client = pet.clients as unknown as {
    id: string;
    full_name: string;
    phone: string | null;
  };

  const markers: HealthMapMarker[] =
    (pet.health_map as HealthMapMarker[] | null) ?? [];

  // Calculate age from date_of_birth
  const dob = pet.date_of_birth ? new Date(pet.date_of_birth) : null;
  let ageLabel: string | null = null;
  if (dob) {
    const now = new Date();
    let years = now.getFullYear() - dob.getFullYear();
    let months = now.getMonth() - dob.getMonth();
    if (months < 0) {
      years--;
      months += 12;
    }
    if (now.getDate() < dob.getDate()) {
      months--;
      if (months < 0) {
        years--;
        months += 12;
      }
    }
    if (years > 0) {
      ageLabel = `${years} yr${years !== 1 ? "s" : ""}${months > 0 ? ` ${months} mo` : ""}`;
    } else {
      ageLabel = `${months} mo${months !== 1 ? "s" : ""}`;
    }
  }

  const vaccineExpiry = pet.vaccine_expiry_date
    ? new Date(pet.vaccine_expiry_date)
    : null;
  const isVaccineExpired =
    vaccineExpiry && vaccineExpiry < new Date();

  // Format phone for display: 5551234567 → (555) 123-4567
  const formatPhone = (phone: string) => {
    if (phone.length === 10) {
      return `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`;
    }
    if (phone.length === 11 && phone.startsWith("1")) {
      return `+1 (${phone.slice(1, 4)}) ${phone.slice(4, 7)}-${phone.slice(7)}`;
    }
    return phone;
  };

  // Build WhatsApp pickup link — $0 API cost, just a wa.me URL
  // wa.me requires E.164 format (country code + number, no +)
  // Prepend "1" for 10-digit US/Canada numbers; leave others as-is
  const pickupMessage = `Hi! ${pet.name} is all finished and ready to go home! 🐾`;
  let whatsappPhone = client.phone;
  if (whatsappPhone && whatsappPhone.length === 10) {
    whatsappPhone = `1${whatsappPhone}`;
  }
  const whatsappUrl = whatsappPhone
    ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(pickupMessage)}`
    : null;

  return (
    <div>
      {/* Back nav */}
      <Link
        href="/dashboard/pets"
        className="inline-flex items-center gap-1 text-sage-500 hover:text-sage-700 text-sm mb-6 transition-colors"
      >
        <ChevronLeftIcon className="w-4 h-4" />
        All Pets
      </Link>

      {/* Pet header */}
      <div className="bg-white rounded-2xl shadow-sm border border-warm-gray/50 p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-sage-50 flex items-center justify-center text-sage-400 flex-shrink-0">
            <PawPrintIcon className="w-7 h-7" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-sage-800">{pet.name}</h2>
              <EditPetModal
                pet={{
                  id: pet.id,
                  name: pet.name,
                  breed: pet.breed,
                  dateOfBirth: pet.date_of_birth,
                  vaccineExpiryDate: pet.vaccine_expiry_date,
                  notes: pet.notes,
                }}
              />
            </div>
            {pet.breed && (
              <p className="text-sage-500 mt-0.5">{pet.breed}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              <span className="text-sage-600">
                Owner: <span className="font-medium">{client.full_name}</span>
              </span>
              {client.phone && (
                <span className="text-sage-500 flex items-center gap-1">
                  <PhoneIcon className="w-3.5 h-3.5" />
                  {formatPhone(client.phone!)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
          <div className="bg-sage-50/50 rounded-xl px-4 py-3">
            <p className="text-xs text-sage-400 mb-0.5">Age</p>
            <p className="text-sm font-medium text-sage-700">
              {ageLabel ?? "Not set"}
            </p>
            {dob && (
              <p className="text-xs text-sage-400 mt-0.5">
                Born{" "}
                {dob.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            )}
          </div>
          <div className="bg-sage-50/50 rounded-xl px-4 py-3">
            <p className="text-xs text-sage-400 mb-0.5">Added</p>
            <p className="text-sm font-medium text-sage-700">
              {new Date(pet.created_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div
            className={`rounded-xl px-4 py-3 ${
              isVaccineExpired
                ? "bg-red-50"
                : vaccineExpiry
                ? "bg-sage-50/50"
                : "bg-warm-gray/30"
            }`}
          >
            <p className="text-xs text-sage-400 mb-0.5">Vaccine Expiry</p>
            <p
              className={`text-sm font-medium ${
                isVaccineExpired ? "text-red-600" : "text-sage-700"
              }`}
            >
              {vaccineExpiry
                ? vaccineExpiry.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "Not set"}
              {isVaccineExpired && " (Expired)"}
            </p>
          </div>
        </div>

        {/* Notes */}
        {pet.notes && (
          <div className="mt-4 pt-4 border-t border-warm-gray/30">
            <p className="text-xs text-sage-400 mb-1">Notes</p>
            <p className="text-sm text-sage-600">{pet.notes}</p>
          </div>
        )}
      </div>

      {/* Ready for Pickup — WhatsApp */}
      {whatsappUrl ? (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-3 w-full mb-6 px-6 py-4 bg-[#25D366] hover:bg-[#1da851] text-white font-semibold text-lg rounded-2xl shadow-sm active:scale-[0.98] transition-all"
        >
          <WhatsAppIcon className="w-6 h-6" />
          Ready for Pickup
        </a>
      ) : (
        <div className="flex items-center justify-center gap-3 w-full mb-6 px-6 py-4 bg-warm-gray/50 text-sage-400 font-semibold text-lg rounded-2xl cursor-not-allowed">
          <WhatsAppIcon className="w-6 h-6" />
          Ready for Pickup
          <span className="text-sm font-normal">(No phone number)</span>
        </div>
      )}

      {/* Health Map */}
      <HealthMap petId={pet.id} initialMarkers={markers} />

      {/* Delete Pet */}
      <div className="mt-6">
        <DeletePetButton petId={pet.id} petName={pet.name} />
      </div>
    </div>
  );
}
