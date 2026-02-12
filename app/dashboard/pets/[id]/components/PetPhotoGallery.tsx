"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { CameraIcon, PlusIcon, XIcon, TrashIcon } from "@/components/icons";
import { uploadPetPhoto, deletePetPhoto } from "@/app/dashboard/actions";

type Photo = {
  id: string;
  url: string;
  createdAt: string;
};

type Props = {
  petId: string;
  initialPhotos: Photo[];
};

export default function PetPhotoGallery({ petId, initialPhotos }: Props) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close lightbox on Escape
  useEffect(() => {
    if (!lightboxPhoto) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxPhoto(null);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [lightboxPhoto]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.set("file", file);

      const result = await uploadPetPhoto(petId, formData);
      if (result.success && result.photo) {
        setPhotos((prev) => [result.photo!, ...prev]);
      } else {
        setError(result.error ?? "Upload failed.");
      }
    }

    setUploading(false);
    // Reset file input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleDelete(photo: Photo) {
    setDeleting(true);
    const result = await deletePetPhoto(photo.id, petId);
    if (result.success) {
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
      setLightboxPhoto(null);
    } else {
      setError(result.error ?? "Delete failed.");
    }
    setDeleting(false);
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-warm-gray/50 p-6 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sage-50 flex items-center justify-center text-sage-400">
            <CameraIcon className="w-4.5 h-4.5" />
          </div>
          <h3 className="text-lg font-semibold text-sage-700">Photos</h3>
          {photos.length > 0 && (
            <span className="text-sm text-sage-400">({photos.length})</span>
          )}
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-9 h-9 rounded-lg bg-sage-400 text-white flex items-center justify-center hover:bg-sage-500 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
          aria-label="Upload photo"
        >
          <PlusIcon className="w-5 h-5" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm text-center mb-4">
          {error}
        </div>
      )}

      {/* Uploading indicator */}
      {uploading && (
        <div className="flex items-center gap-2 text-sm text-sage-500 mb-4">
          <div className="w-4 h-4 border-2 border-sage-300 border-t-sage-500 rounded-full animate-spin" />
          Uploading...
        </div>
      )}

      {/* Photo grid */}
      {photos.length === 0 ? (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-8 border-2 border-dashed border-warm-gray rounded-xl text-sage-400 hover:text-sage-500 hover:border-sage-300 transition-colors cursor-pointer"
        >
          <CameraIcon className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">No photos yet. Tap to add one.</p>
        </button>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {photos.map((photo) => (
            <button
              key={photo.id}
              onClick={() => setLightboxPhoto(photo)}
              className="relative aspect-square rounded-xl overflow-hidden bg-sage-50 hover:opacity-90 transition-opacity cursor-pointer group"
            >
              <Image
                src={photo.url}
                alt="Pet photo"
                fill
                sizes="(max-width: 640px) 33vw, 25vw"
                className="object-cover"
              />
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/40 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-[10px] text-white text-center">
                  {new Date(photo.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setLightboxPhoto(null)}
          />
          <div className="relative max-w-3xl max-h-[85vh] w-full mx-4">
            {/* Close button */}
            <button
              onClick={() => setLightboxPhoto(null)}
              className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors cursor-pointer z-10"
            >
              <XIcon className="w-6 h-6" />
            </button>

            {/* Image */}
            <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-black">
              <Image
                src={lightboxPhoto.url}
                alt="Pet photo"
                fill
                sizes="(max-width: 768px) 100vw, 768px"
                className="object-contain"
                priority
              />
            </div>

            {/* Bottom bar */}
            <div className="flex items-center justify-between mt-3">
              <p className="text-sm text-white/60">
                {new Date(lightboxPhoto.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <button
                onClick={() => handleDelete(lightboxPhoto)}
                disabled={deleting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors text-sm disabled:opacity-50 cursor-pointer"
              >
                <TrashIcon className="w-4 h-4" />
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
