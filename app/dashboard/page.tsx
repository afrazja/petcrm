import { CalendarIcon, UsersIcon, PawPrintIcon, DollarIcon } from "@/components/icons";
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

  // Date boundaries
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // Week start (Sunday)
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  // Month start
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  let todayCount = 0;
  let formattedPets: {
    id: string;
    name: string;
    breed: string | null;
    ownerPhone: string | null;
    checkedInAt: string;
  }[] = [];

  // Revenue data
  let todayRevenue = 0;
  let weekRevenue = 0;
  let monthRevenue = 0;
  let serviceBreakdown: { service: string; total: number; count: number }[] = [];

  try {
    // Fetch today's check-ins
    const { data: todaysAppointments } = await supabase
      .from("appointments")
      .select(
        `
        id,
        completed_at,
        pets!inner ( id, name, breed ),
        clients!inner ( phone )
      `
      )
      .gte("completed_at", todayStart.toISOString())
      .lte("completed_at", todayEnd.toISOString())
      .order("completed_at", { ascending: false });

    formattedPets = (todaysAppointments ?? []).map((appt) => {
      const pet = appt.pets as unknown as {
        id: string;
        name: string;
        breed: string | null;
      };
      const client = appt.clients as unknown as { phone: string | null };
      return {
        id: pet.id,
        name: pet.name,
        breed: pet.breed,
        ownerPhone: client?.phone ?? null,
        checkedInAt: appt.completed_at,
      };
    });

    todayCount = formattedPets.length;

    // Fetch this month's appointments for revenue
    const { data: monthAppointments } = await supabase
      .from("appointments")
      .select("price, completed_at, service")
      .gte("completed_at", monthStart.toISOString())
      .not("price", "is", null);

    const revenueData = monthAppointments ?? [];

    // Aggregate revenue
    const serviceMap = new Map<string, { total: number; count: number }>();

    for (const appt of revenueData) {
      const price = Number(appt.price) || 0;
      const completedAt = new Date(appt.completed_at);

      // Month total
      monthRevenue += price;

      // Week total
      if (completedAt >= weekStart) {
        weekRevenue += price;
      }

      // Today total
      if (completedAt >= todayStart && completedAt <= todayEnd) {
        todayRevenue += price;
      }

      // Service breakdown
      const svc = appt.service || "Other";
      const existing = serviceMap.get(svc);
      if (existing) {
        existing.total += price;
        existing.count += 1;
      } else {
        serviceMap.set(svc, { total: price, count: 1 });
      }
    }

    serviceBreakdown = Array.from(serviceMap.entries())
      .map(([service, data]) => ({ service, ...data }))
      .sort((a, b) => b.total - a.total);
  } catch {
    // appointments table may not exist yet
  }

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

  const revenueStats = [
    { label: "Today's Revenue", value: `$${todayRevenue.toFixed(2)}`, icon: DollarIcon },
    { label: "This Week", value: `$${weekRevenue.toFixed(2)}`, icon: DollarIcon },
    { label: "This Month", value: `$${monthRevenue.toFixed(2)}`, icon: DollarIcon },
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {revenueStats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-2xl p-6 shadow-sm border border-warm-gray/50"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-bold text-sage-800">{stat.value}</p>
            <p className="mt-1 text-sm text-sage-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Service Breakdown */}
      {serviceBreakdown.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-warm-gray/50 p-6 mb-8">
          <h3 className="text-lg font-semibold text-sage-700 mb-4">
            Service Breakdown
            <span className="text-sm font-normal text-sage-400 ml-2">This Month</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-sage-400 text-left border-b border-warm-gray/30">
                  <th className="pb-2 font-medium">Service</th>
                  <th className="pb-2 font-medium text-center">Visits</th>
                  <th className="pb-2 font-medium text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {serviceBreakdown.map(({ service, total, count }) => (
                  <tr
                    key={service}
                    className="border-b border-warm-gray/20 last:border-b-0"
                  >
                    <td className="py-2.5 text-sage-700">{service}</td>
                    <td className="py-2.5 text-center text-sage-500">{count}</td>
                    <td className="py-2.5 text-right text-sage-700 font-medium">
                      ${total.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Today's Pets */}
      <TodaysPetsList pets={formattedPets} />

      {/* Quick Check-In FAB + Modal */}
      <QuickCheckIn />
    </div>
  );
}
