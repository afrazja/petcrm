"use client";

import { useState, useRef, useCallback, useTransition } from "react";
import type { HealthMapMarker } from "@/lib/types/database";
import { saveHealthMapMarker, deleteHealthMapMarker } from "@/app/dashboard/actions";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

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
          {markers.length > 0 && (
            <span className="text-xs bg-sage-50 text-sage-600 px-2.5 py-1 rounded-full font-medium">
              {markers.length} marker{markers.length !== 1 ? "s" : ""}
            </span>
          )}
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
