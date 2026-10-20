import { createHash } from "node:crypto";
import { fold } from "../composers.ts";

export type WorkParts = { workTitle: string; movementNumber: number; movementTitle: string };

const ROMAN: Record<string, number> = { I: 1, V: 5, X: 10, L: 50 };
function romanToInt(value: string) {
  let total = 0;
  for (let index = 0; index < value.length; index += 1) {
    const current = ROMAN[value[index]] ?? 0;
    const next = ROMAN[value[index + 1]] ?? 0;
    total += current < next ? -current : current;
  }
  return total;
}

const CATALOGUE = /\b(op\.?|opus|bwv|k\.?|kv|hob\.?|d\.|hwv|rv|wwv|woo|s\.|no\.?|nr\.?)\s*\d|\b(symphon|sonat|concert|quartet|quintet|trio|suite|partita|mass|messe|requiem|serenade|seasons|variations)/i;
const SEPARATOR = String.raw`\s*(?:[–—:]|\s-)\s*`;

/**
 * Splits "Symphony No. 40 in G minor, K550 – IV. Finale" into the work and
 * its movement. Returns null unless the title clearly names a movement, so
 * unrelated pieces are never merged.
 */
export function parseWork(title: string): WorkParts | null {
  const text = title.replace(/\s+/g, " ").trim();
  let match: RegExpMatchArray | null;

  // "Work – IV. Finale", "Work: II. Adagio", "Don Giovanni – 21. Batti, batti"
  match = text.match(new RegExp(String.raw`^(.{3,}?)${SEPARATOR}((?:[IVXL]{1,6}|\d{1,2}))[.)]\s*(.+)$`));
  if (match && (/^[IVXL]+$/.test(match[2]) || CATALOGUE.test(match[1]) || /\b(act|akt|opera|giovanni|figaro|zauberfl|traviata|carmen|boh[eè]me|tosca)\b/i.test(fold(match[1])))) {
    const number = /^\d+$/.test(match[2]) ? Number(match[2]) : romanToInt(match[2]);
    if (number > 0 && number < 80) return clean(match[1], number, match[3]);
  }

  // "Four Seasons 2 Summer mvt 3 Presto", "Sonata no 2 1st movement", "(3rd movement)"
  match = text.match(/^(.{3,}?)[\s,(–-]+(?:mvt\.?|movement)\s*(\d{1,2})\b[\s.:,)–-]*(.*)$/i)
    ?? text.match(/^(.{3,}?)[\s,(–-]+(\d{1,2})(?:st|nd|rd|th)\s+(?:mvt|movement)\b[\s.:,)–-]*(.*)$/i);
  if (match) return clean(match[1], Number(match[2]), match[3]);

  // "Symphony No.18 in F Major K. 130 I. Allegro" — numeral without a separator, after a catalogue number.
  match = text.match(/^(.*?\d[\w.]*)\s+([IVX]{1,5})\.\s+(\p{Lu}.+)$/u);
  if (match && CATALOGUE.test(match[1])) return clean(match[1], romanToInt(match[2]), match[3]);

  return null;
}

function clean(work: string, number: number, movement: string): WorkParts | null {
  const workTitle = work.replace(/[\s,:;(–—-]+$/, "").trim();
  if (workTitle.length < 3 || !Number.isFinite(number) || number < 1) return null;
  return { workTitle, movementNumber: number, movementTitle: movement.replace(/[)\s]+$/, "").trim() };
}

/** Same composer + same work + same performer = one recording of one work. */
export function workKey(composerSlug: string, workTitle: string, performer: string | null) {
  const squash = (value: string) => fold(value).replace(/[^a-z0-9]+/g, "");
  return createHash("sha1").update(`${composerSlug}|${squash(workTitle)}|${squash(performer ?? "")}`).digest("hex").slice(0, 12);
}
