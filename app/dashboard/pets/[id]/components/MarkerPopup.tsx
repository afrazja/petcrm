"use client";

import { useState, useRef, useEffect } from "react";
import { TrashIcon } from "@/components/icons";

type MarkerPopupProps = {
  note: string;
  isNew: boolean;
  position: { x: number; y: number };
  containerRect: DOMRect | null;
  onSave: (note: string) => void;
  onDelete: () => void;
  onClose: () => void;
};

export default function MarkerPopup({
  note,
  isNew,
  position,
  containerRect,
  onSave,
  onDelete,
  onClose,
}: MarkerPopupProps) {
  const [text, setText] = useState(note);
  const inputRef = useRef<HTMLInputElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    // Delay adding listener to avoid immediate close from the click that opened it
    const timeout = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);
    return () => {
      clearTimeout(timeout);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(text.trim());
  }

  // Calculate position relative to container, keeping popup on screen
  let left = position.x;
  let top = position.y - 80;

  if (containerRect) {
    // Don't let popup overflow right
    if (left + 220 > containerRect.width) {
      left = containerRect.width - 230;
    }
    // Don't let popup overflow left
    if (left < 10) {
      left = 10;
    }
    // If it would go above container, show below marker instead
    if (top < 10) {
      top = position.y + 20;
    }
  }

  return (
    <div
      ref={popupRef}
      className="absolute z-20 animate-fade-in"
      style={{ left: `${left}px`, top: `${top}px` }}
    >
      <div className="bg-white rounded-xl shadow-lg border border-warm-gray/50 p-3 w-[220px]">
        <form onSubmit={handleSubmit}>
          <label className="block text-xs font-medium text-sage-600 mb-1.5">
            {isNew ? "Add a note" : "Edit note"}
          </label>
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder='e.g. "Matted", "Rash"'
            className="w-full px-3 py-2 text-sm border border-warm-gray rounded-lg focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-300 text-sage-800 placeholder:text-sage-300"
          />
          <div className="flex items-center gap-2 mt-2.5">
            <button
              type="submit"
              className="flex-1 px-3 py-1.5 bg-sage-400 text-white text-sm font-medium rounded-lg hover:bg-sage-500 active:scale-95 transition-all"
            >
              Save
            </button>
            {!isNew && (
              <button
                type="button"
                onClick={onDelete}
                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete marker"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
