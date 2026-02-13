"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { HealthMapMarker } from "@/lib/types/database";

type ActionResult = {
  success: boolean;
  error?: string;
};

// Helper: detect if a Supabase error is caused by the "status" column not existing yet
// (migration 009 hasn't been run). Returns true if the error message references the column.
function isStatusColumnMissing(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const msg = error.message?.toLowerCase() ?? "";
  return msg.includes("status") && (msg.includes("column") || msg.includes("does not exist"));
}

export type ActionResultWithRebook = ActionResult & {
  rebookData?: {
    petId: string;
    petName: string;
    clientId: string;
    service: string;
  };
};

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

export async function clearHealthMap(
  petId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "You must be logged in." };
  }

  // RLS policy ensures only owner's pets are writable
  const { error } = await supabase
    .from("pets")
    .update({ health_map: [] as unknown as undefined })
    .eq("id", petId);

  if (error) {
    return { success: false, error: "Failed to clear health map." };
  }

  revalidatePath(`/dashboard/pets/${petId}`);
  return { success: true };
}

export async function logVisit(
  clientId: string,
  petId: string,
  service: string,
  price: number,
  notes?: string,
  duration?: number
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

  const visitRow = {
    client_id: clientId,
    pet_id: petId,
    profile_id: user.id,
    service: service.trim(),
    price,
    notes: notes?.trim() || null,
    duration: duration || 60,
    status: "completed",
  };

  let { error: insertError } = await supabase.from("appointments").insert(visitRow);

  if (isStatusColumnMissing(insertError)) {
    const { status: _s, ...rowWithoutStatus } = visitRow;
    ({ error: insertError } = await supabase.from("appointments").insert(rowWithoutStatus));
  }

  if (insertError) {
    return { success: false, error: "Failed to log visit." };
  }

  revalidatePath("/dashboard/clients");
  return { success: true };
}

