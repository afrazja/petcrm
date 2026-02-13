import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { normalizePhone, isValidPhone } from "@/lib/utils/phone";

type BookingBody = {
  // Existing customer
  clientId?: string;
  petId?: string;
  // New customer
  customerName?: string;
  customerPhone?: string;
  petName?: string;
  petBreed?: string;
  // Booking details (required for both)
  service: string;
  scheduledAt: string;
  notes?: string;
};

/**
 * POST /api/book/[slug]/appointments
 * Public — create a booking. Handles both existing and new customers.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  let body: BookingBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { service, scheduledAt, notes } = body;

  if (!service?.trim()) {
    return NextResponse.json({ error: "Service is required." }, { status: 400 });
  }
  if (!scheduledAt) {
    return NextResponse.json(
      { error: "Date and time are required." },
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

  let clientId: string;
  let petId: string;

  if (body.clientId && body.petId) {
    // ── Existing customer ──
    clientId = body.clientId;
    petId = body.petId;

    // Verify the client belongs to this groomer
    const { data: existingClient } = await supabase
      .from("clients")
      .select("id")
      .eq("id", clientId)
      .eq("profile_id", profile.id)
      .single();

    if (!existingClient) {
      return NextResponse.json({ error: "Client not found." }, { status: 404 });
    }

    // Verify the pet belongs to this client
    const { data: existingPet } = await supabase
      .from("pets")
      .select("id")
      .eq("id", petId)
      .eq("client_id", clientId)
      .single();

    if (!existingPet) {
      return NextResponse.json({ error: "Pet not found." }, { status: 404 });
    }
  } else {
    // ── New customer ──
    const { customerName, customerPhone, petName } = body;

    if (!customerName?.trim()) {
      return NextResponse.json(
        { error: "Your name is required." },
        { status: 400 }
      );
    }
    if (!customerPhone) {
      return NextResponse.json(
        { error: "Phone number is required." },
        { status: 400 }
      );
    }

    const phone = normalizePhone(customerPhone);
    if (!isValidPhone(phone)) {
      return NextResponse.json(
        { error: "Please enter a valid phone number." },
        { status: 400 }
      );
    }

    if (!petName?.trim()) {
      return NextResponse.json(
        { error: "Pet name is required." },
        { status: 400 }
      );
    }

    // Check if this phone already exists for this groomer
    const { data: existingClient } = await supabase
      .from("clients")
      .select("id")
      .eq("profile_id", profile.id)
      .eq("phone", phone)
      .single();

    if (existingClient) {
      // Phone already exists — they should use the "returning customer" flow
      return NextResponse.json(
        { error: "An account with this phone number already exists. Please go back and look up your phone number." },
        { status: 409 }
      );
    }

    // Create the new client
    const { data: newClient, error: clientError } = await supabase
      .from("clients")
      .insert({
        profile_id: profile.id,
        full_name: customerName.trim(),
        phone,
      })
      .select("id")
      .single();

    if (clientError || !newClient) {
      console.error("Failed to create client:", clientError);
      return NextResponse.json(
        { error: "Failed to create your account." },
        { status: 500 }
      );
    }

    clientId = newClient.id;

    // Create the pet
    const { data: newPet, error: petError } = await supabase
      .from("pets")
      .insert({
        client_id: clientId,
        name: petName.trim(),
        breed: body.petBreed?.trim() || null,
      })
      .select("id")
      .single();

    if (petError || !newPet) {
      console.error("Failed to create pet:", petError);
      return NextResponse.json(
        { error: "Failed to add your pet." },
        { status: 500 }
      );
    }

    petId = newPet.id;
  }

  // ── Create the appointment ──
  const scheduledDate = new Date(scheduledAt);

  const { data: appointment, error: apptError } = await supabase
    .from("appointments")
    .insert({
      pet_id: petId,
      client_id: clientId,
      profile_id: profile.id,
      service: service.trim(),
      price: 0,
      completed_at: scheduledDate.toISOString(),
      notes: notes?.trim() || null,
      duration: 60,
      status: "scheduled",
    })
    .select("id, completed_at, service")
    .single();

  if (apptError || !appointment) {
    console.error("Failed to create appointment:", apptError);
    return NextResponse.json(
      { error: "Failed to create appointment." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    appointment: {
      id: appointment.id,
      service: appointment.service,
      date: appointment.completed_at,
    },
  });
}
