"use client";

type Service = {
  id: string;
  name: string;
  price: number;
  duration: number;
};

type Props = {
  services: Service[];
  selected: string | null;
  onSelect: (serviceName: string) => void;
};

export default function ServiceSelector({ services, selected, onSelect }: Props) {
  if (services.length === 0) {
    return (
      <p className="text-sm text-sage-400 italic">
        No services available. Please contact the groomer directly.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {services.map((svc) => {
        const isSelected = selected === svc.name;
        return (
          <button
            key={svc.id}
            type="button"
            onClick={() => onSelect(svc.name)}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
              isSelected
                ? "bg-sage-400 text-white border-sage-400 shadow-sm"
                : "bg-white text-sage-600 border-sage-200 hover:border-sage-300 hover:bg-sage-50"
            }`}
          >
            {svc.name}
            {svc.price > 0 && (
              <span className={`ml-1.5 ${isSelected ? "text-sage-100" : "text-sage-400"}`}>
                ${svc.price}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
