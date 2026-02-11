import Link from "next/link";
import { PawPrintIcon, PhoneIcon } from "@/components/icons";

type TodaysPet = {
  id: string;
  name: string;
  breed: string | null;
  ownerPhone: string | null;
  checkedInAt: string;
};

export default function TodaysPetsList({ pets }: { pets: TodaysPet[] }) {
  if (pets.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-warm-gray/50">
        <h3 className="text-lg font-semibold text-sage-700 mb-2">
          Today&apos;s Pets
        </h3>
        <p className="text-sage-400 text-sm">
          No pets checked in today yet. Tap the + button to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-warm-gray/50">
      <div className="px-6 pt-6 pb-2">
        <h3 className="text-lg font-semibold text-sage-700">
          Today&apos;s Pets
          <span className="ml-2 text-sm font-normal text-sage-400">
            ({pets.length})
          </span>
        </h3>
      </div>
      <div className="px-4 pb-4">
        {pets.map((pet) => {
          const time = new Date(pet.checkedInAt).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          });
          return (
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
                {pet.ownerPhone && (
                  <p className="text-sm text-sage-500 flex items-center gap-1 justify-end">
                    <PhoneIcon className="w-3.5 h-3.5" />
                    {pet.ownerPhone}
                  </p>
                )}
                <p className="text-xs text-sage-400">{time}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
