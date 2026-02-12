import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsIcon } from "@/components/icons";
import ServicePresetList from "./components/ServicePresetList";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: presets } = await supabase
    .from("service_presets")
    .select("id, name, default_price, sort_order")
    .eq("profile_id", user.id)
    .order("sort_order", { ascending: true });

  const formattedPresets = (presets ?? []).map((p) => ({
    id: p.id as string,
    name: p.name as string,
    defaultPrice: Number(p.default_price),
    sortOrder: p.sort_order as number,
  }));

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-sage-50 flex items-center justify-center text-sage-400">
          <SettingsIcon className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-sage-800">Settings</h1>
          <p className="text-sm text-sage-500">Manage your services and pricing</p>
        </div>
      </div>

      <ServicePresetList presets={formattedPresets} />
    </div>
  );
}
