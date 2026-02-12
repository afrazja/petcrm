import { CalendarIcon, UsersIcon, PawPrintIcon, DollarIcon } from "@/components/icons";
import { createClient } from "@/lib/supabase/server";
import QuickCheckIn from "./components/QuickCheckIn";
import TodaysPetsList from "./components/TodaysPetsList";
import Reminders from "./components/Reminders";

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

  // Reminder data
  let upcomingAppointments: {
    id: string;
    petName: string;
    service: string;
    ownerName: string;
    ownerPhone: string | null;
    scheduledAt: string;
  }[] = [];
  let overdueClients: {
    id: string;
    fullName: string;
    phone: string | null;
    petNames: string[];
    lastVisit: string;
    weeksOverdue: number;
  }[] = [];
  let expiringVaccines: {
    petId: string;
    petName: string;
    ownerName: string;
    ownerPhone: string | null;
    vaccineExpiry: string;
    daysUntilExpiry: number;
  }[] = [];

  try {
    // Fetch today's check-ins (only completed)
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
      .eq("status", "completed")
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

    // Fetch this month's completed appointments for revenue
    const { data: monthAppointments } = await supabase
      .from("appointments")
      .select("price, completed_at, service")
      .gte("completed_at", monthStart.toISOString())
      .eq("status", "completed")
      .not("price", "is", null);

    const revenueData = monthAppointments ?? [];

    // Aggregate revenue
    const serviceMap = new Map<string, { total: number; count: number }>();

    for (const appt of revenueData) {
      const price = Number(appt.price) || 0;
      const completedAt = new Date(appt.completed_at);

      monthRevenue += price;
      if (completedAt >= weekStart) weekRevenue += price;
      if (completedAt >= todayStart && completedAt <= todayEnd) todayRevenue += price;

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

    // --- REMINDERS ---

    // 1. Upcoming appointments (next 7 days, starting tomorrow)
    const tomorrowStart = new Date();
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);
    const weekAhead = new Date();
    weekAhead.setDate(weekAhead.getDate() + 7);
    weekAhead.setHours(23, 59, 59, 999);

    const { data: upcomingAppts } = await supabase
      .from("appointments")
      .select(
        "id, service, completed_at, pets!inner(name, clients!inner(full_name, phone))"
      )
      .eq("status", "scheduled")
      .gte("completed_at", tomorrowStart.toISOString())
      .lte("completed_at", weekAhead.toISOString())
      .order("completed_at", { ascending: true })
      .limit(10);

    upcomingAppointments = (upcomingAppts ?? []).map((appt) => {
      const pet = appt.pets as unknown as {
        name: string;
        clients: { full_name: string; phone: string | null };
      };
      return {
        id: appt.id,
        petName: pet.name,
        service: appt.service,
        ownerName: pet.clients?.full_name ?? "Unknown",
        ownerPhone: pet.clients?.phone ?? null,
        scheduledAt: appt.completed_at,
      };
    });

    // 2. Overdue clients (last visit >6 weeks ago)
    const sixWeeksAgo = new Date();
    sixWeeksAgo.setDate(sixWeeksAgo.getDate() - 42);

    const { data: allClients } = await supabase
      .from("clients")
      .select("id, full_name, phone, pets(name)")
      .order("full_name");

    const { data: allVisits } = await supabase
      .from("appointments")
      .select("client_id, completed_at")
      .eq("status", "completed")
      .order("completed_at", { ascending: false });

    // Group visits by client, find the most recent for each
    const latestVisitByClient = new Map<string, string>();
    for (const visit of allVisits ?? []) {
      if (!latestVisitByClient.has(visit.client_id)) {
        latestVisitByClient.set(visit.client_id, visit.completed_at);
      }
    }

    overdueClients = (allClients ?? [])
      .filter((client) => {
        const lastVisit = latestVisitByClient.get(client.id);
        if (!lastVisit) return false; // never visited = not "overdue", just new
        return new Date(lastVisit) < sixWeeksAgo;
      })
      .map((client) => {
        const lastVisit = latestVisitByClient.get(client.id)!;
        const weeksAgo = Math.floor(
          (Date.now() - new Date(lastVisit).getTime()) / (7 * 24 * 60 * 60 * 1000)
        );
        const pets = (
          client.pets as unknown as { name: string }[]
        ) ?? [];
        return {
          id: client.id,
          fullName: client.full_name,
          phone: client.phone ?? null,
          petNames: pets.map((p) => p.name),
          lastVisit,
          weeksOverdue: weeksAgo,
        };
      })
      .sort((a, b) => b.weeksOverdue - a.weeksOverdue)
      .slice(0, 10);
  } catch {
    // appointments table may not exist yet
  }

  // 3. Expiring vaccines (within 30 days or expired) — doesn't depend on appointments table
  try {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const { data: expiringPets } = await supabase
      .from("pets")
      .select("id, name, vaccine_expiry_date, clients!inner(full_name, phone)")
      .not("vaccine_expiry_date", "is", null)
      .lte(
        "vaccine_expiry_date",
        thirtyDaysFromNow.toISOString().split("T")[0]
      )
      .order("vaccine_expiry_date", { ascending: true })
      .limit(10);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    expiringVaccines = (expiringPets ?? []).map((pet) => {
      const expiryDate = new Date(pet.vaccine_expiry_date);
      expiryDate.setHours(0, 0, 0, 0);
      const diffMs = expiryDate.getTime() - today.getTime();
      const daysUntilExpiry = Math.ceil(diffMs / (24 * 60 * 60 * 1000));

      const owner = pet.clients as unknown as { full_name: string; phone: string | null };
      return {
        petId: pet.id,
        petName: pet.name,
        ownerName: owner?.full_name ?? "Unknown",
        ownerPhone: owner?.phone ?? null,
        vaccineExpiry: pet.vaccine_expiry_date,
        daysUntilExpiry,
      };
    });
  } catch {
    // vaccine query failed — that's fine
  }

  // Fetch service presets for QuickCheckIn
  const { data: presetRows } = await supabase
    .from("service_presets")
    .select("name, default_price, default_duration")
    .order("sort_order", { ascending: true });

  const servicePresets = (presetRows ?? []).map((p) => ({
    name: p.name as string,
    defaultPrice: Number(p.default_price),
    defaultDuration: Number((p as unknown as { default_duration: number }).default_duration) || 60,
  }));

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

  const isNewUser = (clientCount ?? 0) === 0 && (petCount ?? 0) === 0;

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-sage-800">Welcome back</h2>
        <p className="mt-1 text-sage-500">
          Here&apos;s what&apos;s happening with your grooming business today.
        </p>
      </div>

      {/* Getting Started — shown only for brand-new users */}
      {isNewUser && (
        <div className="bg-sage-50/50 rounded-2xl border border-sage-100 p-6 mb-8">
          <h3 className="text-lg font-semibold text-sage-700 mb-1">
            Get started with Mirifer
          </h3>
          <p className="text-sm text-sage-500 mb-4">
            Tap the <span className="font-medium text-sage-600">+</span> button below to check in your first pet. That will create the client, pet, and first appointment automatically.
          </p>
          <div className="flex flex-col gap-2 text-sm text-sage-500">
            <p>1. Check in a pet to create your first client</p>
            <p>2. Set up your service prices in Settings</p>
            <p>3. Schedule future appointments from the Appointments page</p>
          </div>
        </div>
      )}

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

      {/* Reminders */}
      <Reminders
        upcomingAppointments={upcomingAppointments}
        overdueClients={overdueClients}
        expiringVaccines={expiringVaccines}
      />

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
      <QuickCheckIn servicePresets={servicePresets} />
    </div>
  );
}
