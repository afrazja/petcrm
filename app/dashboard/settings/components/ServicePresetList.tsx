"use client";

import { useState, useTransition } from "react";
import { PencilIcon, TrashIcon, PlusIcon } from "@/components/icons";
import {
  addServicePreset,
  editServicePreset,
  deleteServicePreset,
  importDefaultPresets,
} from "@/app/dashboard/actions";
import Button from "@/components/ui/Button";

type Preset = {
  id: string;
  name: string;
  defaultPrice: number;
  defaultDuration: number;
  sortOrder: number;
};

type Props = {
  presets: Preset[];
};

export default function ServicePresetList({ presets: initialPresets }: Props) {
  const [presets, setPresets] = useState(initialPresets);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editDuration, setEditDuration] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Add form state
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newDuration, setNewDuration] = useState("60");

  function startEdit(preset: Preset) {
    setEditingId(preset.id);
    setEditName(preset.name);
    setEditPrice(preset.defaultPrice.toString());
    setEditDuration(preset.defaultDuration.toString());
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditPrice("");
    setEditDuration("");
    setError(null);
  }

  function handleAdd() {
    if (!newName.trim()) return;
    setError(null);

    const formData = new FormData();
    formData.set("name", newName.trim());
    formData.set("defaultPrice", newPrice || "0");
    formData.set("defaultDuration", newDuration || "60");

    startTransition(async () => {
      const result = await addServicePreset(formData);
      if (result.success) {
        // Optimistic: add to local list
        setPresets((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(), // temp ID, will be replaced on next server fetch
            name: newName.trim(),
            defaultPrice: parseFloat(newPrice) || 0,
            defaultDuration: parseInt(newDuration) || 60,
            sortOrder: prev.length,
          },
        ]);
        setNewName("");
        setNewPrice("");
        setNewDuration("60");
      } else {
        setError(result.error ?? "Failed to add.");
      }
    });
  }

  function handleSaveEdit(presetId: string) {
    if (!editName.trim()) return;
    setError(null);

    const formData = new FormData();
    formData.set("id", presetId);
    formData.set("name", editName.trim());
    formData.set("defaultPrice", editPrice || "0");
    formData.set("defaultDuration", editDuration || "60");

    startTransition(async () => {
      const result = await editServicePreset(formData);
      if (result.success) {
        setPresets((prev) =>
          prev.map((p) =>
            p.id === presetId
              ? { ...p, name: editName.trim(), defaultPrice: parseFloat(editPrice) || 0, defaultDuration: parseInt(editDuration) || 60 }
              : p
          )
        );
        cancelEdit();
      } else {
        setError(result.error ?? "Failed to update.");
      }
    });
  }

  function handleDeleteConfirm(presetId: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteServicePreset(presetId);
      if (result.success) {
        setPresets((prev) => prev.filter((p) => p.id !== presetId));
        setConfirmDeleteId(null);
      } else {
        setError(result.error ?? "Failed to delete.");
        setConfirmDeleteId(null);
      }
    });
  }

  function handleImportDefaults() {
    setError(null);
    startTransition(async () => {
      const result = await importDefaultPresets();
      if (result.success) {
        // Reload will happen via revalidation, but optimistically add them
        const defaults = [
          { name: "Full Groom", defaultPrice: 65, defaultDuration: 60 },
          { name: "Bath & Brush", defaultPrice: 40, defaultDuration: 45 },
          { name: "Nail Trim", defaultPrice: 15, defaultDuration: 15 },
          { name: "De-shedding", defaultPrice: 50, defaultDuration: 45 },
          { name: "Puppy Cut", defaultPrice: 45, defaultDuration: 45 },
          { name: "Teeth Cleaning", defaultPrice: 25, defaultDuration: 20 },
        ];
        setPresets(
          defaults.map((d, i) => ({
            id: crypto.randomUUID(),
            name: d.name,
            defaultPrice: d.defaultPrice,
            defaultDuration: d.defaultDuration,
            sortOrder: i,
          }))
        );
      } else {
        setError(result.error ?? "Failed to import.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Service Presets Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-warm-gray/50 p-6">
        <h2 className="text-lg font-semibold text-sage-800 mb-1">Service Presets</h2>
        <p className="text-sm text-sage-500 mb-5">
          Define your services with default prices. These appear when logging visits or creating appointments.
        </p>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm text-center mb-4">
            {error}
          </div>
        )}

        {/* Quick Setup — show when no presets exist */}
        {presets.length === 0 && (
          <div className="mb-6 p-5 bg-sage-50/50 rounded-xl border border-sage-100 text-center">
            <p className="text-sm text-sage-600 mb-3">
              Get started with common grooming services and suggested prices.
            </p>
            <Button
              type="button"
              onClick={handleImportDefaults}
              disabled={isPending}
            >
              {isPending ? "Importing..." : "Import Default Services"}
            </Button>
          </div>
        )}

        {/* Existing presets */}
        {presets.length > 0 && (
          <div className="space-y-2 mb-5">
            {presets.map((preset) => (
              <div
                key={preset.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-sage-50/30 border border-warm-gray/30"
              >
                {editingId === preset.id ? (
                  /* Editing mode */
                  <>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm rounded-lg border border-warm-gray bg-white text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-300"
                      autoFocus
                    />
                    <div className="relative w-24">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sage-400 text-sm">$</span>
                      <input
                        type="number"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        step="0.01"
                        min="0"
                        className="w-full pl-6 pr-2 py-2 text-sm rounded-lg border border-warm-gray bg-white text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-300"
                      />
                    </div>
                    <div className="relative w-20">
                      <input
                        type="number"
                        value={editDuration}
                        onChange={(e) => setEditDuration(e.target.value)}
                        min="5"
                        step="5"
                        className="w-full pl-2 pr-8 py-2 text-sm rounded-lg border border-warm-gray bg-white text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-300"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sage-400 text-xs">min</span>
                    </div>
                    <button
                      onClick={() => handleSaveEdit(preset.id)}
                      disabled={isPending}
                      className="px-3 py-2 text-xs font-medium bg-sage-400 text-white rounded-xl hover:bg-sage-500 transition-colors disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-3 py-2 text-xs font-medium text-sage-500 hover:text-sage-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  /* Display mode */
                  <>
                    {confirmDeleteId === preset.id ? (
                      /* Delete confirmation */
                      <>
                        <span className="flex-1 text-sm text-red-600 font-medium">
                          Delete &ldquo;{preset.name}&rdquo;?
                        </span>
                        <button
                          onClick={() => handleDeleteConfirm(preset.id)}
                          disabled={isPending}
                          className="px-3 py-1.5 text-xs font-medium bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50"
                        >
                          {isPending ? "Deleting..." : "Delete"}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-3 py-1.5 text-xs font-medium text-sage-500 hover:text-sage-700 transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm font-medium text-sage-700">
                          {preset.name}
                        </span>
                        <span className="text-sm text-sage-500 font-medium">
                          ${preset.defaultPrice.toFixed(2)}
                        </span>
                        <span className="text-xs text-sage-400 font-medium">
                          {preset.defaultDuration}min
                        </span>
                        <button
                          onClick={() => startEdit(preset)}
                          className="p-1.5 text-sage-400 hover:text-sage-600 transition-colors rounded-lg hover:bg-white"
                          aria-label="Edit"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(preset.id)}
                          disabled={isPending}
                          className="p-1.5 text-sage-400 hover:text-red-500 transition-colors rounded-lg hover:bg-white disabled:opacity-50"
                          aria-label="Delete"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add new preset form */}
        <div className="flex items-center gap-2 pt-4 border-t border-warm-gray/30">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Service name..."
            className="flex-1 px-3 py-2.5 text-sm rounded-lg border border-warm-gray bg-soft-white text-sage-800 placeholder:text-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-300"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
            }}
          />
          <div className="relative w-24">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sage-400 text-sm">$</span>
            <input
              type="number"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              className="w-full pl-6 pr-2 py-2.5 text-sm rounded-lg border border-warm-gray bg-soft-white text-sage-800 placeholder:text-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-300"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAdd();
                }
              }}
            />
          </div>
          <div className="relative w-20">
            <input
              type="number"
              value={newDuration}
              onChange={(e) => setNewDuration(e.target.value)}
              placeholder="60"
              min="5"
              step="5"
              className="w-full pl-2 pr-8 py-2.5 text-sm rounded-lg border border-warm-gray bg-soft-white text-sage-800 placeholder:text-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-300"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAdd();
                }
              }}
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sage-400 text-xs">min</span>
          </div>
          <button
            onClick={handleAdd}
            disabled={isPending || !newName.trim()}
            className="w-10 h-10 flex-shrink-0 rounded-xl bg-sage-400 text-white flex items-center justify-center hover:bg-sage-500 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <PlusIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
