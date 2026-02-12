import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardShell from "./components/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const name = user.user_metadata?.full_name as string | undefined;
  const userEmail = user.email ?? null;
  const userInitial = name
    ? name.charAt(0).toUpperCase()
    : (user.email?.charAt(0).toUpperCase() ?? "U");

  return (
    <DashboardShell userEmail={userEmail} userInitial={userInitial}>
      {children}
    </DashboardShell>
  );
}
