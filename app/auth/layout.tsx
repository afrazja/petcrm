import { Suspense } from "react";
import Link from "next/link";
import { PawPrintIcon } from "@/components/icons";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-soft-white">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="flex items-center justify-center gap-2 mb-8"
        >
          <PawPrintIcon className="w-8 h-8 text-sage-400" />
          <span className="text-2xl font-semibold tracking-tight text-sage-700">
            PetCRM
          </span>
        </Link>
        <Suspense>{children}</Suspense>
      </div>
    </div>
  );
}
