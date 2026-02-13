import { createClient } from "@/lib/supabase/server";
import { CalendarIcon } from "@/components/icons";
import AppointmentsCalendar from "./components/AppointmentsCalendar";
import AddAppointmentModal from "./components/AddAppointmentModal";

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const month = params.month !== undefined ? parseInt(params.month) : now.getMonth();
  const year = params.year !== undefined ? parseInt(params.year) : now.getFullYear();

  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

  const supabase = await createClient();

  // Fetch appointments for the month
  let formattedAppointments: {
    id: string;
    service: string;
    price: number;
    completedAt: string;
    notes: string | null;
    duration: number;
    status: string;
    petName: string;
    petBreed: string | null;
    ownerName: string;
    ownerPhone: string | null;
  }[] = [];

  let appointmentError = false;

  try {
    const { data: appointments } = await supabase
      .from("appointments")
      .select(
        `
        id,
        service,
        price,
        completed_at,
        notes,
        duration,
        status,
        pets!inner ( id, name, breed, clients!inner ( full_name, phone ) )
      `
      )
      .gte("completed_at", startOfMonth.toISOString())
      .lte("completed_at", endOfMonth.toISOString())
      .order("completed_at", { ascending: true });

    formattedAppointments = (appointments ?? []).map((appt) => {
      const pet = appt.pets as unknown as {
        id: string;
        name: string;
        breed: string | null;
        clients: { full_name: string; phone: string | null };
      };
      return {
        id: appt.id,
        service: appt.service,
        price: Number(appt.price) || 0,
        completedAt: appt.completed_at,
        notes: appt.notes,
        duration: Number(appt.duration) || 60,
        status: (appt as unknown as { status: string }).status ?? "completed",
        petName: pet.name,
        petBreed: pet.breed,
        ownerName: pet.clients?.full_name ?? "Unknown",
        ownerPhone: pet.clients?.phone ?? null,
      };
    });
  } catch (err) {
    console.error("[Appointments] Failed to load appointments:", err);
    appointmentError = true;
  }

  // Fetch all pets for the add appointment modal
  const { data: allPets } = await supabase
    .from("pets")
    .select("id, name, clients!inner ( full_name )")
    .order("name");

  const petOptions = (allPets ?? []).map((pet) => ({
    id: pet.id,
    name: pet.name,
    ownerName:
      (pet.clients as unknown as { full_name: string })?.full_name ?? "Unknown",
  }));

  // Fetch service presets for the add appointment modal
  const { data: presets } = await supabase
    .from("service_presets")
    .select("name, default_price, default_duration")
    .order("sort_order", { ascending: true });

  const servicePresets = (presets ?? []).map((p) => ({
    name: p.name as string,
    defaultPrice: Number(p.default_price) || 0,
    defaultDuration: Number((p as unknown as { default_duration: number }).default_duration) || 60,
  }));

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <CalendarIcon className="w-7 h-7 text-sage-400" />
          <h2 className="text-2xl font-bold text-sage-800">Appointments</h2>
        </div>
        <p className="mt-1 text-sage-500">
          View and manage your grooming appointments.
        </p>
      </div>

      {appointmentError && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 text-sm">
          <p className="font-medium">Could not load appointments</p>
          <p className="mt-0.5 text-amber-600">The calendar may be empty or incomplete. Try refreshing the page.</p>
        </div>
      )}

      <AppointmentsCalendar
        appointments={formattedAppointments}
        month={month}
        year={year}
        servicePresets={servicePresets}
      />

      <AddAppointmentModal pets={petOptions} servicePresets={servicePresets} />
    </div>
  );
}
