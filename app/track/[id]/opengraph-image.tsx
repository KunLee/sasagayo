import { ImageResponse } from "next/og";
import { getTrack } from "@/lib/catalog";
import { formatDuration } from "@/lib/format";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "A recording on Sasagayo";

/** Link preview card for shared recordings (WhatsApp, iMessage, Slack, X…). */
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const track = await getTrack((await params).id).catch(() => null);
  const title = track?.title ?? "Open classical music";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#1d1915", color: "#f4ecdf", fontFamily: "serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 30, color: "#d2b06c", fontStyle: "italic" }}>
          Sasagayo
          <span style={{ fontSize: 18, letterSpacing: 6, color: "#a39684", fontStyle: "normal" }}>OPEN CLASSICAL</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 30, color: "#d68b8f", letterSpacing: 2 }}>{track?.composer_name ?? ""}</div>
          <div style={{ fontSize: title.length > 60 ? 58 : 76, lineHeight: 1.05, marginTop: 16, maxWidth: 1050 }}>{title.slice(0, 110)}</div>
          {track?.performer && <div style={{ fontSize: 28, color: "#a39684", marginTop: 22 }}>{track.performer.slice(0, 80)}</div>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 24, color: "#a39684" }}>
          <div style={{ width: 64, height: 64, borderRadius: 32, background: "#f4ecdf", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 0, height: 0, borderTop: "14px solid transparent", borderBottom: "14px solid transparent", borderLeft: "22px solid #1d1915", marginLeft: 6 }} />
          </div>
          {track ? `${formatDuration(track.duration_seconds)} · ${track.license_name} · free to listen and share` : "Free to listen and share"}
        </div>
      </div>
    ),
    size,
  );
}
