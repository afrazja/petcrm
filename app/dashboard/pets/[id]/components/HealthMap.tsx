"use client";

import { useState, useRef, useCallback, useTransition, useEffect } from "react";
import type { HealthMapMarker } from "@/lib/types/database";
import { saveHealthMapMarker, deleteHealthMapMarker, uploadPetPhoto } from "@/app/dashboard/actions";
import { CameraIcon, CheckCircleIcon, XIcon } from "@/components/icons";
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
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Auto-dismiss save status after 2 seconds
  useEffect(() => {
    if (!saveStatus) return;
    const timer = setTimeout(() => setSaveStatus(null), 2000);
    return () => clearTimeout(timer);
  }, [saveStatus]);

  // Listen for custom event from gallery "Use on Map" button (mobile fallback)
  useEffect(() => {
    function handleSetBg(e: Event) {
      const url = (e as CustomEvent).detail?.url;
      if (url) setBackgroundUrl(url);
    }
    window.addEventListener("healthmap:setbg", handleSetBg);
    return () => window.removeEventListener("healthmap:setbg", handleSetBg);
  }, []);

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
      const canvas = document.createElement("canvas");
      canvas.width = SVG_WIDTH * 2;
      canvas.height = SVG_HEIGHT * 2;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported");

      // Step 1: Draw background (photo or white)
      if (backgroundUrl) {
        // Load the background photo onto canvas first
        const bgImg = new window.Image();
        bgImg.crossOrigin = "anonymous";
        await new Promise<void>((resolve, reject) => {
          bgImg.onload = () => resolve();
          bgImg.onerror = () => reject(new Error("Failed to load background"));
          bgImg.src = backgroundUrl;
        });
        // Cover-fit the image into the canvas
        const scale = Math.max(canvas.width / bgImg.width, canvas.height / bgImg.height);
        const w = bgImg.width * scale;
        const h = bgImg.height * scale;
        ctx.drawImage(bgImg, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
      } else {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Step 2: Clone SVG for markers overlay (remove background elements)
      const clone = svg.cloneNode(true) as SVGSVGElement;
      clone.setAttribute("width", String(SVG_WIDTH * 2));
      clone.setAttribute("height", String(SVG_HEIGHT * 2));
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

      // Remove the background from the SVG clone (photo <image> or <DogSvg> <g>)
      // If photo bg: remove the <image> element
      clone.querySelectorAll("image").forEach((el) => el.remove());
      // If dog bg: remove the first <g> (DogSvg) — but only when we already drew white bg
      if (!backgroundUrl) {
        // Keep the dog outline in SVG for non-photo mode
        clone.querySelectorAll("[stroke='currentColor']").forEach((el) => {
          el.setAttribute("stroke", "#b0bfab");
        });
        clone.querySelectorAll("[fill='currentColor']").forEach((el) => {
          el.setAttribute("fill", "#b0bfab");
        });
      } else {
        // Remove the dog SVG group entirely since we have a photo
        const firstG = clone.querySelector("g");
        if (firstG && !firstG.hasAttribute("data-marker")) {
          firstG.remove();
        }
      }

      // Resolve Tailwind CSS classes to inline styles for text elements
      clone.querySelectorAll("text").forEach((textEl) => {
        textEl.setAttribute("fill", backgroundUrl ? "#ffffff" : "#4a5e45");
        textEl.setAttribute("font-size", "10");
        textEl.setAttribute("font-weight", "500");
        textEl.setAttribute("font-family", "system-ui, sans-serif");
        textEl.removeAttribute("class");
      });

      // Remove CSS class attributes
      clone.querySelectorAll("[class]").forEach((el) => {
        el.removeAttribute("class");
      });

      // Add transparent background rect so the SVG renders properly
      const bgRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      bgRect.setAttribute("width", "100%");
      bgRect.setAttribute("height", "100%");
      bgRect.setAttribute("fill", backgroundUrl ? "transparent" : "white");
      clone.insertBefore(bgRect, clone.firstChild);

      // Serialize SVG overlay to image
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(clone);
      const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const svgUrl = URL.createObjectURL(svgBlob);

      const overlayImg = new window.Image();
      await new Promise<void>((resolve, reject) => {
        overlayImg.onload = () => resolve();
        overlayImg.onerror = () => reject(new Error("Failed to load SVG overlay"));
        overlayImg.src = svgUrl;
      });

      // Draw SVG markers overlay on top of background
      ctx.drawImage(overlayImg, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(svgUrl);

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
  }, [markers, petId, backgroundUrl]);

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
              {backgroundUrl
                ? "Tap to place markers on the photo"
                : "Tap on the dog to place a marker"}
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

        <div
          className={`relative rounded-xl border-2 overflow-hidden transition-colors ${
            isDragOver
              ? "border-dashed border-sage-400 bg-sage-100/50"
              : "border-solid border-sage-100 bg-sage-50/50"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={(e) => {
            // Only leave if we're actually leaving the container
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setIsDragOver(false);
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            const url = e.dataTransfer.getData("text/plain");
            if (url && url.startsWith("http")) {
              setBackgroundUrl(url);
            }
          }}
        >
          {/* Drop overlay */}
          {isDragOver && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-sage-100/70 pointer-events-none">
              <p className="text-sm font-medium text-sage-600">Drop photo here</p>
            </div>
          )}

          {/* Clear background button */}
          {backgroundUrl && !isDragOver && (
            <button
              onClick={() => setBackgroundUrl(null)}
              className="absolute top-2 right-2 z-20 p-1.5 rounded-lg bg-black/50 text-white/80 hover:bg-black/70 hover:text-white transition-all cursor-pointer"
              aria-label="Remove photo background"
              title="Back to dog outline"
            >
              <XIcon className="w-4 h-4" />
            </button>
          )}

          <svg
            ref={svgRef}
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            className="w-full h-auto cursor-crosshair text-sage-300 touch-none"
            onClick={handleSvgClick}
            onTouchEnd={handleSvgTouch}
          >
            {/* Background: photo or dog outline */}
            {backgroundUrl ? (
              <image
                href={backgroundUrl}
                x="0"
                y="0"
                width={SVG_WIDTH}
                height={SVG_HEIGHT}
                preserveAspectRatio="xMidYMid slice"
              />
            ) : (
              <DogSvg />
            )}

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
