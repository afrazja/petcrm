"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { signout } from "@/app/auth/actions";
import { MenuIcon, ChevronLeftIcon } from "@/components/icons";

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

function getBackLink(pathname: string): { href: string; label: string } | null {
  if (pathname === "/dashboard") return null;
  if (pathname.startsWith("/dashboard/pets/") && pathname !== "/dashboard/pets")
    return { href: "/dashboard/pets", label: "Pets" };
  if (pathname.startsWith("/dashboard/clients/") && pathname !== "/dashboard/clients")
    return { href: "/dashboard/clients", label: "Clients" };
  return { href: "/dashboard", label: "Dashboard" };
}

export default function Header({ userEmail, userInitial, onMenuToggle }: Props) {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);
  const backLink = getBackLink(pathname);

  return (
    <header className="h-16 bg-white border-b border-warm-gray/50 flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="md:hidden p-2 -ml-2 rounded-lg text-sage-500 hover:bg-sage-50 transition-colors"
        >
          <MenuIcon className="w-5 h-5" />
        </button>
        {backLink && (
          <Link
            href={backLink.href}
            className="hidden md:flex items-center gap-1 text-sage-400 hover:text-sage-600 transition-colors -ml-1 mr-1"
            aria-label={`Back to ${backLink.label}`}
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </Link>
        )}
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
