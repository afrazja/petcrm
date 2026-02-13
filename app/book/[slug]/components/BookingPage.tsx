"use client";

import { useState } from "react";
import { CheckCircleIcon, PawPrintIcon, CalendarIcon, PhoneIcon } from "@/components/icons";
import ServiceSelector from "./ServiceSelector";

type Service = {
  id: string;
  name: string;
  price: number;
  duration: number;
};

type GroomerInfo = {
  id: string;
  name: string | null;
  businessName: string | null;
};

type Pet = {
  id: string;
  name: string;
  breed: string | null;
};

type Appointment = {
  id: string;
  service: string;
  price: number;
  date: string;
  status: string;
  petId: string;
};

type Props = {
  slug: string;
  groomer: GroomerInfo;
  services: Service[];
};

type Step = "phone" | "returning" | "new" | "confirmation";

export default function BookingPage({ slug, groomer, services }: Props) {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Returning customer data
  const [clientData, setClientData] = useState<{
    id: string;
    name: string;
    phone: string;
  } | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [history, setHistory] = useState<Appointment[]>([]);

  // Booking form state
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [scheduledAt, setScheduledAt] = useState("");
  const [notes, setNotes] = useState("");

  // New customer fields
  const [customerName, setCustomerName] = useState("");
  const [petName, setPetName] = useState("");
  const [petBreed, setPetBreed] = useState("");

  // Confirmation data
  const [confirmationData, setConfirmationData] = useState<{
    service: string;
    date: string;
  } | null>(null);

  const businessName = groomer.businessName || groomer.name || "Groomer";

  // ─── Phone Lookup ─────────────────────────────────────────────────
  async function handlePhoneLookup() {
    if (!phone.trim()) {
      setError("Please enter your phone number.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/book/${slug}/lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }

      if (data.found) {
        setClientData(data.client);
        setPets(data.pets);
        setHistory(data.appointments);
        if (data.pets.length === 1) {
          setSelectedPetId(data.pets[0].id);
        }
        setStep("returning");
      } else {
        setStep("new");
      }
    } catch {
      setError("Could not connect. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  // ─── Book Appointment ─────────────────────────────────────────────
  async function handleBook() {
    if (!selectedService) {
      setError("Please select a service.");
      return;
    }
    if (!scheduledAt) {
      setError("Please choose a date and time.");
      return;
    }

    setIsLoading(true);
    setError(null);

    const isReturning = step === "returning" && clientData;

    const body = isReturning
      ? {
          clientId: clientData.id,
          petId: selectedPetId,
          service: selectedService,
          scheduledAt,
          notes: notes.trim() || undefined,
        }
      : {
          customerName: customerName.trim(),
          customerPhone: phone,
          petName: petName.trim(),
          petBreed: petBreed.trim() || undefined,
          service: selectedService,
          scheduledAt,
          notes: notes.trim() || undefined,
        };

    try {
      const res = await fetch(`/api/book/${slug}/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create booking.");
        return;
      }

      setConfirmationData({
        service: data.appointment.service,
        date: data.appointment.date,
      });
      setStep("confirmation");
    } catch {
      setError("Could not connect. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  // ─── Validation checks ─────────────────────────────────────────────
  const canBookReturning = selectedPetId && selectedService && scheduledAt;
  const canBookNew =
    customerName.trim() && petName.trim() && selectedService && scheduledAt;

  // Minimum date for datetime-local input (now)
  const minDateTime = new Date(Date.now() + 60 * 60 * 1000)
    .toISOString()
    .slice(0, 16);

  return (
    <div className="min-h-screen bg-soft-white">
      <div className="max-w-md mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-sage-50 flex items-center justify-center text-sage-400 mx-auto mb-4">
            <PawPrintIcon className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-sage-800">{businessName}</h1>
          <p className="text-sage-500 mt-1">Book your appointment online</p>
        </div>

        {/* ──────────── STEP: Phone Entry ──────────── */}
        {step === "phone" && (
          <div className="bg-white rounded-2xl shadow-sm border border-warm-gray/50 p-6">
            <div className="flex items-center gap-2 mb-4">
              <PhoneIcon className="w-5 h-5 text-sage-400" />
              <h2 className="text-lg font-semibold text-sage-800">
                Enter your phone number
              </h2>
            </div>
            <p className="text-sm text-sage-500 mb-5">
              We&apos;ll look you up to see if you&apos;ve visited before.
            </p>

            <div className="space-y-4">
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handlePhoneLookup();
                }}
                placeholder="(555) 123-4567"
                autoFocus
                className="w-full px-4 py-3.5 text-base rounded-lg border border-warm-gray bg-soft-white text-sage-800 placeholder:text-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-transparent transition-colors"
              />

              {error && (
                <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm text-center">
                  {error}
                </div>
              )}

              <button
                onClick={handlePhoneLookup}
                disabled={isLoading}
                className="w-full py-3.5 rounded-xl bg-sage-400 text-white font-medium hover:bg-sage-500 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Looking up..." : "Look Me Up"}
              </button>
            </div>
          </div>
        )}

        {/* ──────────── STEP: Returning Customer ──────────── */}
        {step === "returning" && clientData && (
          <div className="space-y-4">
            {/* Welcome */}
            <div className="bg-white rounded-2xl shadow-sm border border-warm-gray/50 p-6">
              <h2 className="text-lg font-semibold text-sage-800 mb-1">
                Welcome back, {clientData.name.split(" ")[0]}!
              </h2>
              <p className="text-sm text-sage-500">
                Select a pet and service to book your appointment.
              </p>
            </div>

            {/* Past Appointments */}
            {history.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-warm-gray/50 p-6">
                <div className="flex items-center gap-2 mb-3">
                  <CalendarIcon className="w-4 h-4 text-sage-400" />
                  <h3 className="text-sm font-semibold text-sage-600 uppercase tracking-wide">
                    Recent Visits
                  </h3>
                </div>
                <div className="space-y-2">
                  {history.slice(0, 5).map((appt) => (
                    <div
                      key={appt.id}
                      className="flex items-center justify-between py-2 px-3 rounded-lg bg-sage-50/50"
                    >
                      <div>
                        <span className="text-sm font-medium text-sage-700">
                          {appt.service}
                        </span>
                        {appt.status === "scheduled" && (
                          <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium">
                            Upcoming
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-sage-400">
                        {new Date(appt.date).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Booking Form */}
            <div className="bg-white rounded-2xl shadow-sm border border-warm-gray/50 p-6 space-y-5">
              {/* Pet Selector */}
              {pets.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-sage-700 mb-2">
                    Which pet?
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {pets.map((pet) => (
                      <button
                        key={pet.id}
                        type="button"
                        onClick={() => setSelectedPetId(pet.id)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                          selectedPetId === pet.id
                            ? "bg-sage-400 text-white border-sage-400"
                            : "bg-white text-sage-600 border-sage-200 hover:border-sage-300"
                        }`}
                      >
                        <PawPrintIcon className="w-4 h-4 inline mr-1.5" />
                        {pet.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {pets.length === 1 && (
                <div className="flex items-center gap-2 text-sm text-sage-600">
                  <PawPrintIcon className="w-4 h-4 text-sage-400" />
                  Booking for <strong>{pets[0].name}</strong>
                </div>
              )}

              {/* Service Selector */}
              <div>
                <label className="block text-sm font-medium text-sage-700 mb-2">
                  Service
                </label>
                <ServiceSelector
                  services={services}
                  selected={selectedService}
                  onSelect={setSelectedService}
                />
              </div>

              {/* Date/Time */}
              <div>
                <label className="block text-sm font-medium text-sage-700 mb-1.5">
                  Preferred Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  min={minDateTime}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full px-4 py-3.5 text-base rounded-lg border border-warm-gray bg-soft-white text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-transparent transition-colors"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-sage-700 mb-1.5">
                  Notes <span className="text-sage-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Any special requests or instructions..."
                  className="w-full px-4 py-3 text-base rounded-lg border border-warm-gray bg-soft-white text-sage-800 placeholder:text-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-transparent transition-colors resize-none"
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm text-center">
                  {error}
                </div>
              )}

              <button
                onClick={handleBook}
                disabled={isLoading || !canBookReturning}
                className="w-full py-3.5 rounded-xl bg-sage-400 text-white font-medium hover:bg-sage-500 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Booking..." : "Book Appointment"}
              </button>
            </div>

            {/* Back button */}
            <button
              onClick={() => {
                setStep("phone");
                setError(null);
              }}
              className="w-full text-center text-sm text-sage-400 hover:text-sage-600 transition-colors py-2"
            >
              Use a different phone number
            </button>
          </div>
        )}

        {/* ──────────── STEP: New Customer ──────────── */}
        {step === "new" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-warm-gray/50 p-6">
              <h2 className="text-lg font-semibold text-sage-800 mb-1">
                Welcome!
              </h2>
              <p className="text-sm text-sage-500">
                Looks like you&apos;re new here. Fill in your info to book.
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-warm-gray/50 p-6 space-y-5">
              {/* Your Info */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-sage-600 uppercase tracking-wide">
                  Your Info
                </p>
                <div>
                  <label className="block text-sm font-medium text-sage-700 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Sarah Johnson"
                    autoFocus
                    className="w-full px-4 py-3.5 text-base rounded-lg border border-warm-gray bg-soft-white text-sage-800 placeholder:text-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-transparent transition-colors"
                  />
                </div>
                <div className="flex items-center gap-2 text-sm text-sage-500 px-1">
                  <PhoneIcon className="w-4 h-4 text-sage-400" />
                  {phone}
                </div>
              </div>

              {/* Pet Info */}
              <div className="border-t border-warm-gray/50 pt-4 space-y-3">
                <p className="text-sm font-semibold text-sage-600 uppercase tracking-wide">
                  Your Pet
                </p>
                <div>
                  <label className="block text-sm font-medium text-sage-700 mb-1.5">
                    Pet Name
                  </label>
                  <input
                    type="text"
                    value={petName}
                    onChange={(e) => setPetName(e.target.value)}
                    placeholder="e.g. Buddy"
                    className="w-full px-4 py-3.5 text-base rounded-lg border border-warm-gray bg-soft-white text-sage-800 placeholder:text-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-transparent transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-sage-700 mb-1.5">
                    Breed <span className="text-sage-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={petBreed}
                    onChange={(e) => setPetBreed(e.target.value)}
                    placeholder="e.g. Golden Retriever"
                    className="w-full px-4 py-3.5 text-base rounded-lg border border-warm-gray bg-soft-white text-sage-800 placeholder:text-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-transparent transition-colors"
                  />
                </div>
              </div>

              {/* Service Selector */}
              <div className="border-t border-warm-gray/50 pt-4">
                <label className="block text-sm font-medium text-sage-700 mb-2">
                  Service
                </label>
                <ServiceSelector
                  services={services}
                  selected={selectedService}
                  onSelect={setSelectedService}
                />
              </div>

              {/* Date/Time */}
              <div>
                <label className="block text-sm font-medium text-sage-700 mb-1.5">
                  Preferred Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  min={minDateTime}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full px-4 py-3.5 text-base rounded-lg border border-warm-gray bg-soft-white text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-transparent transition-colors"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-sage-700 mb-1.5">
                  Notes <span className="text-sage-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Any special requests or instructions..."
                  className="w-full px-4 py-3 text-base rounded-lg border border-warm-gray bg-soft-white text-sage-800 placeholder:text-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-transparent transition-colors resize-none"
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm text-center">
                  {error}
                </div>
              )}

              <button
                onClick={handleBook}
                disabled={isLoading || !canBookNew}
                className="w-full py-3.5 rounded-xl bg-sage-400 text-white font-medium hover:bg-sage-500 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Booking..." : "Book Appointment"}
              </button>
            </div>

            {/* Back button */}
            <button
              onClick={() => {
                setStep("phone");
                setError(null);
              }}
              className="w-full text-center text-sm text-sage-400 hover:text-sage-600 transition-colors py-2"
            >
              Use a different phone number
            </button>
          </div>
        )}

        {/* ──────────── STEP: Confirmation ──────────── */}
        {step === "confirmation" && confirmationData && (
          <div className="bg-white rounded-2xl shadow-sm border border-warm-gray/50 p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircleIcon className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-sage-800 mb-2">
              You&apos;re all set!
            </h2>
            <p className="text-sage-500 mb-6">
              Your appointment has been booked.
            </p>

            <div className="bg-sage-50/50 rounded-xl p-4 mb-6 space-y-2 text-left">
              <div className="flex justify-between text-sm">
                <span className="text-sage-500">Service</span>
                <span className="font-medium text-sage-800">
                  {confirmationData.service}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-sage-500">Date</span>
                <span className="font-medium text-sage-800">
                  {new Date(confirmationData.date).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-sage-500">Time</span>
                <span className="font-medium text-sage-800">
                  {new Date(confirmationData.date).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                // Reset everything for a new booking
                setStep("phone");
                setPhone("");
                setClientData(null);
                setPets([]);
                setHistory([]);
                setSelectedPetId(null);
                setSelectedService(null);
                setScheduledAt("");
                setNotes("");
                setCustomerName("");
                setPetName("");
                setPetBreed("");
                setConfirmationData(null);
                setError(null);
              }}
              className="text-sm text-sage-500 hover:text-sage-700 font-medium transition-colors"
            >
              Book another appointment
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-sage-300">
            Powered by{" "}
            <span className="font-medium text-sage-400">Mirifer</span>
          </p>
        </div>
      </div>
    </div>
  );
}
