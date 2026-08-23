"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import {
  Download,
  FileAudio2,
  ImageIcon,
  LoaderCircle,
  Lock,
  Music2,
  Trash2,
  UploadCloud,
} from "lucide-react";

type Asset = {
  id: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  visibility: "private" | "public";
  status: "pending" | "ready";
  created_at: string;
};

function sizeLabel(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function StudioClient() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");

  async function loadAssets() {
    const response = await fetch("/api/media", { cache: "no-store" });
    if (response.status === 401) setUnauthorized(true);
    else if (response.ok) setAssets((await response.json()).assets);
    else setMessage("Your media library could not be loaded.");
    setLoading(false);
  }

  useEffect(() => {
    fetch("/api/auth", { cache: "no-store" })
      .then(async (response) => {
        const session = response.ok ? await response.json() : { user: null };
        if (!session.user) {
          setUnauthorized(true);
          return;
        }
        const mediaResponse = await fetch("/api/media", { cache: "no-store" });
        if (mediaResponse.ok) setAssets((await mediaResponse.json()).assets);
        else setMessage("Your media library could not be loaded.");
      })
      .finally(() => setLoading(false));
  }, []);

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    setProgress(10);
    setMessage("");
    try {
      const createResponse = await fetch("/api/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-upload",
          fileName: file.name,
          contentType: file.type,
          size: file.size,
        }),
      });
      const created = await createResponse.json();
      if (!createResponse.ok) throw new Error(created.error);
      setProgress(35);
      const uploadResponse = await fetch(created.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadResponse.ok)
        throw new Error(
          "R2 rejected the upload. Check the bucket CORS policy.",
        );
      setProgress(80);
      const completeResponse = await fetch("/api/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete-upload",
          assetId: created.assetId,
        }),
      });
      if (!completeResponse.ok)
        throw new Error((await completeResponse.json()).error);
      setProgress(100);
      await loadAssets();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
      window.setTimeout(() => setProgress(0), 800);
    }
  }

  async function download(assetId: string) {
    setMessage("");
    const response = await fetch("/api/media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create-download", assetId }),
    });
    const payload = await response.json();
    if (!response.ok) return setMessage(payload.error ?? "Download failed.");
    window.location.assign(payload.downloadUrl);
  }

  async function remove(assetId: string) {
    if (!window.confirm("Delete this file permanently?")) return;
    const response = await fetch("/api/media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", assetId }),
    });
    if (response.ok)
      setAssets((current) => current.filter((asset) => asset.id !== assetId));
    else setMessage((await response.json()).error ?? "Delete failed.");
  }

  if (loading)
    return (
      <div className="grid min-h-[70vh] place-items-center">
        <LoaderCircle className="size-6 animate-spin text-[#a74735]" />
      </div>
    );
  if (unauthorized)
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-6 text-center">
        <Lock className="size-7 text-[#a74735]" />
        <h1 className="mt-5 font-serif text-5xl">Your studio is private.</h1>
        <p className="mt-4 text-sm leading-6 text-stone-500">
          Sign in to upload music, artwork, and the pieces behind your stories.
        </p>
        <Link
          href="/account"
          className="mt-7 rounded-full bg-[#2b2025] px-6 py-3 text-xs font-semibold text-white"
        >
          Sign in to continue
        </Link>
      </div>
    );

  return (
    <div className="mx-auto min-h-[75vh] max-w-[1200px] px-6 py-12 sm:px-8 lg:py-16">
      <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
        <div>
          <p className="micro-label text-[#a74735]">
            Private creator workspace
          </p>
          <h1 className="mt-3 font-serif text-5xl tracking-[-.04em] sm:text-6xl">
            Your studio.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-stone-500">
            Upload music and artwork privately. You decide what becomes part of
            a public story.
          </p>
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex h-12 items-center justify-center gap-3 rounded-full bg-[#a74735] px-6 text-xs font-semibold text-white shadow-lg shadow-[#a74735]/15 disabled:opacity-60"
        >
          <UploadCloud className="size-4" />
          {uploading ? "Uploading…" : "Upload media"}
        </button>
        <input
          ref={inputRef}
          onChange={upload}
          className="sr-only"
          type="file"
          accept="audio/*,image/*"
        />
      </div>

      {(progress > 0 || message) && (
        <div className="mt-8 rounded-2xl border border-stone-900/8 bg-white/55 p-4">
          {progress > 0 && (
            <div>
              <div className="mb-2 flex justify-between text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                <span>Secure upload</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-stone-900/8">
                <div
                  className="h-full rounded-full bg-[#a74735] transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
          {message && (
            <p role="status" className="text-xs text-[#8d3c2d]">
              {message}
            </p>
          )}
        </div>
      )}

      <section className="mt-12">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-serif text-2xl">Media library</h2>
          <span className="text-[10px] uppercase tracking-[.14em] text-stone-400">
            {assets.length} {assets.length === 1 ? "file" : "files"}
          </span>
        </div>
        {assets.length === 0 ? (
          <button
            onClick={() => inputRef.current?.click()}
            className="grid min-h-72 w-full place-items-center rounded-[28px] border border-dashed border-stone-900/15 bg-white/30 text-center transition hover:bg-white/55"
          >
            <span>
              <span className="mx-auto grid size-14 place-items-center rounded-full bg-[#2b2025] text-white">
                <Music2 className="size-5" />
              </span>
              <strong className="mt-5 block font-serif text-2xl">
                Begin with a sound.
              </strong>
              <span className="mt-2 block text-xs text-stone-500">
                Audio and artwork up to 200 MB
              </span>
            </span>
          </button>
        ) : (
          <div className="grid gap-3">
            {assets.map((asset) => {
              const AudioOrImage = asset.mime_type.startsWith("audio/")
                ? FileAudio2
                : ImageIcon;
              return (
                <article
                  key={asset.id}
                  className="flex flex-wrap items-center gap-4 rounded-2xl border border-stone-900/8 bg-white/55 p-4 sm:flex-nowrap"
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#2b2025] text-white">
                    <AudioOrImage className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold">
                      {asset.file_name}
                    </h3>
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-stone-400">
                      {sizeLabel(asset.size_bytes)} · {asset.visibility} ·{" "}
                      {asset.status}
                    </p>
                  </div>
                  <div className="ml-auto flex gap-2">
                    <button
                      onClick={() => download(asset.id)}
                      disabled={asset.status !== "ready"}
                      className="icon-button grid disabled:opacity-30"
                      aria-label={`Download ${asset.file_name}`}
                    >
                      <Download className="size-4" />
                    </button>
                    <button
                      onClick={() => remove(asset.id)}
                      className="icon-button grid text-red-700"
                      aria-label={`Delete ${asset.file_name}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