export async function addCustomerWithPets(formData: FormData): Promise<ActionResult> {
  const fullName = (formData.get("fullName") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const notes = (formData.get("notes") as string)?.trim();
  const petsJson = (formData.get("pets") as string) || "[]";

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

  let pets: { name: string; breed: string; dateOfBirth: string; weight?: string }[];
  try {
    pets = JSON.parse(petsJson);
  } catch {
    return { success: false, error: "Invalid pet data." };
  }

  if (!pets.length || !pets[0]?.name?.trim()) {
    return { success: false, error: "At least one pet with a name is required." };
  }

  // Validate all pet names are non-empty
  for (let i = 0; i < pets.length; i++) {
    if (!pets[i].name?.trim()) {
      return { success: false, error: `Pet #${i + 1} needs a name.` };
    }
  }

  // Check for duplicate pet names within the submission
  const petNames = pets.map((p) => p.name.trim().toLowerCase());
  const uniqueNames = new Set(petNames);
  if (uniqueNames.size !== petNames.length) {
    return { success: false, error: "Each pet must have a unique name." };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "You must be logged in." };
  }

  // Check for duplicate phone
  const { data: existing } = await supabase
    .from("clients")
    .select("id")
    .eq("profile_id", user.id)
    .eq("phone", normalizedPhone)
    .limit(1);

  if (existing && existing.length > 0) {
    return { success: false, error: "A client with this phone number already exists." };
  }

  // Create client
  const { data: newClient, error: clientError } = await supabase
    .from("clients")
    .insert({
      profile_id: user.id,
      full_name: fullName,
      phone: normalizedPhone,
      email: email || null,
      notes: notes || null,
    })
    .select("id")
    .single();

  if (clientError || !newClient) {
    return { success: false, error: "Failed to add client." };
  }

  // Create all pets
  const petRows = pets.map((p) => ({
    client_id: newClient.id,
    name: p.name.trim(),
    breed: p.breed?.trim() || null,
    date_of_birth: p.dateOfBirth || null,
    weight: p.weight ? parseFloat(p.weight) : null,
  }));

  const { error: petsError } = await supabase.from("pets").insert(petRows);

  if (petsError) {
    return { success: false, error: "Client was created but failed to add pets." };
  }

  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard/pets");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function addPetToExistingClient(formData: FormData): Promise<ActionResult> {
  const clientId = (formData.get("clientId") as string)?.trim();
  const petName = (formData.get("petName") as string)?.trim();
  const breed = (formData.get("breed") as string)?.trim();
  const dateOfBirth = (formData.get("dateOfBirth") as string)?.trim();
  const weight = (formData.get("weight") as string)?.trim();

  if (!clientId) {
    return { success: false, error: "Please select a client." };
  }
  if (!petName) {
    return { success: false, error: "Pet name is required." };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "You must be logged in." };
  }

  // Check for duplicate pet name under this client
  const { data: existingPets } = await supabase
    .from("pets")
    .select("id")
    .eq("client_id", clientId)
    .ilike("name", petName)
    .limit(1);

  if (existingPets && existingPets.length > 0) {
    return { success: false, error: "This client already has a pet with that name." };
  }

  const { error: insertError } = await supabase.from("pets").insert({
    client_id: clientId,
    name: petName,
    breed: breed || null,
    date_of_birth: dateOfBirth || null,
    weight: weight ? parseFloat(weight) : null,
  });

  if (insertError) {
    return { success: false, error: "Failed to add pet." };
  }

  revalidatePath("/dashboard/pets");
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
  const weight = (formData.get("weight") as string)?.trim();
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
      weight: weight ? parseFloat(weight) : null,
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
  const duration = parseInt((formData.get("duration") as string) || "60") || 60;

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

  // Determine status: if scheduled in the future → "scheduled", otherwise "completed"
  const scheduledDate = new Date(scheduledAt);
  const appointmentStatus = scheduledDate > new Date() ? "scheduled" : "completed";

  const apptRow = {
    pet_id: petId,
    client_id: pet.client_id,
    profile_id: user.id,
    service: service,
    price,
    completed_at: scheduledDate.toISOString(),
    notes: notes || null,
    duration,
    status: appointmentStatus,
  };

  let { error: insertError } = await supabase.from("appointments").insert(apptRow);

  if (isStatusColumnMissing(insertError)) {
    const { status: _s, ...rowWithoutStatus } = apptRow;
    ({ error: insertError } = await supabase.from("appointments").insert(rowWithoutStatus));
  }

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
  duration?: number;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, error: "You must be logged in." };

  const rebookRow = {
    pet_id: data.petId,
    client_id: data.clientId,
    profile_id: user.id,
    service: data.service,
    price: 0,
    completed_at: new Date(data.scheduledAt).toISOString(),
    duration: data.duration || 60,
    status: "scheduled",
  };

  let { error: insertError } = await supabase.from("appointments").insert(rebookRow);

  if (isStatusColumnMissing(insertError)) {
    const { status: _s, ...rowWithoutStatus } = rebookRow;
    ({ error: insertError } = await supabase.from("appointments").insert(rowWithoutStatus));
  }

  if (insertError) return { success: false, error: "Failed to create rebooking." };

  revalidatePath("/dashboard/appointments");
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
  const durationStr = (formData.get("defaultDuration") as string)?.trim();

  if (!name) return { success: false, error: "Service name is required." };
  const defaultPrice = priceStr ? parseFloat(priceStr) : 0;
  const defaultDuration = durationStr ? parseInt(durationStr) : 60;

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
    default_duration: defaultDuration,
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
  const durationStr = (formData.get("defaultDuration") as string)?.trim();

  if (!id) return { success: false, error: "Preset ID is missing." };
  if (!name) return { success: false, error: "Service name is required." };
  const defaultPrice = priceStr ? parseFloat(priceStr) : 0;
  const defaultDuration = durationStr ? parseInt(durationStr) : 60;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, error: "You must be logged in." };

  const { error: updateError } = await supabase
    .from("service_presets")
    .update({ name, default_price: defaultPrice, default_duration: defaultDuration })
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
    { name: "Full Groom", default_price: 65, default_duration: 60, sort_order: 0 },
    { name: "Bath & Brush", default_price: 40, default_duration: 45, sort_order: 1 },
    { name: "Nail Trim", default_price: 15, default_duration: 15, sort_order: 2 },
    { name: "De-shedding", default_price: 50, default_duration: 45, sort_order: 3 },
    { name: "Puppy Cut", default_price: 45, default_duration: 45, sort_order: 4 },
    { name: "Teeth Cleaning", default_price: 25, default_duration: 20, sort_order: 5 },
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

  let { error: updateError } = await supabase
    .from("appointments")
    .update({
      completed_at: new Date(newDate).toISOString(),
      status: "scheduled",
    })
    .eq("id", appointmentId);

  if (isStatusColumnMissing(updateError)) {
    ({ error: updateError } = await supabase
      .from("appointments")
      .update({ completed_at: new Date(newDate).toISOString() })
      .eq("id", appointmentId));
  }

  if (updateError) return { success: false, error: "Failed to reschedule appointment." };

  revalidatePath("/dashboard/appointments");
  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function editAppointment(
  appointmentId: string,
  data: {
    scheduledAt: string;
    service: string;
    price: number;
    duration: number;
    notes: string | null;
  }
): Promise<ActionResult> {
  if (!data.scheduledAt) return { success: false, error: "Date is required." };
  if (!data.service.trim()) return { success: false, error: "Service is required." };

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, error: "You must be logged in." };

  const { error: updateError } = await supabase
    .from("appointments")
    .update({
      completed_at: new Date(data.scheduledAt).toISOString(),
      service: data.service.trim(),
      price: data.price,
      duration: data.duration || 60,
      notes: data.notes?.trim() || null,
    })
    .eq("id", appointmentId);

  if (updateError) return { success: false, error: "Failed to update appointment." };

  revalidatePath("/dashboard/appointments");
  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard/pets");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: "scheduled" | "completed" | "no-show"
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, error: "You must be logged in." };

  const { error: updateError } = await supabase
    .from("appointments")
    .update({ status })
    .eq("id", appointmentId);

  if (isStatusColumnMissing(updateError)) {
    // Status column doesn't exist yet — silently ignore since the feature isn't available
    revalidatePath("/dashboard/appointments");
    return { success: true };
  }

  if (updateError) return { success: false, error: "Failed to update status." };

  revalidatePath("/dashboard/appointments");
  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard");
  return { success: true };
}

