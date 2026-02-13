import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import BookingPage from "./components/BookingPage";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function BookingPageWrapper({ params }: PageProps) {
  const { slug } = await params;

  // If the service role key isn't configured, show not found
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    notFound();
  }

  const supabase = createServiceClient();

  // Look up the groomer profile by slug
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, business_name, booking_enabled")
    .eq("booking_slug", slug)
    .single();

  if (!profile || !profile.booking_enabled) {
    notFound();
  }

  // Fetch service presets for this groomer
  const { data: presets } = await supabase
    .from("service_presets")
    .select("id, name, default_price, default_duration")
    .eq("profile_id", profile.id)
    .order("sort_order", { ascending: true });

  const groomer = {
    id: profile.id,
    name: profile.full_name,
    businessName: profile.business_name,
  };

  const services = (presets ?? []).map((p) => ({
    id: p.id as string,
    name: p.name as string,
    price: Number(p.default_price),
    duration: Number(p.default_duration) || 60,
  }));

  return <BookingPage slug={slug} groomer={groomer} services={services} />;
}
