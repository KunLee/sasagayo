"use client";

import { Camera, LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import Avatar from "@/components/Avatar";
import { useI18n } from "@/components/I18nProvider";

const VIEW = 224;   // on-screen crop square, px
const OUTPUT = 320; // stored size, px

type Draft = { image: HTMLImageElement; zoom: number; x: number; y: number };

/** Square crop with drag-to-position and zoom, exported in the browser as a small JPEG. */
export default function AvatarEditor({ name, url, onChange }: { name: string; url: string | null; onChange: (url: string | null) => void }) {
  const { t } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Base scale makes the image cover the square; zoom multiplies it.
  const scaleOf = (d: Draft) => (VIEW / Math.min(d.image.naturalWidth, d.image.naturalHeight)) * d.zoom;
  const clamp = (d: Draft): Draft => {
    const scale = scaleOf(d);
    const maxX = Math.max(0, (d.image.naturalWidth * scale - VIEW) / 2);
    const maxY = Math.max(0, (d.image.naturalHeight * scale - VIEW) / 2);
    return { ...d, x: Math.max(-maxX, Math.min(maxX, d.x)), y: Math.max(-maxY, Math.min(maxY, d.y)) };
  };

  function draw(d: Draft, target: HTMLCanvasElement, size: number) {
    const context = target.getContext("2d");
    if (!context) return;
    const ratio = size / VIEW;
    const scale = scaleOf(d) * ratio;
    const width = d.image.naturalWidth * scale;
    const height = d.image.naturalHeight * scale;
    context.fillStyle = "#fff";
    context.fillRect(0, 0, size, size);
    context.drawImage(d.image, (size - width) / 2 + d.x * ratio, (size - height) / 2 + d.y * ratio, width, height);
  }

  useEffect(() => {
    if (draft && canvas.current) draw(draft, canvas.current, VIEW * 2);
  });

  function pick(file: File | undefined) {
    if (!file) return;
    setError("");
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => { setDraft({ image, zoom: 1, x: 0, y: 0 }); URL.revokeObjectURL(objectUrl); };
    image.onerror = () => { setError(t.editProfile.imageError); URL.revokeObjectURL(objectUrl); };
    image.src = objectUrl;
  }

  function onPointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (!draft) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: draft.x, y: draft.y, startX: event.clientX, startY: event.clientY };
  }
  function onPointerMove(event: PointerEvent<HTMLCanvasElement>) {
    if (!draft || !drag.current) return;
    setDraft(clamp({ ...draft, x: drag.current.x + event.clientX - drag.current.startX, y: drag.current.y + event.clientY - drag.current.startY }));
  }

  async function upload() {
    if (!draft) return;
    setBusy(true);
    setError("");
    try {
      const output = document.createElement("canvas");
      output.width = OUTPUT;
      output.height = OUTPUT;
      draw(draft, output, OUTPUT);
      const blob = await new Promise<Blob | null>((resolve) => output.toBlob(resolve, "image/jpeg", 0.86));
      if (!blob) throw new Error(t.editProfile.imageError);
      const response = await fetch("/api/me/avatar", { method: "POST", headers: { "Content-Type": "image/jpeg" }, body: blob });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? t.auth.errors.generic);
      onChange(data.avatarUrl);
      setDraft(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t.auth.errors.generic);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    const response = await fetch("/api/me/avatar", { method: "DELETE" });
    setBusy(false);
    if (response.ok) onChange(null);
  }

  return (
    <div className="grid gap-3">
      <span className="text-xs font-semibold text-ink-2">{t.editProfile.picture}</span>
      {draft ? (
        <div className="grid justify-items-center gap-3">
          <canvas
            ref={canvas}
            width={VIEW * 2}
            height={VIEW * 2}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={() => { drag.current = null; }}
            className="cursor-grab touch-none rounded-full border border-line shadow-lg active:cursor-grabbing"
            style={{ width: VIEW, height: VIEW }}
            aria-label={t.editProfile.picture}
          />
          <label className="flex w-full max-w-60 items-center gap-3 text-xs text-muted">
            {t.editProfile.zoom}
            <input type="range" min={1} max={3} step={0.01} value={draft.zoom} onChange={(event) => setDraft(clamp({ ...draft, zoom: Number(event.target.value) }))} className="flex-1 accent-[var(--accent)]" />
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={() => setDraft(null)} className="h-10 rounded-full border border-line px-4 text-sm">{t.profile.cancel}</button>
            <button type="button" onClick={upload} disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-paper disabled:opacity-60">
              {busy && <LoaderCircle className="size-4 animate-spin" />}{busy ? t.editProfile.uploading : t.editProfile.usePicture}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <Avatar name={name} url={url} size={80} />
          <div className="grid gap-2">
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => input.current?.click()} className="inline-flex h-10 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold hover:border-accent hover:text-accent">
                <Camera className="size-4" />{url ? t.editProfile.changePicture : t.editProfile.choosePicture}
              </button>
              {url && <button type="button" onClick={remove} disabled={busy} className="h-10 rounded-full px-3 text-sm text-muted hover:text-accent">{t.editProfile.removePicture}</button>}
            </div>
            <span className="text-xs text-muted">{t.editProfile.pictureHint}</span>
          </div>
        </div>
      )}
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/heic" className="sr-only" tabIndex={-1} onChange={(event) => { pick(event.target.files?.[0]); event.target.value = ""; }} />
      {error && <p role="alert" className="text-sm text-accent">{error}</p>}
    </div>
  );
}
