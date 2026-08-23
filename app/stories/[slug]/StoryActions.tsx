"use client";
import { FormEvent, useState } from "react";
import { Bookmark, Heart, MessageCircle, Send } from "lucide-react";

export default function StoryActions({
  storyId,
  initialReactions,
  initialComments,
}: {
  storyId?: string;
  initialReactions: number;
  initialComments: number;
}) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [comments, setComments] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  async function toggle(action: "react" | "bookmark", enabled: boolean) {
    if (!storyId) return true;
    const result = await fetch("/api/community", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, storyId, enabled }) });
    if (result.status === 401) { setNotice("Sign in to save and respond to community stories."); return false; }
    if (!result.ok) { setNotice("That action could not be saved just now."); return false; }
    return true;
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = String(form.get("comment") ?? "").trim();
    if (!value) return;
    if (storyId) {
      const result = await fetch("/api/community", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "comment", storyId, comment: value }) });
      if (result.status === 401) return setNotice("Sign in to join this conversation.");
      if (!result.ok) return setNotice("Your comment could not be posted just now.");
    }
    setComments((current) => [...current, value]);
    event.currentTarget.reset();
    setNotice("Your thought has been added to this conversation.");
  }
  return (
    <section className="mt-12 border-t border-stone-900/10 pt-8">
      <div className="flex gap-3">
        <button
          onClick={async () => { const next=!liked; if(await toggle("react",next)) setLiked(next); }}
          className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-xs font-semibold ${liked ? "bg-[#a74735] text-white" : "bg-white"}`}
        >
          <Heart className={`size-4 ${liked ? "fill-current" : ""}`} />
          {initialReactions + (liked ? 1 : 0)}
        </button>
        <button
          onClick={async () => { const next=!saved; if(await toggle("bookmark",next)) setSaved(next); }}
          className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-xs font-semibold ${saved ? "bg-[#2b2025] text-white" : "bg-white"}`}
        >
          <Bookmark className={`size-4 ${saved ? "fill-current" : ""}`} />
          {saved ? "Saved" : "Save"}
        </button>
        <span className="ml-auto inline-flex items-center gap-2 text-xs text-stone-400">
          <MessageCircle className="size-4" />
          {initialComments + comments.length}
        </span>
      </div>
      <h2 className="mt-10 font-serif text-3xl">Continue the conversation.</h2>
      <form onSubmit={submit} className="mt-5 flex gap-3">
        <input
          name="comment"
          maxLength={1200}
          className="h-12 flex-1 rounded-full border border-stone-900/10 bg-white/55 px-5 text-sm outline-none focus:border-[#a74735]"
          placeholder="What did this bring back for you?"
        />
        <button
          className="grid size-12 place-items-center rounded-full bg-[#a74735] text-white"
          aria-label="Post comment"
        >
          <Send className="size-4" />
        </button>
      </form>
      {notice && (
        <p role="status" className="mt-3 text-xs text-emerald-700">
          {notice}
        </p>
      )}
      {comments.map((comment, index) => (
        <div
          key={`${comment}-${index}`}
          className="mt-4 rounded-2xl bg-white/55 p-4 text-sm leading-6 text-stone-600"
        >
          {comment}
        </div>
      ))}
    </section>
  );
}
