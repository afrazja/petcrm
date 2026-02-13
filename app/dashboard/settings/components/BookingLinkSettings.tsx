"use client";

import { useState, useTransition } from "react";
import { GlobeIcon, ClipboardIcon, CheckCircleIcon } from "@/components/icons";
import { updateBookingSettings } from "@/app/dashboard/actions";
import Button from "@/components/ui/Button";

type Props = {
  currentSlug: string | null;
  currentEnabled: boolean;
  baseUrl: string;
};

export default function BookingLinkSettings({
  currentSlug,
  currentEnabled,
  baseUrl,
}: Props) {
  const [slug, setSlug] = useState(currentSlug ?? "");
  const [enabled, setEnabled] = useState(currentEnabled);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const bookingUrl = slug ? `${baseUrl}/book/${slug}` : "";

  function handleSubmit(formData: FormData) {
    formData.set("slug", slug);
    formData.set("enabled", String(enabled));

    startTransition(async () => {
      const result = await updateBookingSettings(formData);
      if (result.success) {
        setError(null);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        setError(result.error ?? "Something went wrong.");
        setSaved(false);
      }
    });
  }

  async function copyLink() {
    if (!bookingUrl) return;
    try {
      await navigator.clipboard.writeText(bookingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = bookingUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function generateSlug(businessName: string) {
    return businessName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50);
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-warm-gray/50 p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-lg bg-sage-50 flex items-center justify-center text-sage-400">
          <GlobeIcon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-sage-800">
            Online Booking Link
          </h3>
          <p className="text-sm text-sage-500">
            Let customers book appointments online
          </p>
        </div>
      </div>

      <form action={handleSubmit} className="space-y-4">
        {/* Enable toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              enabled ? "bg-sage-400" : "bg-sage-200"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                enabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
          <span className="text-sm font-medium text-sage-700">
            Enable online booking
          </span>
        </label>

        {/* Slug input */}
        <div>
          <label
            htmlFor="bookingSlug"
            className="block text-sm font-medium text-sage-700 mb-1.5"
          >
            Booking Link
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-sage-400 whitespace-nowrap">
              {baseUrl}/book/
            </span>
            <input
              id="bookingSlug"
              type="text"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                setError(null);
                setSaved(false);
              }}
              placeholder="your-business"
              className="flex-1 px-3 py-2.5 text-base rounded-lg border border-warm-gray bg-soft-white text-sage-800 placeholder:text-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-transparent transition-colors"
            />
          </div>
          {!slug && (
            <button
              type="button"
              onClick={() => {
                // Try to auto-generate from a placeholder — user can customize
                setSlug(generateSlug("my-grooming"));
              }}
              className="text-xs text-sage-400 hover:text-sage-600 mt-1 transition-colors"
            >
              Auto-generate a slug
            </button>
          )}
        </div>

        {/* Preview + Copy */}
        {slug && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-sage-50/50 border border-sage-100">
            <span className="text-sm text-sage-600 truncate flex-1">
              {bookingUrl}
            </span>
            <button
              type="button"
              onClick={copyLink}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-sage-500 hover:text-sage-700 hover:bg-white rounded-lg transition-colors"
            >
              {copied ? (
                <>
                  <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-600">Copied!</span>
                </>
              ) : (
                <>
                  <ClipboardIcon className="w-3.5 h-3.5" />
                  Copy
                </>
              )}
            </button>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm text-center">
            {error}
          </div>
        )}

        {saved && (
          <div className="p-3 rounded-lg bg-emerald-50 text-emerald-700 text-sm text-center flex items-center justify-center gap-2">
            <CheckCircleIcon className="w-4 h-4" />
            Settings saved!
          </div>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={isPending}>
          {isPending ? "Saving..." : "Save Booking Settings"}
        </Button>
      </form>
    </div>
  );
}
