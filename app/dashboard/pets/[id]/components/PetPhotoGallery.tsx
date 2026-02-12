"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { CameraIcon, PlusIcon, XIcon, TrashIcon, CheckCircleIcon } from "@/components/icons";
import { uploadPetPhoto, deletePetPhoto } from "@/app/dashboard/actions";

type Photo = {
  id: string;
  url: string;
  createdAt: string;
};

type UploadNotification = {
  id: string;
  fileName: string;
  status: "uploading" | "success" | "failed";
  error?: string;
};

type Props = {
  petId: string;
  initialPhotos: Photo[];
};

export default function PetPhotoGallery({ petId, initialPhotos }: Props) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [notifications, setNotifications] = useState<UploadNotification[]>([]);
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isUploading = notifications.some((n) => n.status === "uploading");

  // Auto-dismiss successful notifications after 3 seconds
  useEffect(() => {
    const successIds = notifications
      .filter((n) => n.status === "success")
      .map((n) => n.id);

    if (successIds.length === 0) return;

    const timer = setTimeout(() => {
      setNotifications((prev) =>
        prev.filter((n) => !successIds.includes(n.id))
      );
    }, 3000);

    return () => clearTimeout(timer);
  }, [notifications]);

  // Close lightbox on Escape
  useEffect(() => {
    if (!lightboxPhoto) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxPhoto(null);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [lightboxPhoto]);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      const notifId = crypto.randomUUID();
      const fileName = file.name.length > 25
        ? file.name.slice(0, 22) + "..."
        : file.name;

      // Add uploading notification
      setNotifications((prev) => [
        ...prev,
        { id: notifId, fileName, status: "uploading" },
      ]);

      const formData = new FormData();
      formData.set("file", file);

      const result = await uploadPetPhoto(petId, formData);

      if (result.success && result.photo) {
        setPhotos((prev) => [result.photo!, ...prev]);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notifId ? { ...n, status: "success" as const } : n
          )
        );
      } else {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notifId
              ? { ...n, status: "failed" as const, error: result.error ?? "Upload failed." }
              : n
          )
        );
      }
    }

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
      setNotifications((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          fileName: "Photo",
          status: "failed",
          error: result.error ?? "Delete failed.",
        },
      ]);
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
          disabled={isUploading}
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

      {/* Upload notifications */}
      {notifications.length > 0 && (
        <div className="space-y-2 mb-4">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                notif.status === "uploading"
                  ? "bg-sage-50 text-sage-600 border border-sage-100"
                  : notif.status === "success"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                  : "bg-red-50 text-red-700 border border-red-100"
              }`}
            >
              {/* Status icon */}
              {notif.status === "uploading" && (
                <div className="w-4 h-4 border-2 border-sage-300 border-t-sage-500 rounded-full animate-spin flex-shrink-0" />
              )}
              {notif.status === "success" && (
                <CheckCircleIcon className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              )}
              {notif.status === "failed" && (
                <div className="w-4 h-4 rounded-full bg-red-200 flex items-center justify-center flex-shrink-0">
                  <XIcon className="w-3 h-3 text-red-600" />
                </div>
              )}

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium">{notif.fileName}</p>
                {notif.status === "uploading" && (
                  <p className="text-xs opacity-70">Uploading...</p>
                )}
                {notif.status === "success" && (
                  <p className="text-xs opacity-70">Uploaded</p>
                )}
                {notif.status === "failed" && (
                  <p className="text-xs opacity-70">{notif.error}</p>
                )}
              </div>

              {/* Dismiss button — shown for failed and success */}
              {notif.status !== "uploading" && (
                <button
                  onClick={() => dismissNotification(notif.id)}
                  className={`p-1 rounded-md transition-colors flex-shrink-0 cursor-pointer ${
                    notif.status === "failed"
                      ? "text-red-400 hover:bg-red-100 hover:text-red-600"
                      : "text-emerald-400 hover:bg-emerald-100 hover:text-emerald-600"
                  }`}
                  aria-label="Dismiss"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
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
