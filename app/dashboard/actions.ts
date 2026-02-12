"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { HealthMapMarker } from "@/lib/types/database";

type ActionResult = {
  success: boolean;
  error?: string;
};

type CheckInResult = {
  success: boolean;
  error?: string;
};

export async function quickCheckIn(formData: FormData): Promise<CheckInResult> {
  const petName = (formData.get("petName") as string)?.trim();
  const ownerName = (formData.get("ownerName") as string)?.trim();
  const ownerPhone = (formData.get("ownerPhone") as string)?.trim();
  const breed = (formData.get("breed") as string)?.trim();
  const dateOfBirth = (formData.get("dateOfBirth") as string)?.trim();

  if (!petName) {
    return { success: false, error: "Pet name is required." };
  }
  if (!ownerName) {
    return { success: false, error: "Owner name is required." };
  }
  if (!ownerPhone) {
    return { success: false, error: "Owner phone is required." };
  }

  // Normalize phone to digits only to prevent duplicates from formatting
  const normalizedPhone = ownerPhone.replace(/\D/g, "");
  if (normalizedPhone.length < 7) {
    return { success: false, error: "Please enter a valid phone number." };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "You must be logged in." };
  }

  // Check if a client with this phone already exists for this groomer
  const { data: existingClients } = await supabase
    .from("clients")
    .select()
    .eq("profile_id", user.id)
    .eq("phone", normalizedPhone)
    .limit(1);

  let clientId: string;

  if (existingClients && existingClients.length > 0) {
    clientId = existingClients[0].id;
    // Update the name if it was a placeholder from before
    if (
      ownerName &&
      existingClients[0].full_name?.startsWith("Owner (")
    ) {
      await supabase
        .from("clients")
        .update({ full_name: ownerName })
        .eq("id", clientId);
    }
  } else {
    const { data: newClient, error: clientError } = await supabase
      .from("clients")
      .insert({
        profile_id: user.id,
        full_name: ownerName,
        phone: normalizedPhone,
      })
      .select()
      .single();

    if (clientError || !newClient) {
      return { success: false, error: "Failed to create client record." };
    }
    clientId = newClient.id;
  }

  // Look for an existing pet with the same name under this client
  const { data: existingPets } = await supabase
    .from("pets")
    .select("id, breed, date_of_birth")
    .eq("client_id", clientId)
    .ilike("name", petName)
    .limit(1);

  let petId: string;

  if (existingPets && existingPets.length > 0) {
    // Reuse existing pet — fill in breed/dob if they were missing
    petId = existingPets[0].id;
    const updates: Record<string, string> = {};
    if (breed && !existingPets[0].breed) updates.breed = breed;
    if (dateOfBirth && !existingPets[0].date_of_birth)
      updates.date_of_birth = dateOfBirth;
    if (Object.keys(updates).length > 0) {
      await supabase.from("pets").update(updates).eq("id", petId);
    }
  } else {
    // Create new pet
    const { data: newPet, error: petError } = await supabase
      .from("pets")
      .insert({
        client_id: clientId,
        name: petName,
        breed: breed || null,
        date_of_birth: dateOfBirth || null,
      })
      .select("id")
      .single();

    if (petError || !newPet) {
      return { success: false, error: "Failed to save pet." };
    }
    petId = newPet.id;
  }

  // Always log a visit (appointment) for this check-in
  const { error: appointmentError } = await supabase
    .from("appointments")
    .insert({
      pet_id: petId,
      client_id: clientId,
      profile_id: user.id,
      service: "Grooming",
      price: 0,
    });

  if (appointmentError) {
    return { success: false, error: "Failed to log check-in." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/clients");
  return { success: true };
}

export async function saveHealthMapMarker(
  petId: string,
  marker: HealthMapMarker
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "You must be logged in." };
  }

  // Atomic upsert via Postgres function — no read-modify-write race
  const { error: rpcError } = await supabase.rpc("upsert_health_map_marker", {
    p_pet_id: petId,
    p_user_id: user.id,
    p_marker: marker as unknown as Record<string, unknown>,
  });

  if (rpcError) {
    if (rpcError.message?.includes("Unauthorized")) {
      return { success: false, error: "Unauthorized." };
    }
    return { success: false, error: "Failed to save marker." };
  }

  revalidatePath(`/dashboard/pets/${petId}`);
  return { success: true };
}

