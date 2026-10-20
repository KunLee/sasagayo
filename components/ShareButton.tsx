"use client";

import { Check, Copy, Share2, X } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/components/I18nProvider";

type Props = {
  /** Site-relative path to share, e.g. `/track/…`. */
  path: string;
  title: string;
  text?: string;
  label?: string;
  className?: string;
  iconOnly?: boolean;
};

/**
 * Opens a share sheet: copy link, the device's share menu, and a QR code that
 * WeChat (which ignores the web share menu) can scan.
 */
export default function ShareButton({ path, title, text, label, className = "", iconOnly = false }: Props) {
  const { t } = useI18n();
  const dialog = useRef<HTMLDialogElement>(null);
  const [url, setUrl] = useState("");
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [inWeChat, setInWeChat] = useState(false);
  const buttonLabel = label ?? t.share.share;

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#1c1814", light: "#ffffff" } })
      .then((svg) => { if (!cancelled) setQr(svg); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [url]);

  function open() {
    setUrl(new URL(path, window.location.origin).toString());
    setCanShare(typeof navigator.share === "function");
    setInWeChat(/MicroMessenger/i.test(navigator.userAgent));
    setCopied(false);
    dialog.current?.showModal();
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt(t.share.copyPrompt, url);
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({ title, text, url });
      dialog.current?.close();
    } catch {
      // Cancelled or unsupported; the sheet stays open.
    }
  }

  return (
    <>
      <button type="button" onClick={open} aria-label={iconOnly ? `${buttonLabel}: ${title}` : undefined} title={iconOnly ? buttonLabel : undefined} className={className}>
        <Share2 className="size-4 shrink-0" aria-hidden />
        {!iconOnly && <span>{buttonLabel}</span>}
      </button>
      <dialog
        ref={dialog}
        aria-label={t.share.title}
        onClick={(event) => { if (event.target === dialog.current) dialog.current?.close(); }}
        className="m-auto w-[min(22rem,calc(100vw-2rem))] rounded-3xl border border-line bg-card p-0 text-ink shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      >
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="eyebrow">{t.share.title}</p>
              <p className="mt-2 line-clamp-2 font-serif text-xl leading-snug">{title}</p>
            </div>
            <button type="button" onClick={() => dialog.current?.close()} aria-label={t.share.close} className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-paper-2">
              <X className="size-4" />
            </button>
          </div>

          {inWeChat ? (
            <p className="mt-5 rounded-2xl bg-paper-2 px-4 py-3 text-sm leading-6">{t.share.inWeChat}</p>
          ) : (
            <figure className="mt-5 grid justify-items-center gap-2">
              {/* The SVG is generated locally from our own URL. */}
              <div className="size-44 rounded-2xl bg-white p-2 [&>svg]:size-full" aria-label={t.share.wechat} role="img" dangerouslySetInnerHTML={{ __html: qr }} />
              <figcaption className="text-center text-xs leading-5 text-muted">
                <span className="font-semibold text-ink-2">{t.share.wechat}</span><br />{t.share.wechatHint}
              </figcaption>
            </figure>
          )}

          <div className="mt-5 flex items-center gap-2 rounded-2xl border border-line bg-paper px-3 py-2">
            <span className="min-w-0 flex-1 truncate text-xs text-muted">{url.replace(/^https?:\/\//, "")}</span>
            <button type="button" onClick={copy} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-ink px-3 text-xs font-semibold text-paper hover:bg-accent hover:text-accent-ink">
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}{copied ? t.share.copied : t.share.copyLink}
            </button>
          </div>
          {canShare && (
            <button type="button" onClick={nativeShare} className="mt-3 h-11 w-full rounded-full border border-line text-sm font-semibold hover:border-accent hover:text-accent">
              {t.share.more}
            </button>
          )}
          <p className="sr-only" aria-live="polite">{copied ? t.share.copied : ""}</p>
        </div>
      </dialog>
    </>
  );
}
