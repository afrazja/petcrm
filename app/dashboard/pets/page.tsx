import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PawPrintIcon, ChevronLeftIcon } from "@/components/icons";

export default async function PetsPage() {
  const supabase = await createClient();

  const { data: pets } = await supabase
    .from("pets")
    .select(
      `
      id,
      name,
      breed,
      created_at,
      clients!inner ( full_name, phone )
    `
    )
    .order("created_at", { ascending: false });

  const formattedPets = (pets ?? []).map((pet) => ({
    id: pet.id,
    name: pet.name,
    breed: pet.breed,
    createdAt: pet.created_at,
    ownerName: (pet.clients as unknown as { full_name: string })?.full_name ?? "Unknown",
    ownerPhone: (pet.clients as unknown as { phone: string | null })?.phone ?? null,
  }));

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

      {formattedPets.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-warm-gray/50 text-center">
          <PawPrintIcon className="w-12 h-12 text-sage-300 mx-auto mb-3" />
          <p className="text-sage-500">
            No pets yet. Check in your first pet from the dashboard.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-warm-gray/50">
          <div className="px-4 py-2">
            {formattedPets.map((pet) => (
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
                  {pet.breed && (
                    <p className="text-sm text-sage-500 truncate">{pet.breed}</p>
                  )}
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
