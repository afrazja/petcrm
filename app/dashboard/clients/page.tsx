import { createClient } from "@/lib/supabase/server";
import { UsersIcon } from "@/components/icons";
import ClientSearch from "./components/ClientSearch";
import AddClientModal from "./components/AddClientModal";

export default async function ClientsPage() {
  const supabase = await createClient();

  // Fetch all clients with their pets
  const { data: clients } = await supabase
    .from("clients")
    .select(
      `
      id,
      full_name,
      phone,
      email,
      notes,
      pets ( id, name, date_of_birth, created_at )
    `
    )
    .order("full_name", { ascending: true });

  // Fetch all appointments with pet names for visit history
  // Gracefully handles the case where the appointments table doesn't exist yet
  let appointments: {
    id: string;
    client_id: string;
    pet_id: string;
    service: string;
    price: number;
    completed_at: string;
    pets: { name: string } | null;
  }[] = [];

  try {
    const { data, error } = await supabase
      .from("appointments")
      .select(
        "id, client_id, pet_id, service, price, completed_at, pets ( name )"
      )
      .order("completed_at", { ascending: false });

    if (!error && data) {
      appointments = data as unknown as typeof appointments;
    }
  } catch {
    // Table likely doesn't exist yet — that's fine
  }

  // Group appointments by client_id
  const appointmentsByClient = new Map<
    string,
    {
      lastVisit: string | null;
      totalSpent: number;
      visits: {
        id: string;
        petName: string;
        service: string;
        price: number;
        completedAt: string;
      }[];
    }
  >();

  for (const appt of appointments) {
    const petName =
      (appt.pets as unknown as { name: string })?.name ?? "Unknown";
    const visit = {
      id: appt.id,
      petName,
      service: appt.service,
      price: Number(appt.price) || 0,
      completedAt: appt.completed_at,
    };

    const existing = appointmentsByClient.get(appt.client_id);
    if (existing) {
      existing.totalSpent += visit.price;
      existing.visits.push(visit);
    } else {
      appointmentsByClient.set(appt.client_id, {
        lastVisit: appt.completed_at,
        totalSpent: visit.price,
        visits: [visit],
      });
    }
  }

  // Fetch service presets for the log visit modal
  const { data: presets } = await supabase
    .from("service_presets")
    .select("name, default_price")
    .order("sort_order", { ascending: true });

  const servicePresets = (presets ?? []).map((p) => ({
    name: p.name as string,
    defaultPrice: Number(p.default_price) || 0,
  }));

  const formattedClients = (clients ?? []).map((client) => {
    const pets =
      (client.pets as unknown as {
        id: string;
        name: string;
        date_of_birth: string | null;
        created_at: string;
      }[]) ?? [];

    const apptData = appointmentsByClient.get(client.id);

    // Fallback: if no appointments, use the most recent pet check-in date
    let lastVisit = apptData?.lastVisit ?? null;
    if (!lastVisit && pets.length > 0) {
      const sorted = [...pets].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      lastVisit = sorted[0].created_at;
    }

    return {
      id: client.id,
      fullName: client.full_name,
      phone: client.phone,
      email: (client as unknown as { email: string | null }).email ?? null,
      notes: (client as unknown as { notes: string | null }).notes ?? null,
      pets: pets.map((p) => {
        let ageLabel: string | null = null;
        if (p.date_of_birth) {
          const dob = new Date(p.date_of_birth);
          const now = new Date();
          let years = now.getFullYear() - dob.getFullYear();
          let months = now.getMonth() - dob.getMonth();
          if (months < 0) { years--; months += 12; }
          if (now.getDate() < dob.getDate()) { months--; if (months < 0) { years--; months += 12; } }
          ageLabel = years > 0
            ? `${years}yr${months > 0 ? ` ${months}mo` : ""}`
            : `${months}mo`;
        }
        return { id: p.id, name: p.name, ageLabel };
      }),
      lastVisit,
      totalSpent: apptData?.totalSpent ?? 0,
      visits: apptData?.visits ?? [],
    };
  });

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <UsersIcon className="w-7 h-7 text-sage-400" />
          <h2 className="text-2xl font-bold text-sage-800">Clients</h2>
        </div>
        <p className="mt-1 text-sage-500">
          {formattedClients.length} client
          {formattedClients.length !== 1 ? "s" : ""} in your directory.
        </p>
      </div>

      <ClientSearch clients={formattedClients} servicePresets={servicePresets} />

      <AddClientModal />
    </div>
  );
}
