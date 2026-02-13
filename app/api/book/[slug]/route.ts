import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * GET /api/book/[slug]
 * Public — resolve a booking slug to groomer profile + service presets.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!slug) {
    return NextResponse.json({ error: "Missing slug." }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Look up the groomer profile by slug
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, business_name, booking_enabled")
    .eq("booking_slug", slug)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Groomer not found." }, { status: 404 });
  }

  if (!profile.booking_enabled) {
    return NextResponse.json(
      { error: "Online booking is not enabled." },
      { status: 404 }
    );
  }

  // Fetch service presets for this groomer
  const { data: presets } = await supabase
    .from("service_presets")
    .select("id, name, default_price, default_duration")
    .eq("profile_id", profile.id)
    .order("sort_order", { ascending: true });

  return NextResponse.json({
    groomer: {
      id: profile.id,
      name: profile.full_name,
      businessName: profile.business_name,
    },
    services: (presets ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      price: Number(p.default_price),
      duration: Number(p.default_duration) || 60,
    })),
  });
}
