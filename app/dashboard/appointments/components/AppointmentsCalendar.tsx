"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ScissorsIcon,
  DollarIcon,
  TrashIcon,
  CalendarIcon,
  XIcon,
  SearchIcon,
} from "@/components/icons";
import { deleteAppointment, editAppointment, updateAppointmentStatus } from "@/app/dashboard/actions";

type Appointment = {
  id: string;
  service: string;
  price: number;
  completedAt: string;
  notes: string | null;
  duration: number;
  status: string;
  petName: string;
  petBreed: string | null;
  ownerName: string;
  ownerPhone: string | null;
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  scheduled: { label: "Scheduled", bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-400" },
  completed: { label: "Completed", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-400" },
  "no-show": { label: "No-Show", bg: "bg-red-50", text: "text-red-600", dot: "bg-red-400" },
};

type ServicePreset = { name: string; defaultPrice: number; defaultDuration: number };

type Props = {
  appointments: Appointment[];
  month: number; // 0-indexed
  year: number;
  servicePresets?: ServicePreset[];
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatDateTimeLocal(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function AppointmentsCalendar({ appointments, month, year, servicePresets = [] }: Props) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editService, setEditService] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editDuration, setEditDuration] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");

  // Filter appointments by search query
  const filteredAppointments = useMemo(() => {
    if (!searchQuery.trim()) return appointments;
    const q = searchQuery.toLowerCase();
    return appointments.filter((appt) => {
      if (appt.petName.toLowerCase().includes(q)) return true;
      if (appt.ownerName.toLowerCase().includes(q)) return true;
      if (appt.service.toLowerCase().includes(q)) return true;
      if (appt.ownerPhone) {
        const phoneDigits = appt.ownerPhone.replace(/\D/g, "");
        const queryDigits = searchQuery.replace(/\D/g, "");
        if (queryDigits.length > 0 && phoneDigits.includes(queryDigits)) return true;
      }
      return false;
    });
  }, [appointments, searchQuery]);

  // Group filtered appointments by day
  const appointmentsByDay = useMemo(() => {
    const map = new Map<number, Appointment[]>();
    for (const appt of filteredAppointments) {
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
  }, [filteredAppointments]);

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

  function handleDelete(appointmentId: string) {
    startTransition(async () => {
      await deleteAppointment(appointmentId);
      setDeleteConfirmId(null);
    });
  }

  function handleEdit(appointmentId: string) {
    if (!editDate || !editService.trim()) return;
    startTransition(async () => {
      await editAppointment(appointmentId, {
        scheduledAt: editDate,
        service: editService,
        price: parseFloat(editPrice) || 0,
        duration: parseInt(editDuration) || 60,
        notes: editNotes || null,
      });
      setEditId(null);
    });
  }

  function openEdit(appt: Appointment) {
    setEditId(appt.id);
    setEditDate(formatDateTimeLocal(appt.completedAt));
    setEditService(appt.service);
    setEditPrice(String(appt.price));
    setEditDuration(String(appt.duration || 60));
    setEditNotes(appt.notes ?? "");
    setDeleteConfirmId(null);
  }

  function closeEdit() {
    setEditId(null);
  }

  function handleStatusChange(appointmentId: string, status: "scheduled" | "completed" | "no-show") {
    startTransition(async () => {
      await updateAppointmentStatus(appointmentId, status);
    });
  }

  return (
    <div>
      {/* Search bar */}
      <div className="relative mb-6">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-sage-400 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by pet, owner, or service..."
          className="w-full pl-12 pr-4 py-3.5 bg-white border border-warm-gray/50 rounded-lg text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-300 text-base shadow-sm"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-sage-400 hover:text-sage-600 text-sm font-medium transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {searchQuery && (
        <p className="text-sm text-sage-400 mb-4">
          {filteredAppointments.length} result{filteredAppointments.length !== 1 ? "s" : ""} for &ldquo;{searchQuery}&rdquo;
        </p>
      )}

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
                {hasAppointments && (() => {
                  const dayAppts = appointmentsByDay.get(day)!;
                  const hasScheduled = dayAppts.some((a) => a.status === "scheduled");
                  const dotColor = isSelected
                    ? "bg-white"
                    : hasScheduled
                    ? "bg-blue-400"
                    : "bg-emerald-400";
                  return (
                    <span
                      className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${dotColor}`}
                    />
                  );
                })()}
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
                const startDate = new Date(appt.completedAt);
                const endDate = new Date(startDate.getTime() + (appt.duration || 60) * 60 * 1000);
                const startTime = startDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
                const endTime = endDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
                const isDeleting = deleteConfirmId === appt.id;
                const isEditing = editId === appt.id;

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
                        <p className="text-xs text-sage-400 mt-0.5">{startTime} - {endTime}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 text-sm text-sage-500">
                      <ScissorsIcon className="w-3.5 h-3.5" />
                      {appt.service}
                      <span className="ml-1 px-1.5 py-0.5 text-xs bg-sage-50 text-sage-400 rounded-full">
                        {appt.duration || 60}min
                      </span>
                      {(() => {
                        const cfg = STATUS_CONFIG[appt.status] ?? STATUS_CONFIG.completed;
                        return (
                          <span className={`ml-auto inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${cfg.bg} ${cfg.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                          </span>
                        );
                      })()}
                    </div>
                    {appt.notes && (
                      <p className="mt-1.5 text-xs text-sage-400 italic">
                        {appt.notes}
                      </p>
                    )}

                    {/* Status + Action buttons */}
                    {!isDeleting && !isEditing && (
                      <div className="mt-3 pt-3 border-t border-warm-gray/30 space-y-2">
                        {/* Status buttons */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-sage-400 mr-1">Status:</span>
                          {(["scheduled", "completed", "no-show"] as const).map((s) => {
                            const cfg = STATUS_CONFIG[s];
                            const isActive = appt.status === s;
                            return (
                              <button
                                key={s}
                                onClick={() => !isActive && handleStatusChange(appt.id, s)}
                                disabled={isPending || isActive}
                                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                                  isActive
                                    ? `${cfg.bg} ${cfg.text} border border-current/20`
                                    : "text-sage-400 hover:text-sage-600 border border-warm-gray/50 hover:border-sage-300"
                                } disabled:opacity-60`}
                              >
                                {cfg.label}
                              </button>
                            );
                          })}
                        </div>
                        {/* Action buttons */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(appt)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-sage-500 hover:text-sage-700 border border-warm-gray/50 hover:border-sage-300 rounded-lg transition-colors"
                          >
                            <CalendarIcon className="w-3.5 h-3.5" />
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              setDeleteConfirmId(appt.id);
                              setEditId(null);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-sage-400 hover:text-red-500 border border-warm-gray/50 hover:border-red-200 rounded-lg transition-colors"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Delete confirmation */}
                    {isDeleting && (
                      <div className="mt-3 pt-3 border-t border-warm-gray/30">
                        <p className="text-sm text-red-600 mb-2">
                          Delete this appointment?
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="flex-1 py-2 text-sm font-medium text-sage-600 bg-white border border-warm-gray/50 rounded-lg hover:bg-sage-50 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleDelete(appt.id)}
                            disabled={isPending}
                            className="flex-1 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                          >
                            {isPending ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Edit form */}
                    {isEditing && (
                      <div className="mt-3 pt-3 border-t border-warm-gray/30">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-medium text-sage-700">Edit Appointment</p>
                          <button
                            onClick={closeEdit}
                            className="p-1 text-sage-400 hover:text-sage-600 transition-colors"
                          >
                            <XIcon className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <label className="text-xs text-sage-400 mb-0.5 block">Date & Time</label>
                            <input
                              type="datetime-local"
                              value={editDate}
                              onChange={(e) => setEditDate(e.target.value)}
                              className="w-full px-3 py-2 text-sm rounded-lg border border-warm-gray bg-soft-white text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-transparent transition-colors"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-sage-400 mb-0.5 block">Service</label>
                            {servicePresets.length > 0 ? (
                              <select
                                value={servicePresets.some((p) => p.name === editService) ? editService : "__custom__"}
                                onChange={(e) => {
                                  if (e.target.value === "__custom__") return;
                                  const preset = servicePresets.find((p) => p.name === e.target.value);
                                  if (preset) {
                                    setEditService(preset.name);
                                    setEditPrice(String(preset.defaultPrice));
                                    setEditDuration(String(preset.defaultDuration));
                                  }
                                }}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-warm-gray bg-soft-white text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-transparent transition-colors"
                              >
                                {!servicePresets.some((p) => p.name === editService) && (
                                  <option value="__custom__">{editService}</option>
                                )}
                                {servicePresets.map((p) => (
                                  <option key={p.name} value={p.name}>{p.name}</option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type="text"
                                value={editService}
                                onChange={(e) => setEditService(e.target.value)}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-warm-gray bg-soft-white text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-transparent transition-colors"
                              />
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs text-sage-400 mb-0.5 block">Price ($)</label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={editPrice}
                                onChange={(e) => setEditPrice(e.target.value)}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-warm-gray bg-soft-white text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-transparent transition-colors"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-sage-400 mb-0.5 block">Duration (min)</label>
                              <input
                                type="number"
                                min="5"
                                step="5"
                                value={editDuration}
                                onChange={(e) => setEditDuration(e.target.value)}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-warm-gray bg-soft-white text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-transparent transition-colors"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-sage-400 mb-0.5 block">Notes</label>
                            <input
                              type="text"
                              value={editNotes}
                              onChange={(e) => setEditNotes(e.target.value)}
                              placeholder="Optional notes..."
                              className="w-full px-3 py-2 text-sm rounded-lg border border-warm-gray bg-soft-white text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-transparent transition-colors"
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => handleEdit(appt.id)}
                          disabled={isPending || !editDate || !editService.trim()}
                          className="w-full mt-3 py-2 text-sm font-medium text-white bg-sage-400 rounded-lg hover:bg-sage-500 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {isPending ? "Saving..." : "Save Changes"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Empty month hint */}
      {appointments.length === 0 && selectedDay === null && (
        <div className="bg-white rounded-2xl shadow-sm border border-warm-gray/50 p-8 text-center mb-4">
          <CalendarIcon className="w-12 h-12 text-sage-300 mx-auto mb-3" />
          <p className="text-sage-500 text-sm">
            No appointments this month. Tap the <span className="font-medium text-sage-600">+</span> button to schedule one.
          </p>
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
