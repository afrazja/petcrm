import Button from "@/components/ui/Button";
import {
  PawPrintIcon,
  ScissorsIcon,
  CalendarIcon,
  UsersIcon,
  DollarIcon,
  WhatsAppIcon,
  CameraIcon,
  CheckCircleIcon,
  ClockIcon,
  PhoneIcon,
} from "@/components/icons";

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-soft-white/80 backdrop-blur-md border-b border-warm-gray/50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PawPrintIcon className="w-7 h-7 text-sage-400" />
            <span className="text-xl font-semibold tracking-tight text-sage-700">
              Mirifer
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button href="/auth/login" variant="ghost" size="sm">
              Log In
            </Button>
            <Button href="/auth/signup" size="sm">
              Sign Up Free
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 md:pt-44 md:pb-32">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-sage-50 rounded-full px-4 py-1.5 mb-6 animate-fade-in-up">
            <ScissorsIcon className="w-4 h-4 text-sage-400" />
            <span className="text-sm font-medium text-sage-600">
              Built for solo pet groomers
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-sage-800 animate-fade-in-up">
            Your grooming business,
            <br />
            <span className="text-sage-400">all in one place.</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-sage-500 max-w-xl mx-auto leading-relaxed animate-fade-in-up-delay">
            Track clients, manage appointments, send WhatsApp reminders, and
            see your revenue — all from your phone. No paperwork, no
            spreadsheets.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up-delay-2">
            <Button href="/auth/signup" size="lg">
              Get Started Free
            </Button>
            <Button href="/auth/login" variant="secondary" size="lg">
              Log In
            </Button>
          </div>
          <p className="mt-4 text-sm text-sage-400 animate-fade-in-up-delay-2">
            Free to use. No credit card required.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="pb-24 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-sage-800 text-center mb-4">
            Up and running in minutes
          </h2>
          <p className="text-sage-500 text-center mb-12 max-w-lg mx-auto">
            No setup, no training. Just sign up and start checking in pets.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <StepCard
              step="1"
              title="Check in a pet"
              description="Enter the pet name and owner info. Mirifer creates the client, pet profile, and appointment in one tap."
            />
            <StepCard
              step="2"
              title="Groom & track"
              description="Log services, prices, and notes. View revenue stats and grooming history automatically."
            />
            <StepCard
              step="3"
              title="Remind & rebook"
              description="Send WhatsApp reminders with one tap. Rebook returning clients instantly."
            />
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="pb-24 px-6 bg-sage-50/30">
        <div className="max-w-5xl mx-auto pt-16">
          <h2 className="text-2xl md:text-3xl font-bold text-sage-800 text-center mb-4">
            Everything a solo groomer needs
          </h2>
          <p className="text-sage-500 text-center mb-12 max-w-lg mx-auto">
            No bloated software. Just the features that matter for your daily workflow.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard
              icon={<PawPrintIcon className="w-6 h-6" />}
              title="Pet Profiles"
              description="Breed, temperament, grooming preferences, vaccine expiry dates, and photo gallery for each pet."
            />
            <FeatureCard
              icon={<UsersIcon className="w-6 h-6" />}
              title="Client Management"
              description="Contact info, visit history, and total spend — all linked to their pets automatically."
            />
            <FeatureCard
              icon={<CalendarIcon className="w-6 h-6" />}
              title="Appointment Calendar"
              description="Monthly view with day details. Schedule, edit, mark complete, or flag no-shows."
            />
            <FeatureCard
              icon={<DollarIcon className="w-6 h-6" />}
              title="Revenue Dashboard"
              description="See today, this week, and this month at a glance. Service breakdown shows what earns most."
            />
            <FeatureCard
              icon={<WhatsAppIcon className="w-6 h-6" />}
              title="WhatsApp Reminders"
              description="One-tap appointment reminders via WhatsApp. No extra cost, no API fees."
            />
            <FeatureCard
              icon={<ScissorsIcon className="w-6 h-6" />}
              title="Grooming History"
              description="Full visit log on every pet profile — services, prices, duration, and your notes."
            />
            <FeatureCard
              icon={<CameraIcon className="w-6 h-6" />}
              title="Pet Photos"
              description="Upload before/after photos for each pet. Build a visual record of your work."
            />
            <FeatureCard
              icon={<CheckCircleIcon className="w-6 h-6" />}
              title="Quick Check-In"
              description="One form creates client + pet + appointment. New or returning — it handles both."
            />
            <FeatureCard
              icon={<ClockIcon className="w-6 h-6" />}
              title="Smart Reminders"
              description="See overdue clients, upcoming appointments, and expiring vaccines on your dashboard."
            />
          </div>
        </div>
      </section>

      {/* PWA / Mobile Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-warm-gray/50">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="w-16 h-16 rounded-2xl bg-sage-50 flex items-center justify-center flex-shrink-0">
                <PhoneIcon className="w-8 h-8 text-sage-400" />
              </div>
              <div>
                <h3 className="text-xl md:text-2xl font-bold text-sage-800 mb-2">
                  Works on your phone like an app
                </h3>
                <p className="text-sage-500 leading-relaxed">
                  Mirifer is a Progressive Web App. Add it to your home screen and
                  it works just like a native app — fast, fullscreen, no app store needed.
                  Use it on your phone while grooming, or on your laptop at the desk.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="pb-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-sage-400 rounded-3xl p-10 md:p-14">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              Ready to simplify your day?
            </h2>
            <p className="mt-4 text-sage-100">
              Stop juggling notebooks and spreadsheets. Start your free account in seconds.
            </p>
            <div className="mt-8">
              <Button
                href="/auth/signup"
                variant="secondary"
                size="lg"
                className="!bg-white !text-sage-700 hover:!bg-sage-50"
              >
                Get Started Free
              </Button>
            </div>
            <p className="mt-4 text-sm text-sage-200">
              No credit card. No trial limits.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-warm-gray/50 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <PawPrintIcon className="w-5 h-5 text-sage-300" />
            <span className="text-sm font-medium text-sage-500">Mirifer</span>
          </div>
          <a
            href="mailto:afz.javan@gmail.com"
            className="text-sm text-sage-400 hover:text-sage-600 transition-colors"
          >
            afz.javan@gmail.com
          </a>
          <p className="text-sm text-sage-400">
            &copy; {new Date().getFullYear()} Mirifer. Made with care for pet
            professionals.
          </p>
        </div>
      </footer>
    </div>
  );
}

function StepCard({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="w-10 h-10 rounded-full bg-sage-400 text-white flex items-center justify-center text-lg font-bold mx-auto mb-4">
        {step}
      </div>
      <h3 className="text-lg font-semibold text-sage-800 mb-2">{title}</h3>
      <p className="text-sage-500 leading-relaxed">{description}</p>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-7 shadow-sm border border-warm-gray/50 hover:shadow-md transition-shadow duration-300">
      <div className="w-12 h-12 rounded-xl bg-sage-50 flex items-center justify-center text-sage-400 mb-5">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-sage-800">{title}</h3>
      <p className="mt-2 text-sm text-sage-500 leading-relaxed">
        {description}
      </p>
    </div>
  );
}
