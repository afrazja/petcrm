"use client";

import { useState, useRef, useCallback, useTransition, useEffect } from "react";
import type { HealthMapMarker } from "@/lib/types/database";
import { saveHealthMapMarker, deleteHealthMapMarker, uploadPetPhoto } from "@/app/dashboard/actions";
import { CameraIcon, CheckCircleIcon } from "@/components/icons";
import DogSvg from "./DogSvg";
import MarkerPopup from "./MarkerPopup";

const SVG_WIDTH = 400;
const SVG_HEIGHT = 300;

type HealthMapProps = {
  petId: string;
  initialMarkers: HealthMapMarker[];
};

export default function HealthMap({ petId, initialMarkers }: HealthMapProps) {
  const [markers, setMarkers] = useState<HealthMapMarker[]>(initialMarkers);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [newMarkerPosition, setNewMarkerPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "error" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Auto-dismiss save status after 2 seconds
  useEffect(() => {
    if (!saveStatus) return;
    const timer = setTimeout(() => setSaveStatus(null), 2000);
    return () => clearTimeout(timer);
  }, [saveStatus]);

  // Shared logic: convert client coordinates to SVG fraction coordinates
  const placeMarkerAt = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const scaleX = SVG_WIDTH / rect.width;
    const scaleY = SVG_HEIGHT / rect.height;
    const svgX = (clientX - rect.left) * scaleX;
    const svgY = (clientY - rect.top) * scaleY;

    setNewMarkerPosition({ x: svgX / SVG_WIDTH, y: svgY / SVG_HEIGHT });
  }, []);

  // Desktop: mouse click
  const handleSvgClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const target = e.target as SVGElement;
      if (target.closest("[data-marker]")) return;
      setSelectedMarkerId(null);
      placeMarkerAt(e.clientX, e.clientY);
    },
    [placeMarkerAt]
  );

  // Mobile: touch — use onTouchEnd so it doesn't fight with scrolling
  const handleSvgTouch = useCallback(
    (e: React.TouchEvent<SVGSVGElement>) => {
      const target = e.target as SVGElement;
      if (target.closest("[data-marker]")) return;
      e.preventDefault(); // prevent double-tap zoom on the SVG
      const touch = e.changedTouches[0];
      if (!touch) return;
      setSelectedMarkerId(null);
      placeMarkerAt(touch.clientX, touch.clientY);
    },
    [placeMarkerAt]
  );

  const handleMarkerClick = useCallback(
    (e: React.MouseEvent, markerId: string) => {
      e.stopPropagation();
      setNewMarkerPosition(null);
      setSelectedMarkerId((prev) => (prev === markerId ? null : markerId));
    },
    []
  );

  // Touch version of marker tap
  const handleMarkerTouch = useCallback(
    (e: React.TouchEvent, markerId: string) => {
      e.stopPropagation();
      e.preventDefault();
      setNewMarkerPosition(null);
      setSelectedMarkerId((prev) => (prev === markerId ? null : markerId));
    },
    []
  );

  const handleSaveNewMarker = useCallback(
    (note: string) => {
      if (!newMarkerPosition) return;

      const marker: HealthMapMarker = {
        id: crypto.randomUUID(),
        x: newMarkerPosition.x,
        y: newMarkerPosition.y,
        note: note || "",
        created_at: new Date().toISOString(),
      };

      // Optimistic update
      setMarkers((prev) => [...prev, marker]);
      setNewMarkerPosition(null);

      startTransition(async () => {
        const result = await saveHealthMapMarker(petId, marker);
        if (!result.success) {
          // Rollback on failure
          setMarkers((prev) => prev.filter((m) => m.id !== marker.id));
        }
      });
    },
    [newMarkerPosition, petId]
  );

  const handleUpdateMarker = useCallback(
    (markerId: string, note: string) => {
      const existing = markers.find((m) => m.id === markerId);
      if (!existing) return;

      const updated: HealthMapMarker = { ...existing, note };

      // Optimistic update
      setMarkers((prev) =>
        prev.map((m) => (m.id === markerId ? updated : m))
      );
      setSelectedMarkerId(null);

      startTransition(async () => {
        const result = await saveHealthMapMarker(petId, updated);
        if (!result.success) {
          // Rollback
          setMarkers((prev) =>
            prev.map((m) => (m.id === markerId ? existing : m))
          );
        }
      });
    },
    [markers, petId]
  );

  const handleDeleteMarker = useCallback(
    (markerId: string) => {
      const existing = markers.find((m) => m.id === markerId);
      if (!existing) return;

      // Optimistic update
      setMarkers((prev) => prev.filter((m) => m.id !== markerId));
      setSelectedMarkerId(null);

      startTransition(async () => {
        const result = await deleteHealthMapMarker(petId, markerId);
        if (!result.success) {
          // Rollback
          setMarkers((prev) => [...prev, existing]);
        }
      });
    },
    [markers, petId]
  );

  const saveToGallery = useCallback(async () => {
    const svg = svgRef.current;
    if (!svg || markers.length === 0) return;

    setIsSaving(true);
    setSaveStatus(null);

    try {
      // Clone SVG so we can modify it without affecting the DOM
      const clone = svg.cloneNode(true) as SVGSVGElement;

      // Set explicit dimensions and a white background
      clone.setAttribute("width", String(SVG_WIDTH * 2));
      clone.setAttribute("height", String(SVG_HEIGHT * 2));
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

      // Add white background rect as the first child
      const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      bg.setAttribute("width", "100%");
      bg.setAttribute("height", "100%");
      bg.setAttribute("fill", "white");
      clone.insertBefore(bg, clone.firstChild);

      // Replace currentColor with the actual sage color used in the SVG
      clone.querySelectorAll("[stroke='currentColor']").forEach((el) => {
        el.setAttribute("stroke", "#b0bfab");
      });
      clone.querySelectorAll("[fill='currentColor']").forEach((el) => {
        el.setAttribute("fill", "#b0bfab");
      });

      // Resolve Tailwind CSS classes to inline styles for text elements
      clone.querySelectorAll("text").forEach((textEl) => {
        textEl.setAttribute("fill", "#4a5e45");
        textEl.setAttribute("font-size", "10");
        textEl.setAttribute("font-weight", "500");
        textEl.setAttribute("font-family", "system-ui, sans-serif");
        textEl.removeAttribute("class");
      });

      // Remove CSS class attributes that won't render outside the page
      clone.querySelectorAll("[class]").forEach((el) => {
        el.removeAttribute("class");
      });

      // Serialize to XML
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(clone);
      const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);

      // Draw SVG onto a canvas
      const img = new window.Image();
      img.crossOrigin = "anonymous";

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load SVG image"));
        img.src = url;
      });

      const canvas = document.createElement("canvas");
      canvas.width = SVG_WIDTH * 2;
      canvas.height = SVG_HEIGHT * 2;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported");

      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);

      // Convert canvas to blob
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );
      if (!blob) throw new Error("Failed to create image");

      // Upload via existing server action
      const file = new File([blob], `health-map-${Date.now()}.png`, { type: "image/png" });
      const formData = new FormData();
      formData.set("file", file);
      const result = await uploadPetPhoto(petId, formData);

      setSaveStatus(result.success ? "saved" : "error");
    } catch {
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  }, [markers, petId]);

  // Get pixel position for popup from fraction coordinates
  function getPixelPosition(fracX: number, fracY: number) {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    const offsetX = containerRect ? rect.left - containerRect.left : 0;
    const offsetY = containerRect ? rect.top - containerRect.top : 0;
    return {
      x: (fracX * rect.width) + offsetX,
      y: (fracY * rect.height) + offsetY,
    };
  }

  const selectedMarker = markers.find((m) => m.id === selectedMarkerId);

  return (
    <div ref={containerRef} className="relative">
      <div className="bg-white rounded-2xl shadow-sm border border-warm-gray/50 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-sage-700">Health Map</h3>
            <p className="text-sm text-sage-400">
              Tap on the dog to place a marker
            </p>
          </div>
          <div className="flex items-center gap-2">
            {markers.length > 0 && (
              <span className="text-xs bg-sage-50 text-sage-600 px-2.5 py-1 rounded-full font-medium">
                {markers.length} marker{markers.length !== 1 ? "s" : ""}
              </span>
            )}
            {markers.length > 0 && (
              <button
                onClick={saveToGallery}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-sage-400 text-white hover:bg-sage-500 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : saveStatus === "saved" ? (
                  <>
                    <CheckCircleIcon className="w-3.5 h-3.5" />
                    Saved!
                  </>
                ) : (
                  <>
                    <CameraIcon className="w-3.5 h-3.5" />
                    Save to Gallery
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        <div className="relative bg-sage-50/50 rounded-xl border border-sage-100 overflow-hidden">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            className="w-full h-auto cursor-crosshair text-sage-300 touch-none"
            onClick={handleSvgClick}
            onTouchEnd={handleSvgTouch}
          >
            {/* Dog outline */}
            <DogSvg />

            {/* Rendered markers */}
            {markers.map((marker) => (
              <g
                key={marker.id}
                data-marker
                onClick={(e) => handleMarkerClick(e, marker.id)}
                onTouchEnd={(e) => handleMarkerTouch(e, marker.id)}
                className="cursor-pointer"
              >
                {/* Outer glow ring */}
                <circle
                  cx={marker.x * SVG_WIDTH}
                  cy={marker.y * SVG_HEIGHT}
                  r="12"
                  fill="rgba(239, 68, 68, 0.15)"
                  stroke="none"
                />
                {/* Main marker */}
                <circle
                  cx={marker.x * SVG_WIDTH}
                  cy={marker.y * SVG_HEIGHT}
                  r="8"
                  fill="#ef4444"
                  stroke="white"
                  strokeWidth="2"
                  className={
                    selectedMarkerId === marker.id ? "" : "hover:opacity-80"
                  }
                />
                {/* Selected ring */}
                {selectedMarkerId === marker.id && (
                  <circle
                    cx={marker.x * SVG_WIDTH}
                    cy={marker.y * SVG_HEIGHT}
                    r="14"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="2"
                    strokeDasharray="4 2"
                  />
                )}
                {/* Note label */}
                {marker.note && selectedMarkerId !== marker.id && (
                  <text
                    x={marker.x * SVG_WIDTH}
                    y={marker.y * SVG_HEIGHT - 14}
                    textAnchor="middle"
                    className="text-[10px] fill-sage-700 font-medium pointer-events-none"
                  >
                    {marker.note.length > 12
                      ? marker.note.slice(0, 12) + "..."
                      : marker.note}
                  </text>
                )}
              </g>
            ))}

            {/* New marker preview (pulsing) */}
            {newMarkerPosition && (
              <circle
                cx={newMarkerPosition.x * SVG_WIDTH}
                cy={newMarkerPosition.y * SVG_HEIGHT}
                r="8"
                fill="#ef4444"
                stroke="white"
                strokeWidth="2"
                className="animate-marker-pulse"
              />
            )}
          </svg>
        </div>

        {/* Pending indicator */}
        {isPending && (
          <div className="mt-2 text-xs text-sage-400 text-center">
            Saving...
          </div>
        )}
        {saveStatus === "error" && (
          <div className="mt-2 text-xs text-red-500 text-center">
            Failed to save to gallery. Try again.
          </div>
        )}
      </div>

      {/* Popup for new marker */}
      {newMarkerPosition && (
        <MarkerPopup
          note=""
          isNew={true}
          position={getPixelPosition(
            newMarkerPosition.x,
            newMarkerPosition.y
          )}
          containerRect={containerRef.current?.getBoundingClientRect() ?? null}
          onSave={handleSaveNewMarker}
          onDelete={() => setNewMarkerPosition(null)}
          onClose={() => setNewMarkerPosition(null)}
        />
      )}

      {/* Popup for existing marker */}
      {selectedMarker && (
        <MarkerPopup
          note={selectedMarker.note}
          isNew={false}
          position={getPixelPosition(selectedMarker.x, selectedMarker.y)}
          containerRect={containerRef.current?.getBoundingClientRect() ?? null}
          onSave={(note) => handleUpdateMarker(selectedMarker.id, note)}
          onDelete={() => handleDeleteMarker(selectedMarker.id)}
          onClose={() => setSelectedMarkerId(null)}
        />
      )}

      {/* Marker legend */}
      {markers.length > 0 && (
        <div className="mt-4 bg-white rounded-2xl shadow-sm border border-warm-gray/50 p-4 sm:p-6">
          <h4 className="text-sm font-semibold text-sage-600 mb-3">
            Markers
          </h4>
          <div className="space-y-2">
            {markers.map((marker) => (
              <button
                key={marker.id}
                onClick={() =>
                  setSelectedMarkerId((prev) =>
                    prev === marker.id ? null : marker.id
                  )
                }
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-sage-50 transition-colors"
              >
                <span className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
                <span className="text-sm text-sage-700 truncate flex-1">
                  {marker.note || "No note"}
                </span>
                <span className="text-xs text-sage-400 flex-shrink-0">
                  {new Date(marker.created_at).toLocaleDateString()}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