export async function deleteHealthMapMarker(
  petId: string,
  markerId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "You must be logged in." };
  }

  // Atomic delete via Postgres function — no read-modify-write race
  const { error: rpcError } = await supabase.rpc("delete_health_map_marker", {
    p_pet_id: petId,
    p_user_id: user.id,
    p_marker_id: markerId,
  });

  if (rpcError) {
    if (rpcError.message?.includes("Unauthorized")) {
      return { success: false, error: "Unauthorized." };
    }
    return { success: false, error: "Failed to delete marker." };
  }

  revalidatePath(`/dashboard/pets/${petId}`);
  return { success: true };
}

export async function logVisit(
  clientId: string,
  petId: string,
  service: string,
  price: number
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "You must be logged in." };
  }

  if (!service.trim()) {
    return { success: false, error: "Service is required." };
  }

  if (price < 0) {
    return { success: false, error: "Price cannot be negative." };
  }

  const { error: insertError } = await supabase.from("appointments").insert({
    client_id: clientId,
    pet_id: petId,
    profile_id: user.id,
    service: service.trim(),
    price,
  });

  if (insertError) {
    return { success: false, error: "Failed to log visit." };
  }

  revalidatePath("/dashboard/clients");
  return { success: true };
}

export async function addClient(formData: FormData): Promise<ActionResult> {
  const fullName = (formData.get("fullName") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const notes = (formData.get("notes") as string)?.trim();

  if (!fullName) {
    return { success: false, error: "Full name is required." };
  }
  if (!phone) {
    return { success: false, error: "Phone number is required." };
  }

  const normalizedPhone = phone.replace(/\D/g, "");
  if (normalizedPhone.length < 7) {
    return { success: false, error: "Please enter a valid phone number." };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "You must be logged in." };
  }

  // Check for duplicate by phone
  const { data: existing } = await supabase
    .from("clients")
    .select("id")
    .eq("profile_id", user.id)
    .eq("phone", normalizedPhone)
    .limit(1);

  if (existing && existing.length > 0) {
    return { success: false, error: "A client with this phone number already exists." };
  }

  const { error: insertError } = await supabase.from("clients").insert({
    profile_id: user.id,
    full_name: fullName,
    phone: normalizedPhone,
    email: email || null,
    notes: notes || null,
  });

  if (insertError) {
    return { success: false, error: "Failed to add client." };
  }

  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function addPet(formData: FormData): Promise<ActionResult> {
  const petName = (formData.get("petName") as string)?.trim();
  const ownerName = (formData.get("ownerName") as string)?.trim();
  const ownerPhone = (formData.get("ownerPhone") as string)?.trim();
  const breed = (formData.get("breed") as string)?.trim();
  const dateOfBirth = (formData.get("dateOfBirth") as string)?.trim();

  if (!petName) {
    return { success: false, error: "Pet name is required." };
  }
  if (!ownerName) {
    return { success: false, error: "Owner name is required." };
  }
  if (!ownerPhone) {
    return { success: false, error: "Owner phone is required." };
  }

  const normalizedPhone = ownerPhone.replace(/\D/g, "");
  if (normalizedPhone.length < 7) {
    return { success: false, error: "Please enter a valid phone number." };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "You must be logged in." };
  }

  // Find or create client by phone
  const { data: clients } = await supabase
    .from("clients")
    .select("id")
    .eq("profile_id", user.id)
    .eq("phone", normalizedPhone)
    .limit(1);

  let clientId: string;

  if (clients && clients.length > 0) {
    clientId = clients[0].id;
  } else {
    const { data: newClient, error: clientError } = await supabase
      .from("clients")
      .insert({
        profile_id: user.id,
        full_name: ownerName,
        phone: normalizedPhone,
      })
      .select("id")
      .single();

    if (clientError || !newClient) {
      return { success: false, error: "Failed to create client." };
    }
    clientId = newClient.id;
  }

  // Check for duplicate pet (same name + client)
  const { data: existingPets } = await supabase
    .from("pets")
    .select("id")
    .eq("client_id", clientId)
    .ilike("name", petName)
    .limit(1);

  if (existingPets && existingPets.length > 0) {
    return {
      success: false,
      error: "This client already has a pet with that name.",
    };
  }

  const { error: insertError } = await supabase.from("pets").insert({
    client_id: clientId,
    name: petName,
    breed: breed || null,
    date_of_birth: dateOfBirth || null,
  });

  if (insertError) {
    return { success: false, error: "Failed to add pet." };
  }

  revalidatePath("/dashboard/pets");
  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard");
  return { success: true };
}
