import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ChevronLeftIcon } from "@/components/icons";
import PetSearch from "./components/PetSearch";
import AddPetModal from "./components/AddPetModal";

export default async function PetsPage() {
  const supabase = await createClient();

  const { data: pets } = await supabase
    .from("pets")
    .select(
      `
      id,
      name,
      breed,
      date_of_birth,
      weight,
      created_at,
      clients!inner ( full_name, phone )
    `
    )
    .order("created_at", { ascending: false });

  // Fetch clients for the Add Pet modal's client picker
  const { data: clientRows } = await supabase
    .from("clients")
    .select("id, full_name, phone")
    .order("full_name", { ascending: true });

  const clientOptions = (clientRows ?? []).map((c) => ({
    id: c.id as string,
    fullName: c.full_name as string,
    phone: c.phone as string | null,
  }));

  const formattedPets = (pets ?? []).map((pet) => {
    // Calculate age label
    let ageLabel: string | null = null;
    if (pet.date_of_birth) {
      const dob = new Date(pet.date_of_birth);
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
        ageLabel = `${years}yr${months > 0 ? ` ${months}mo` : ""}`;
      } else {
        ageLabel = `${months}mo`;
      }
    }

    return {
      id: pet.id,
      name: pet.name,
      breed: pet.breed,
      ageLabel,
      weight: (pet as unknown as { weight: number | null }).weight,
      createdAt: pet.created_at,
      ownerName: (pet.clients as unknown as { full_name: string })?.full_name ?? "Unknown",
      ownerPhone: (pet.clients as unknown as { phone: string | null })?.phone ?? null,
    };
  });

  return (
    <div>
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sage-500 hover:text-sage-700 text-sm mb-4 transition-colors"
        >
          <ChevronLeftIcon className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <h2 className="text-2xl font-bold text-sage-800">All Pets</h2>
        <p className="mt-1 text-sage-500">
          {formattedPets.length} pet{formattedPets.length !== 1 ? "s" : ""} in your records.
        </p>
      </div>

      <PetSearch pets={formattedPets} />

      <AddPetModal clients={clientOptions} />
    </div>
  );
}
