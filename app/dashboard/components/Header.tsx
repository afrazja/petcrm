"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { signout } from "@/app/auth/actions";
import { MenuIcon } from "@/components/icons";

export default function Header({ onMenuToggle }: { onMenuToggle: () => void }) {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userInitial, setUserInitial] = useState("U");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserEmail(user.email ?? null);
        const name = user.user_metadata?.full_name as string | undefined;
        setUserInitial(
          name
            ? name.charAt(0).toUpperCase()
            : (user.email?.charAt(0).toUpperCase() ?? "U")
        );
      }
    });
  }, []);

  return (
    <header className="h-16 bg-white border-b border-warm-gray/50 flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="md:hidden p-2 -ml-2 rounded-lg text-sage-500 hover:bg-sage-50 transition-colors"
        >
          <MenuIcon className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-sage-700">Dashboard</h1>
      </div>

      <div className="flex items-center gap-3">
        {userEmail && (
          <span className="hidden sm:block text-sm text-sage-500 truncate max-w-[200px]">
            {userEmail}
          </span>
        )}
        <div className="w-9 h-9 rounded-full bg-sage-100 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-medium text-sage-600">
            {userInitial}
          </span>
        </div>
        <form action={signout}>
          <button
            type="submit"
            className="text-sm text-sage-500 hover:text-sage-700 transition-colors cursor-pointer"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
