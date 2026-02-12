"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon, ScissorsIcon, DollarIcon } from "@/components/icons";

type Appointment = {
  id: string;
  service: string;
  price: number;
  completedAt: string;
  notes: string | null;
  petName: string;
  petBreed: string | null;
  ownerName: string;
  ownerPhone: string | null;
};

type Props = {
  appointments: Appointment[];
  month: number; // 0-indexed
  year: number;
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function AppointmentsCalendar({ appointments, month, year }: Props) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Group appointments by day
  const appointmentsByDay = useMemo(() => {
    const map = new Map<number, Appointment[]>();
    for (const appt of appointments) {
      const d = new Date(appt.completedAt);
      const day = d.getDate();
      const existing = map.get(day);
      if (existing) {
        existing.push(appt);
      } else {
        map.set(day, [appt]);
      }
    }
    return map;
  }, [appointments]);

  // Calendar grid
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;
  const todayDate = today.getDate();

  // Navigation
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;

  // Selected day's appointments
  const selectedAppointments = selectedDay ? appointmentsByDay.get(selectedDay) ?? [] : [];

  return (
    <div>
      {/* Month header with navigation */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href={`/dashboard/appointments?month=${prevMonth}&year=${prevYear}`}
          className="p-2 rounded-lg text-sage-400 hover:text-sage-700 hover:bg-sage-50 transition-colors"
        >
          <ChevronLeftIcon className="w-5 h-5" />
        </Link>
        <h3 className="text-lg font-semibold text-sage-800">
          {MONTHS[month]} {year}
        </h3>
        <Link
          href={`/dashboard/appointments?month=${nextMonth}&year=${nextYear}`}
          className="p-2 rounded-lg text-sage-400 hover:text-sage-700 hover:bg-sage-50 transition-colors"
        >
          <ChevronRightIcon className="w-5 h-5" />
        </Link>
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-2xl shadow-sm border border-warm-gray/50 p-4 mb-6">
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-2">
          {DAYS.map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-sage-400 py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells before first day */}
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} className="h-10" />
          ))}

          {/* Day cells */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const hasAppointments = appointmentsByDay.has(day);
            const isToday = isCurrentMonth && day === todayDate;
            const isSelected = day === selectedDay;

            return (
              <button
                key={day}
                onClick={() => setSelectedDay(isSelected ? null : day)}
                className={`h-10 rounded-lg text-sm font-medium relative transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-sage-400 text-white"
                    : isToday
                    ? "bg-sage-100 text-sage-700"
                    : "text-sage-600 hover:bg-sage-50"
                }`}
              >
                {day}
                {hasAppointments && (
                  <span
                    className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${
                      isSelected ? "bg-white" : "bg-sage-400"
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day's appointments */}
      {selectedDay !== null && (
        <div className="mb-6">
          <h4 className="text-base font-semibold text-sage-700 mb-3">
            {MONTHS[month]} {selectedDay}, {year}
            <span className="ml-2 text-sm font-normal text-sage-400">
              {selectedAppointments.length} appointment
              {selectedAppointments.length !== 1 ? "s" : ""}
            </span>
          </h4>

          {selectedAppointments.length === 0 ? (
            <div className="bg-white rounded-xl p-4 border border-warm-gray/50 text-center text-sm text-sage-400">
              No appointments on this day.
            </div>
          ) : (
            <div className="space-y-3">
              {selectedAppointments.map((appt) => {
                const time = new Date(appt.completedAt).toLocaleTimeString(
                  "en-US",
                  { hour: "numeric", minute: "2-digit", hour12: true }
                );
                return (
                  <div
                    key={appt.id}
                    className="bg-white rounded-xl p-4 border border-warm-gray/50 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sage-800">
                          {appt.petName}
                          {appt.petBreed && (
                            <span className="text-sage-400 font-normal ml-1.5">
                              {appt.petBreed}
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-sage-500 mt-0.5">
                          {appt.ownerName}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="flex items-center gap-1 text-sage-600 font-medium text-sm">
                          <DollarIcon className="w-3.5 h-3.5" />
                          ${appt.price.toFixed(2)}
                        </div>
                        <p className="text-xs text-sage-400 mt-0.5">{time}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 text-sm text-sage-500">
                      <ScissorsIcon className="w-3.5 h-3.5" />
                      {appt.service}
                    </div>
                    {appt.notes && (
                      <p className="mt-1.5 text-xs text-sage-400 italic">
                        {appt.notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      <div className="bg-white rounded-2xl shadow-sm border border-warm-gray/50 p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-sage-500">
            {appointments.length} appointment{appointments.length !== 1 ? "s" : ""} this month
          </span>
          <span className="text-sage-700 font-medium">
            $
            {appointments
              .reduce((sum, a) => sum + a.price, 0)
              .toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
