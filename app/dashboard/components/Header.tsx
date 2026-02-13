"use client";

import { usePathname } from "next/navigation";
import { signout } from "@/app/auth/actions";
import { MenuIcon } from "@/components/icons";

type Props = {
  userEmail: string | null;
  userInitial: string;
  onMenuToggle: () => void;
};

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/clients": "Clients",
  "/dashboard/pets": "Pets",
  "/dashboard/appointments": "Appointments",
  "/dashboard/settings": "Settings",
};

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  if (pathname.startsWith("/dashboard/pets/")) return "Pet Details";
  if (pathname.startsWith("/dashboard/clients/")) return "Client Details";
  return "Dashboard";
}

export default function Header({ userEmail, userInitial, onMenuToggle }: Props) {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);

  return (
    <header className="h-16 bg-white border-b border-warm-gray/50 flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="md:hidden p-2 -ml-2 rounded-lg text-sage-500 hover:bg-sage-50 transition-colors"
        >
          <MenuIcon className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-sage-700">{pageTitle}</h1>
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
