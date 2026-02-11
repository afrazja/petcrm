import { CalendarIcon, UsersIcon, PawPrintIcon } from "@/components/icons";
import { createClient } from "@/lib/supabase/server";
import QuickCheckIn from "./components/QuickCheckIn";
import TodaysPetsList from "./components/TodaysPetsList";

export default async function DashboardPage() {
  const supabase = await createClient();

  // Fetch real stats — RLS scopes to current user automatically
  const { count: clientCount } = await supabase
    .from("clients")
    .select("*", { count: "exact", head: true });

  const { count: petCount } = await supabase
    .from("pets")
    .select("*", { count: "exact", head: true });

  // Fetch today's pets with owner phone via join
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const { data: todaysPets } = await supabase
    .from("pets")
    .select(
      `
      id,
      name,
      breed,
      created_at,
      clients!inner ( phone )
    `
    )
    .gte("created_at", todayStart.toISOString())
    .lte("created_at", todayEnd.toISOString())
    .order("created_at", { ascending: false });

  const formattedPets = (todaysPets ?? []).map((pet) => ({
    id: pet.id,
    name: pet.name,
    breed: pet.breed,
    ownerPhone:
      (pet.clients as unknown as { phone: string | null })?.phone ?? null,
    checkedInAt: pet.created_at,
  }));

  const todayCount = formattedPets.length;

  const stats = [
    {
      label: "Today's Check-Ins",
      value: String(todayCount),
      icon: CalendarIcon,
    },
    {
      label: "Total Clients",
      value: String(clientCount ?? 0),
      icon: UsersIcon,
    },
    { label: "Total Pets", value: String(petCount ?? 0), icon: PawPrintIcon },
  ];

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-sage-800">Welcome back</h2>
        <p className="mt-1 text-sage-500">
          Here&apos;s what&apos;s happening with your grooming business today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-2xl p-6 shadow-sm border border-warm-gray/50"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-sage-50 flex items-center justify-center text-sage-400">
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-bold text-sage-800">{stat.value}</p>
            <p className="mt-1 text-sm text-sage-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Today's Pets */}
      <TodaysPetsList pets={formattedPets} />

      {/* Quick Check-In FAB + Modal */}
      <QuickCheckIn />
    </div>
  );
}
