"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { PlusIcon, XIcon, SearchIcon, CheckCircleIcon } from "@/components/icons";
import { addPetToExistingClient } from "@/app/dashboard/actions";
import Button from "@/components/ui/Button";

type ClientOption = {
  id: string;
  fullName: string;
  phone: string | null;
};

export default function AddPetModal({ clients }: { clients: ClientOption[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Client search state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter clients by search query
  const filteredClients = clients.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.fullName.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q.replace(/\D/g, "")))
    );
  });

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showDropdown) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showDropdown]);

  function handleClose() {
    setIsOpen(false);
    setError(null);
    setSuccess(false);
    setSelectedClient(null);
    setSearchQuery("");
    setShowDropdown(false);
  }

  function handleOpen() {
    setIsOpen(true);
    setError(null);
    setSuccess(false);
    setSelectedClient(null);
    setSearchQuery("");
  }

  function selectClient(client: ClientOption) {
    setSelectedClient(client);
    setSearchQuery(client.fullName);
    setShowDropdown(false);
  }

  function formatPhone(phone: string | null): string {
    if (!phone) return "";
    if (phone.length === 10) {
      return `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`;
    }
    return phone;
  }

  function handleSubmit(formData: FormData) {
    if (!selectedClient) {
      setError("Please select a client from the list.");
      return;
    }
    formData.set("clientId", selectedClient.id);

    startTransition(async () => {
      const result = await addPetToExistingClient(formData);
      if (result.success) {
        setError(null);
        setSuccess(true);
        setTimeout(() => handleClose(), 1200);
      } else {
        setError(result.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <>
      {/* Add Pet Button */}
      <button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 z-40 px-6 py-3.5 rounded-2xl bg-sage-400 text-white shadow-lg hover:bg-sage-500 hover:shadow-xl active:scale-95 transition-all duration-200 flex items-center gap-2 cursor-pointer font-medium text-base"
      >
        <PlusIcon className="w-5 h-5" />
        Add Pet
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-sage-900/20 backdrop-blur-sm animate-fade-in"
            onClick={handleClose}
          />

          {/* Panel */}
          <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-6 sm:p-8 shadow-xl animate-slide-up max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-sage-800">Add Pet</h2>
              <button
                onClick={handleClose}
                className="p-2 -mr-2 rounded-lg text-sage-400 hover:bg-sage-50 transition-colors cursor-pointer"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {success ? (
              <div className="text-center py-8">
                <CheckCircleIcon className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <p className="text-base font-medium text-sage-700">Pet added!</p>
              </div>
            ) : (
              <form action={handleSubmit} className="space-y-4">
                {/* Client Search/Select */}
                <div ref={dropdownRef}>
                  <label className="block text-sm font-medium text-sage-700 mb-1.5">
                    Owner
                  </label>
                  <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sage-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setSelectedClient(null);
                        setShowDropdown(true);
                      }}
                      onFocus={() => setShowDropdown(true)}
                      placeholder="Search by name or phone..."
                      autoFocus
                      className="w-full pl-10 pr-4 py-3.5 text-base rounded-lg border border-warm-gray bg-soft-white text-sage-800 placeholder:text-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-transparent transition-colors"
                    />
                  </div>

                  {/* Selected client badge */}
                  {selectedClient && (
                    <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-sage-50 border border-sage-200">
                      <CheckCircleIcon className="w-4 h-4 text-sage-500 flex-shrink-0" />
                      <span className="text-sm font-medium text-sage-700">
                        {selectedClient.fullName}
                      </span>
                      {selectedClient.phone && (
                        <span className="text-xs text-sage-400">
                          {formatPhone(selectedClient.phone)}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedClient(null);
                          setSearchQuery("");
                        }}
                        className="ml-auto p-0.5 rounded text-sage-400 hover:text-sage-600 cursor-pointer"
                      >
                        <XIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Client dropdown */}
                  {showDropdown && !selectedClient && (
                    <div className="mt-1 max-h-48 overflow-y-auto rounded-lg border border-warm-gray bg-white shadow-lg">
                      {filteredClients.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-sage-400">
                          {searchQuery
                            ? "No clients found. Add a new client first from the Clients page."
                            : "Type to search your clients..."}
                        </div>
                      ) : (
                        filteredClients.map((client) => (
                          <button
                            key={client.id}
                            type="button"
                            onClick={() => selectClient(client)}
                            className="w-full text-left px-4 py-3 hover:bg-sage-50 transition-colors cursor-pointer border-b border-warm-gray/30 last:border-b-0"
                          >
                            <p className="text-sm font-medium text-sage-800">
                              {client.fullName}
                            </p>
                            {client.phone && (
                              <p className="text-xs text-sage-400">
                                {formatPhone(client.phone)}
                              </p>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Pet fields */}
                <div className="border-t border-warm-gray/50 pt-4 space-y-4">
                  <div>
                    <label
                      htmlFor="petName"
                      className="block text-sm font-medium text-sage-700 mb-1.5"
                    >
                      Pet Name
                    </label>
                    <input
                      id="petName"
                      name="petName"
                      type="text"
                      required
                      placeholder="e.g. Buddy"
                      className="w-full px-4 py-3.5 text-base rounded-lg border border-warm-gray bg-soft-white text-sage-800 placeholder:text-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-transparent transition-colors"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="breed"
                      className="block text-sm font-medium text-sage-700 mb-1.5"
                    >
                      Breed
                    </label>
                    <input
                      id="breed"
                      name="breed"
                      type="text"
                      placeholder="e.g. Golden Retriever"
                      className="w-full px-4 py-3.5 text-base rounded-lg border border-warm-gray bg-soft-white text-sage-800 placeholder:text-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-transparent transition-colors"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="dateOfBirth"
                      className="block text-sm font-medium text-sage-700 mb-1.5"
                    >
                      Date of Birth
                    </label>
                    <input
                      id="dateOfBirth"
                      name="dateOfBirth"
                      type="date"
                      max={new Date().toISOString().split("T")[0]}
                      className="w-full px-4 py-3.5 text-base rounded-lg border border-warm-gray bg-soft-white text-sage-800 placeholder:text-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-transparent transition-colors"
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm text-center">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  size="lg"
                  className="w-full mt-2"
                  disabled={isPending}
                >
                  {isPending ? "Saving..." : "Add Pet"}
                </Button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
