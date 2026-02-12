import Link from "next/link";
import {
  BellIcon,
  CalendarIcon,
  ClockIcon,
  PawPrintIcon,
} from "@/components/icons";

type UpcomingAppointment = {
  id: string;
  petName: string;
  service: string;
  ownerName: string;
  scheduledAt: string;
};

type OverdueClient = {
  id: string;
  fullName: string;
  petNames: string[];
  lastVisit: string;
  weeksOverdue: number;
};

type ExpiringVaccine = {
  petId: string;
  petName: string;
  ownerName: string;
  vaccineExpiry: string;
  daysUntilExpiry: number; // negative = already expired
};

type Props = {
  upcomingAppointments: UpcomingAppointment[];
  overdueClients: OverdueClient[];
  expiringVaccines: ExpiringVaccine[];
};

function getDayLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === now.toDateString()) return "Today";
  if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function groupByDay(appointments: UpcomingAppointment[]) {
  const groups = new Map<string, UpcomingAppointment[]>();
  for (const appt of appointments) {
    const label = getDayLabel(appt.scheduledAt);
    const existing = groups.get(label);
    if (existing) {
      existing.push(appt);
    } else {
      groups.set(label, [appt]);
    }
  }
  return Array.from(groups.entries());
}

export default function Reminders({
  upcomingAppointments,
  overdueClients,
  expiringVaccines,
}: Props) {
  const hasAny =
    upcomingAppointments.length > 0 ||
    overdueClients.length > 0 ||
    expiringVaccines.length > 0;

  if (!hasAny) return null;

  const groupedUpcoming = groupByDay(upcomingAppointments);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-warm-gray/50 p-6 mb-8">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500">
          <BellIcon className="w-4.5 h-4.5" />
        </div>
        <h3 className="text-lg font-semibold text-sage-700">Reminders</h3>
      </div>

      <div className="space-y-5">
        {/* Upcoming Appointments */}
        {upcomingAppointments.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <CalendarIcon className="w-4 h-4 text-sage-400" />
              <h4 className="text-sm font-semibold text-sage-600 uppercase tracking-wide">
                Upcoming
              </h4>
            </div>
            <div className="space-y-3">
              {groupedUpcoming.map(([dayLabel, appts]) => (
                <div key={dayLabel}>
                  <p className="text-xs font-medium text-sage-400 mb-1.5 pl-1">
                    {dayLabel}
                  </p>
                  <div className="space-y-1">
                    {appts.map((appt) => {
                      const time = new Date(
                        appt.scheduledAt
                      ).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      });
                      return (
                        <div
                          key={appt.id}
                          className="flex items-center justify-between px-3 py-2 bg-sage-50/50 rounded-lg text-sm"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-medium text-sage-700 truncate">
                              {appt.petName}
                            </span>
                            <span className="text-sage-400">&middot;</span>
                            <span className="text-sage-500 truncate">
                              {appt.service}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 text-right">
                            <span className="text-sage-400 text-xs">
                              {appt.ownerName}
                            </span>
                            <span className="text-sage-500 text-xs font-medium">
                              {time}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Overdue Clients */}
        {overdueClients.length > 0 && (
          <div>
            {upcomingAppointments.length > 0 && (
              <div className="border-t border-warm-gray/30 mb-4" />
            )}
            <div className="flex items-center gap-1.5 mb-3">
              <ClockIcon className="w-4 h-4 text-red-400" />
              <h4 className="text-sm font-semibold text-red-500 uppercase tracking-wide">
                Overdue
              </h4>
              <span className="text-xs text-sage-400 font-normal normal-case ml-1">
                ({overdueClients.length} client
                {overdueClients.length !== 1 ? "s" : ""})
              </span>
            </div>
            <div className="space-y-1">
              {overdueClients.map((client) => (
                <Link
                  key={client.id}
                  href="/dashboard/clients"
                  className="flex items-center justify-between px-3 py-2 bg-red-50/50 rounded-lg text-sm hover:bg-red-50 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium text-sage-700 truncate">
                      {client.fullName}
                    </span>
                    <span className="text-sage-400">&middot;</span>
                    <span className="text-sage-500 text-xs truncate">
                      {client.petNames.join(", ")}
                    </span>
                  </div>
                  <span className="text-red-500 text-xs font-medium flex-shrink-0">
                    {client.weeksOverdue}w overdue
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Expiring Vaccines */}
        {expiringVaccines.length > 0 && (
          <div>
            {(upcomingAppointments.length > 0 ||
              overdueClients.length > 0) && (
              <div className="border-t border-warm-gray/30 mb-4" />
            )}
            <div className="flex items-center gap-1.5 mb-3">
              <PawPrintIcon className="w-4 h-4 text-amber-500" />
              <h4 className="text-sm font-semibold text-amber-600 uppercase tracking-wide">
                Vaccines
              </h4>
            </div>
            <div className="space-y-1">
              {expiringVaccines.map((vaccine) => {
                const isExpired = vaccine.daysUntilExpiry < 0;
                const label = isExpired
                  ? `Expired ${Math.abs(vaccine.daysUntilExpiry)}d ago`
                  : vaccine.daysUntilExpiry === 0
                  ? "Expires today"
                  : `Expires in ${vaccine.daysUntilExpiry}d`;

                return (
                  <Link
                    key={vaccine.petId}
                    href={`/dashboard/pets/${vaccine.petId}`}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm hover:bg-sage-50 transition-colors ${
                      isExpired ? "bg-red-50/50" : "bg-amber-50/50"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-sage-700 truncate">
                        {vaccine.petName}
                      </span>
                      <span className="text-sage-400">&middot;</span>
                      <span className="text-sage-500 text-xs truncate">
                        {vaccine.ownerName}
                      </span>
                    </div>
                    <span
                      className={`text-xs font-medium flex-shrink-0 ${
                        isExpired ? "text-red-500" : "text-amber-600"
                      }`}
                    >
                      {label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
