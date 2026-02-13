import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { normalizePhone, isValidPhone } from "@/lib/utils/phone";

/**
 * POST /api/book/[slug]/lookup
 * Public — look up a customer by phone number under a specific groomer.
 * Returns client info, their pets, and recent appointment history.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  let body: { phone?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const rawPhone = body.phone ?? "";
  const phone = normalizePhone(rawPhone);

  if (!isValidPhone(phone)) {
    return NextResponse.json(
      { error: "Please enter a valid phone number." },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  // Resolve the slug to a profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, booking_enabled")
    .eq("booking_slug", slug)
    .single();

  if (!profile || !profile.booking_enabled) {
    return NextResponse.json({ error: "Groomer not found." }, { status: 404 });
  }

  // Look up the client by phone under this groomer
  const { data: client } = await supabase
    .from("clients")
    .select("id, full_name, phone, email")
    .eq("profile_id", profile.id)
    .eq("phone", phone)
    .single();

  if (!client) {
    // New customer — return empty so the UI shows the new customer form
    return NextResponse.json({ found: false, phone });
  }

  // Fetch this client's pets
  const { data: pets } = await supabase
    .from("pets")
    .select("id, name, breed")
    .eq("client_id", client.id)
    .order("created_at", { ascending: false });

  // Fetch recent appointments (last 10)
  const { data: appointments } = await supabase
    .from("appointments")
    .select("id, service, price, completed_at, status, pet_id")
    .eq("client_id", client.id)
    .eq("profile_id", profile.id)
    .order("completed_at", { ascending: false })
    .limit(10);

  return NextResponse.json({
    found: true,
    client: {
      id: client.id,
      name: client.full_name,
      phone: client.phone,
      email: client.email,
    },
    pets: (pets ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      breed: p.breed,
    })),
    appointments: (appointments ?? []).map((a) => ({
      id: a.id,
      service: a.service,
      price: Number(a.price),
      date: a.completed_at,
      status: (a as unknown as { status: string | null }).status ?? "completed",
      petId: a.pet_id,
    })),
  });
}