// ── Booking Settings ─────────────────────────────────────────────────

export async function updateBookingSettings(formData: FormData): Promise<ActionResult> {
  const slug = (formData.get("slug") as string)?.trim().toLowerCase();
  const enabled = formData.get("enabled") === "true";

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, error: "You must be logged in." };

  // Validate slug format (lowercase letters, numbers, hyphens)
  if (slug && !/^[a-z0-9-]+$/.test(slug)) {
    return { success: false, error: "Slug can only contain lowercase letters, numbers, and hyphens." };
  }

  if (slug && slug.length < 3) {
    return { success: false, error: "Slug must be at least 3 characters." };
  }

  if (slug && slug.length > 50) {
    return { success: false, error: "Slug must be under 50 characters." };
  }

  // Check if slug is already taken by another user
  if (slug) {
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("booking_slug", slug)
      .neq("id", user.id)
      .limit(1);

    if (existing && existing.length > 0) {
      return { success: false, error: "This booking link is already taken. Try a different one." };
    }
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      booking_slug: slug || null,
      booking_enabled: enabled && !!slug,
    })
    .eq("id", user.id);

  if (updateError) {
    console.error("Failed to update booking settings:", updateError);
    return { success: false, error: "Failed to save booking settings." };
  }

  revalidatePath("/dashboard/settings");
  return { success: true };
}
