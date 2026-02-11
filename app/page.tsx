import Button from "@/components/ui/Button";
import { PawPrintIcon, ScissorsIcon, CalendarIcon, UsersIcon, ClockIcon } from "@/components/icons";

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-soft-white/80 backdrop-blur-md border-b border-warm-gray/50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PawPrintIcon className="w-7 h-7 text-sage-400" />
            <span className="text-xl font-semibold tracking-tight text-sage-700">
              PetCRM
            </span>
          </div>
          <Button href="/auth/login" size="sm">
            Get Started
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 md:pt-44 md:pb-32">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-sage-800 animate-fade-in-up">
            Grooming, simplified.
          </h1>
          <p className="mt-6 text-lg md:text-xl text-sage-500 max-w-xl mx-auto leading-relaxed animate-fade-in-up-delay">
            Your clients. Your pets. One calm place to manage it all.
            Built for solo groomers who care.
          </p>
          <div className="mt-10 animate-fade-in-up-delay-2">
            <Button href="/auth/login" size="lg">
              Get Started
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="pb-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard
              icon={<UsersIcon className="w-6 h-6" />}
              title="Client Management"
              description="Keep track of every pet parent with notes, contact info, and visit history in one place."
            />
            <FeatureCard
              icon={<PawPrintIcon className="w-6 h-6" />}
              title="Pet Profiles"
              description="Record breed details, temperament notes, grooming preferences, and special care instructions."
            />
            <FeatureCard
              icon={<CalendarIcon className="w-6 h-6" />}
              title="Smart Scheduling"
              description="Book appointments, send reminders, and keep your day running smoothly without the chaos."
            />
          </div>
        </div>
      </section>

      {/* Secondary Features */}
      <section className="pb-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FeatureCard
              icon={<ScissorsIcon className="w-6 h-6" />}
              title="Service Tracking"
              description="Log every groom with details on services performed, products used, and time spent."
            />
            <FeatureCard
              icon={<ClockIcon className="w-6 h-6" />}
              title="Quick Rebooking"
              description="One-tap rebooking for returning clients. Less admin, more grooming."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="pb-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-white rounded-3xl p-10 md:p-14 shadow-sm border border-warm-gray/50">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-sage-800">
              Ready to simplify your day?
            </h2>
            <p className="mt-4 text-sage-500">
              Join groomers who spend less time on admin and more time with pets.
            </p>
            <div className="mt-8">
              <Button href="/auth/login" size="lg">
                Get Started Free
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-warm-gray/50 py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-center">
          <p className="text-sm text-sage-400">
            &copy; {new Date().getFullYear()} PetCRM. Made with care for pet
            professionals.
          </p>
        </div>
      </footer>
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
    <div className="bg-white rounded-2xl p-8 shadow-sm border border-warm-gray/50 hover:shadow-md transition-shadow duration-300">
      <div className="w-12 h-12 rounded-xl bg-sage-50 flex items-center justify-center text-sage-400 mb-5">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-sage-800">{title}</h3>
      <p className="mt-2 text-sage-500 leading-relaxed">{description}</p>
    </div>
  );
}
