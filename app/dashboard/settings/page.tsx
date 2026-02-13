import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsIcon } from "@/components/icons";
import ServicePresetList from "./components/ServicePresetList";
import BookingLinkSettings from "./components/BookingLinkSettings";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: presets } = await supabase
    .from("service_presets")
    .select("id, name, default_price, default_duration, sort_order")
    .eq("profile_id", user.id)
    .order("sort_order", { ascending: true });

  const formattedPresets = (presets ?? []).map((p) => ({
    id: p.id as string,
    name: p.name as string,
    defaultPrice: Number(p.default_price),
    defaultDuration: Number((p as unknown as { default_duration: number }).default_duration) || 60,
    sortOrder: p.sort_order as number,
  }));

  // Fetch booking config from profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("booking_slug, booking_enabled")
    .eq("id", user.id)
    .single();

  const bookingSlug = (profile as unknown as { booking_slug: string | null })?.booking_slug ?? null;
  const bookingEnabled = (profile as unknown as { booking_enabled: boolean })?.booking_enabled ?? false;

  // Derive base URL for the booking link preview
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const proto = headersList.get("x-forwarded-proto") ?? "https";
  const baseUrl = `${proto}://${host}`;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-sage-50 flex items-center justify-center text-sage-400">
          <SettingsIcon className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-sage-800">Settings</h1>
          <p className="text-sm text-sage-500">Manage your services and booking</p>
        </div>
      </div>

      <div className="space-y-6">
        <BookingLinkSettings
          currentSlug={bookingSlug}
          currentEnabled={bookingEnabled}
          baseUrl={baseUrl}
        />

        <ServicePresetList presets={formattedPresets} />
      </div>
    </div>
  );
}
