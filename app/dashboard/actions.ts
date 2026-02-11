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
  const ownerPhone = (formData.get("ownerPhone") as string)?.trim();
  const breed = (formData.get("breed") as string)?.trim();

  if (!petName) {
    return { success: false, error: "Pet name is required." };
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
  } else {
    const { data: newClient, error: clientError } = await supabase
      .from("clients")
      .insert({
        profile_id: user.id,
        full_name: `Owner (${normalizedPhone})`,
        phone: normalizedPhone,
      })
      .select()
      .single();

    if (clientError || !newClient) {
      return { success: false, error: "Failed to create client record." };
    }
    clientId = newClient.id;
  }

  const { error: petError } = await supabase.from("pets").insert({
    client_id: clientId,
    name: petName,
    breed: breed || null,
  });

  if (petError) {
    return { success: false, error: "Failed to save pet." };
  }

  revalidatePath("/dashboard");
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

  // Fetch the current pet to get existing health_map
  const { data: pet, error: fetchError } = await supabase
    .from("pets")
    .select("health_map, clients!inner ( profile_id )")
    .eq("id", petId)
    .single();

  if (fetchError || !pet) {
    return { success: false, error: "Pet not found." };
  }

  // Verify ownership through client -> profile_id
  const profileId = (pet.clients as unknown as { profile_id: string })
    ?.profile_id;
  if (profileId !== user.id) {
    return { success: false, error: "Unauthorized." };
  }

  // Read-modify-write: update or add marker
  const existingMarkers: HealthMapMarker[] =
    (pet.health_map as HealthMapMarker[] | null) ?? [];
  const markerIndex = existingMarkers.findIndex((m) => m.id === marker.id);

  let updatedMarkers: HealthMapMarker[];
  if (markerIndex >= 0) {
    // Update existing marker
    updatedMarkers = [...existingMarkers];
    updatedMarkers[markerIndex] = marker;
  } else {
    // Add new marker
    updatedMarkers = [...existingMarkers, marker];
  }

  const { error: updateError } = await supabase
    .from("pets")
    .update({ health_map: updatedMarkers as unknown as Record<string, unknown>[] })
    .eq("id", petId);

  if (updateError) {
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

  // Fetch the current pet to get existing health_map
  const { data: pet, error: fetchError } = await supabase
    .from("pets")
    .select("health_map, clients!inner ( profile_id )")
    .eq("id", petId)
    .single();

  if (fetchError || !pet) {
    return { success: false, error: "Pet not found." };
  }

  // Verify ownership
  const profileId = (pet.clients as unknown as { profile_id: string })
    ?.profile_id;
  if (profileId !== user.id) {
    return { success: false, error: "Unauthorized." };
  }

  // Remove the marker from the array
  const existingMarkers: HealthMapMarker[] =
    (pet.health_map as HealthMapMarker[] | null) ?? [];
  const updatedMarkers = existingMarkers.filter((m) => m.id !== markerId);

  const { error: updateError } = await supabase
    .from("pets")
    .update({
      health_map:
        updatedMarkers.length > 0
          ? (updatedMarkers as unknown as Record<string, unknown>[])
          : null,
    })
    .eq("id", petId);

  if (updateError) {
    return { success: false, error: "Failed to delete marker." };
  }

  revalidatePath(`/dashboard/pets/${petId}`);
  return { success: true };
}
