"use client";

import { useSearchParams } from "next/navigation";
import { signup } from "@/app/auth/actions";
import Button from "@/components/ui/Button";
import Link from "next/link";

export default function SignupPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <div className="bg-white rounded-2xl p-8 shadow-sm border border-warm-gray/50">
      <h1 className="text-xl font-semibold text-sage-800 text-center mb-6">
        Create your account
      </h1>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm text-center">
          {error}
        </div>
      )}

      <form action={signup} className="space-y-4">
        <div>
          <label
            htmlFor="full_name"
            className="block text-sm font-medium text-sage-700 mb-1"
          >
            Full Name
          </label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            required
            className="w-full px-3 py-2 rounded-lg border border-warm-gray bg-soft-white text-sage-800 placeholder:text-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-transparent transition-colors"
            placeholder="Jane Smith"
          />
        </div>
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-sage-700 mb-1"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full px-3 py-2 rounded-lg border border-warm-gray bg-soft-white text-sage-800 placeholder:text-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-transparent transition-colors"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-sage-700 mb-1"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            className="w-full px-3 py-2 rounded-lg border border-warm-gray bg-soft-white text-sage-800 placeholder:text-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-transparent transition-colors"
            placeholder="At least 6 characters"
          />
        </div>
        <Button type="submit" className="w-full">
          Create Account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-sage-500">
        Already have an account?{" "}
        <Link
          href="/auth/login"
          className="text-sage-700 font-medium hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
