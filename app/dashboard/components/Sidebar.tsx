"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, UsersIcon, PawPrintIcon, CalendarIcon, SettingsIcon } from "@/components/icons";

const navItems = [
  { name: "Home", href: "/dashboard", icon: HomeIcon },
  { name: "Clients", href: "/dashboard/clients", icon: UsersIcon },
  { name: "Pets", href: "/dashboard/pets", icon: PawPrintIcon },
  { name: "Appointments", href: "/dashboard/appointments", icon: CalendarIcon },
  { name: "Settings", href: "/dashboard/settings", icon: SettingsIcon },
];

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-warm-gray/50">
        <Link href="/" className="flex items-center gap-2">
          <PawPrintIcon className="w-7 h-7 text-sage-400" />
          <span className="text-xl font-semibold tracking-tight text-sage-700">
            PetCRM
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                    isActive
                      ? "bg-sage-100 text-sage-700"
                      : "text-sage-500 hover:bg-sage-50 hover:text-sage-700"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-warm-gray/50">
        <p className="text-xs text-sage-400">PetCRM v0.1.0</p>
      </div>
    </div>
  );
}
