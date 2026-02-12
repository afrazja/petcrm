"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { HealthMapMarker } from "@/lib/types/database";

type ActionResult = {
  success: boolean;
  error?: string;
};

export type ActionResultWithRebook = ActionResult & {
  rebookData?: {
    petId: string;
    petName: string;
    clientId: string;
    service: string;
  };
};

export async function quickCheckIn(formData: FormData): Promise<ActionResultWithRebook> {
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
  const service = (formData.get("service") as string)?.trim() || "Grooming";
  const checkInPrice = parseFloat((formData.get("price") as string) || "0") || 0;
  const notes = (formData.get("notes") as string)?.trim();

  const { error: appointmentError } = await supabase
    .from("appointments")
    .insert({
      pet_id: petId,
      client_id: clientId,
      profile_id: user.id,
      service,
      price: checkInPrice,
      notes: notes || null,
    });

  if (appointmentError) {
    return { success: false, error: "Failed to log check-in." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/clients");
  return {
    success: true,
    rebookData: {
      petId,
      petName,
      clientId,
      service,
    },
  };
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
  price: number,
  notes?: string
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
    notes: notes?.trim() || null,
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

export async function editClient(formData: FormData): Promise<ActionResult> {
  const clientId = (formData.get("clientId") as string)?.trim();
  const fullName = (formData.get("fullName") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const notes = (formData.get("notes") as string)?.trim();

  if (!clientId) return { success: false, error: "Client ID is missing." };
  if (!fullName) return { success: false, error: "Full name is required." };

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, error: "You must be logged in." };

  const normalizedPhone = phone ? phone.replace(/\D/g, "") : null;

  const { error: updateError } = await supabase
    .from("clients")
    .update({
      full_name: fullName,
      phone: normalizedPhone,
      email: email || null,
      notes: notes || null,
    })
    .eq("id", clientId);

  if (updateError) return { success: false, error: "Failed to update client." };

  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function editPet(formData: FormData): Promise<ActionResult> {
  const petId = (formData.get("petId") as string)?.trim();
  const name = (formData.get("name") as string)?.trim();
  const breed = (formData.get("breed") as string)?.trim();
  const dateOfBirth = (formData.get("dateOfBirth") as string)?.trim();
  const vaccineExpiryDate = (formData.get("vaccineExpiryDate") as string)?.trim();
  const notes = (formData.get("notes") as string)?.trim();

  if (!petId) return { success: false, error: "Pet ID is missing." };
  if (!name) return { success: false, error: "Pet name is required." };

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, error: "You must be logged in." };

  const { error: updateError } = await supabase
    .from("pets")
    .update({
      name,
      breed: breed || null,
      date_of_birth: dateOfBirth || null,
      vaccine_expiry_date: vaccineExpiryDate || null,
      notes: notes || null,
    })
    .eq("id", petId);

  if (updateError) return { success: false, error: "Failed to update pet." };

  revalidatePath(`/dashboard/pets/${petId}`);
  revalidatePath("/dashboard/pets");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteClient(clientId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, error: "You must be logged in." };

  const { error: deleteError } = await supabase
    .from("clients")
    .delete()
    .eq("id", clientId);

  if (deleteError) return { success: false, error: "Failed to delete client." };

  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard/pets");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deletePet(petId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, error: "You must be logged in." };

  const { error: deleteError } = await supabase
    .from("pets")
    .delete()
    .eq("id", petId);

  if (deleteError) return { success: false, error: "Failed to delete pet." };

  revalidatePath("/dashboard/pets");
  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function addAppointment(formData: FormData): Promise<ActionResultWithRebook> {
  const petId = (formData.get("petId") as string)?.trim();
  const service = (formData.get("service") as string)?.trim();
  const priceStr = (formData.get("price") as string)?.trim();
  const scheduledAt = (formData.get("scheduledAt") as string)?.trim();
  const notes = (formData.get("notes") as string)?.trim();

  if (!petId) return { success: false, error: "Please select a pet." };
  if (!service) return { success: false, error: "Service is required." };
  if (!scheduledAt) return { success: false, error: "Date and time are required." };

  const price = priceStr ? parseFloat(priceStr) : 0;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, error: "You must be logged in." };

  // Get client_id and pet name from pet
  const { data: pet } = await supabase
    .from("pets")
    .select("client_id, name")
    .eq("id", petId)
    .single();

  if (!pet) return { success: false, error: "Pet not found." };

  const { error: insertError } = await supabase.from("appointments").insert({
    pet_id: petId,
    client_id: pet.client_id,
    profile_id: user.id,
    service: service,
    price,
    completed_at: new Date(scheduledAt).toISOString(),
    notes: notes || null,
  });

  if (insertError) return { success: false, error: "Failed to create appointment." };

  revalidatePath("/dashboard/appointments");
  revalidatePath("/dashboard");
  return {
    success: true,
    rebookData: {
      petId,
      petName: pet.name,
      clientId: pet.client_id,
      service,
    },
  };
}

export async function rebookAppointment(data: {
  petId: string;
  clientId: string;
  service: string;
  scheduledAt: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, error: "You must be logged in." };

  const { error: insertError } = await supabase.from("appointments").insert({
    pet_id: data.petId,
    client_id: data.clientId,
    profile_id: user.id,
    service: data.service,
    price: 0,
    completed_at: new Date(data.scheduledAt).toISOString(),
  });

  if (insertError) return { success: false, error: "Failed to create rebooking." };

  revalidatePath("/dashboard/appointments");
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

export async function uploadPetPhoto(
  petId: string,
  formData: FormData
): Promise<ActionResult & { photo?: { id: string; url: string; createdAt: string } }> {
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return { success: false, error: "No file selected." };
  }

  // Validate file type
  if (!file.type.startsWith("image/")) {
    return { success: false, error: "Only image files are allowed." };
  }

  // Limit to 5 MB
  if (file.size > 5 * 1024 * 1024) {
    return { success: false, error: "Image must be under 5 MB." };
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, error: "You must be logged in." };

  // Generate unique filename
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const storagePath = `${user.id}/${petId}/${fileName}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from("pet-photos")
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    return { success: false, error: "Failed to upload photo." };
  }

  // Insert record in pet_photos table
  const { data: photoRecord, error: insertError2 } = await supabase
    .from("pet_photos")
    .insert({
      pet_id: petId,
      profile_id: user.id,
      storage_path: storagePath,
    })
    .select("id, created_at")
    .single();

  if (insertError2 || !photoRecord) {
    // Clean up the uploaded file if DB insert fails
    await supabase.storage.from("pet-photos").remove([storagePath]);
    return { success: false, error: "Failed to save photo record." };
  }

  // Build public URL
  const { data: publicUrlData } = supabase.storage
    .from("pet-photos")
    .getPublicUrl(storagePath);

  revalidatePath(`/dashboard/pets/${petId}`);
  return {
    success: true,
    photo: {
      id: photoRecord.id,
      url: publicUrlData.publicUrl,
      createdAt: photoRecord.created_at,
    },
  };
}

export async function deletePetPhoto(photoId: string, petId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, error: "You must be logged in." };

  // Get the photo record to find storage path
  const { data: photo } = await supabase
    .from("pet_photos")
    .select("storage_path")
    .eq("id", photoId)
    .single();

  if (!photo) return { success: false, error: "Photo not found." };

  // Delete from storage
  await supabase.storage.from("pet-photos").remove([photo.storage_path]);

  // Delete from database
  const { error: deleteError2 } = await supabase
    .from("pet_photos")
    .delete()
    .eq("id", photoId);

  if (deleteError2) return { success: false, error: "Failed to delete photo." };

  revalidatePath(`/dashboard/pets/${petId}`);
  return { success: true };
}

// ── Service Presets ──────────────────────────────────────────────────

export async function addServicePreset(formData: FormData): Promise<ActionResult> {
  const name = (formData.get("name") as string)?.trim();
  const priceStr = (formData.get("defaultPrice") as string)?.trim();

  if (!name) return { success: false, error: "Service name is required." };
  const defaultPrice = priceStr ? parseFloat(priceStr) : 0;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, error: "You must be logged in." };

  // Get next sort order
  const { data: existing } = await supabase
    .from("service_presets")
    .select("sort_order")
    .eq("profile_id", user.id)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

  const { error: insertError } = await supabase.from("service_presets").insert({
    profile_id: user.id,
    name,
    default_price: defaultPrice,
    sort_order: nextOrder,
  });

  if (insertError) return { success: false, error: "Failed to add service." };

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function editServicePreset(formData: FormData): Promise<ActionResult> {
  const id = (formData.get("id") as string)?.trim();
  const name = (formData.get("name") as string)?.trim();
  const priceStr = (formData.get("defaultPrice") as string)?.trim();

  if (!id) return { success: false, error: "Preset ID is missing." };
  if (!name) return { success: false, error: "Service name is required." };
  const defaultPrice = priceStr ? parseFloat(priceStr) : 0;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, error: "You must be logged in." };

  const { error: updateError } = await supabase
    .from("service_presets")
    .update({ name, default_price: defaultPrice })
    .eq("id", id);

  if (updateError) return { success: false, error: "Failed to update service." };

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteServicePreset(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, error: "You must be logged in." };

  const { error: deleteError } = await supabase
    .from("service_presets")
    .delete()
    .eq("id", id);

  if (deleteError) return { success: false, error: "Failed to delete service." };

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function importDefaultPresets(): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, error: "You must be logged in." };

  const defaults = [
    { name: "Full Groom", default_price: 65, sort_order: 0 },
    { name: "Bath & Brush", default_price: 40, sort_order: 1 },
    { name: "Nail Trim", default_price: 15, sort_order: 2 },
    { name: "De-shedding", default_price: 50, sort_order: 3 },
    { name: "Puppy Cut", default_price: 45, sort_order: 4 },
    { name: "Teeth Cleaning", default_price: 25, sort_order: 5 },
  ];

  const { error: insertError } = await supabase.from("service_presets").insert(
    defaults.map((d) => ({ ...d, profile_id: user.id }))
  );

  if (insertError) return { success: false, error: "Failed to import defaults." };

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  return { success: true };
}

// ── Appointment Management ──────────────────────────────────────────

export async function deleteAppointment(appointmentId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, error: "You must be logged in." };

  const { error: deleteError } = await supabase
    .from("appointments")
    .delete()
    .eq("id", appointmentId);

  if (deleteError) return { success: false, error: "Failed to delete appointment." };

  revalidatePath("/dashboard/appointments");
  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function rescheduleAppointment(
  appointmentId: string,
  newDate: string
): Promise<ActionResult> {
  if (!newDate) return { success: false, error: "Date is required." };

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, error: "You must be logged in." };

  const { error: updateError } = await supabase
    .from("appointments")
    .update({ completed_at: new Date(newDate).toISOString() })
    .eq("id", appointmentId);

  if (updateError) return { success: false, error: "Failed to reschedule appointment." };

  revalidatePath("/dashboard/appointments");
  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard");
  return { success: true };
}
