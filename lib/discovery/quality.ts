import { COMPOSERS, fold, type Composer } from "../composers.ts";

export type Source = "wikimedia_commons" | "internet_archive";
export type TrackStatus = "published" | "review" | "rejected" | "hidden";

/** What a source adapter knows about one audio file, before any judgement. */
export type RawRecording = {
  source: Source;
  sourceKey: string;
  pageUrl: string;
  originalUrl: string;
  streamUrl: string;
  mime: string;
  sizeBytes: number | null;
  durationSeconds: number;
  rawTitle: string;
  artist: string;
  credit: string;
  description: string;
  licenseName: string;
  licenseUrl: string;
  categories: string[];
  composer: Composer | null;
  /** Bonus for feeds known to carry real performances (e.g. Musopen). */
  trust: number;
};

export type TrackDraft = {
  source: Source;
  source_key: string;
  source_page_url: string;
  original_url: string;
  stream_url: string;
  title: string;
  composer_slug: string;
  composer_name: string;
  performer: string | null;
  description: string;
  duration_seconds: number;
  size_bytes: number | null;
  mime_type: string;
  license_name: string;
  license_url: string;
  attribution: string;
  quality_score: number;
  quality_notes: string[];
  dedupe_key: string;
  status: TrackStatus;
  search_text: string;
};

export const PUBLISH_AT = 60;
export const REVIEW_AT = 40;

const PLAYABLE = /^(audio\/(ogg|mpeg|mp3|flac|x-flac|wav|x-wav|wave|webm|mp4|opus)|application\/ogg|video\/webm)$/;

const HARD_REJECT: [RegExp, string][] = [
  [/\b(inleiding|interview|lecture|spoken|podcast|speech|pronunciation|audio description|narrat(ed|ion)|reading of|introduction to)\b/, "spoken word"],
  [/\b(midi|synthesi[sz]ed|synth version|musescore|sibelius|noteworthy|computer[- ]generated|soundfont|vocaloid|chiptune|8-?bit|al goldstein|pandora music|piano ?roll|sequenced)\b/, "synthesised rendering"],
  [/\b(mm\.?\s?\d|measures?\s\d|bars?\s\d|final bars|motif|motto|ringtone|sound ?sample|test ?(tone|file)|scale example|example \d|beispiel|music example)\b/, "excerpt or teaching example"],
  [/\b(remix|dark mix|breakdown|dubstep|lo-?fi|trap beat|metal cover|ambient mix)\b/, "remix"],
  [/isrc usuan|kevin macleod|incompetech/, "library arrangement"],
  [/\b\d+ ?khz\b|cpt-sound|derivative work/, "degraded derivative copy"],
  [/\b(1st|2nd) violin [a-z] \d|\bclick track\b|\bstem\b|\bpremix\b|\b\d\d\.(l|r)\b/, "multitrack stem"],
];

const MUSICAL_FORM = /\b(op\.?|opus|bwv|k\.|kv|hob|d\.|hwv|rv|wwv|b\.|no\.|nr\.|act|mass|messe|aria|suite|trio|lied|lieder|air|song|dance|danse|tanz|rondo|gigue|polka|tango|hymn|psalm|motet|opera|oratorio|requiem|gloria|kyrie|credo|sanctus|te deum|ave maria|stabat mater|magnificat|vespers|allegro|andante|adagio|largo|presto|lento|vivace|moderato|grave)\b|\b(symphon|sinfoni|sonat|concert|prelud|pr\u00e9lud|fugu|etude|\u00e9tude|mazurk|polonais|waltz|valse|walzer|ballad|scherz|impromptu|rhapsod|overtur|ouvertur|quartet|quartett|quintet|variation|serenad|march|marsch|minuet|menuet|gymnop|arabesque|barcarol|fantasi|toccata|partita|cantata|kantate|chorale|choral|madrigal|movement|album|feuille|pi[e\u00e8]ce|st\u00fcck|stuck|romanc|eleg|berceuse|lullab|capric|intermezz|humoresk|humoresque|bagatell|chaconn|pavan|sarabande|bourr|gavott|tone poem|lament|habanera|r[e\u00ea]verie|consolation|liebestr|nocturn|invention|canon|passacag|divertiment|concertino|ricercar|sinfonia|duet|duo|allegr|andant|adagi|prest|largh|lent|vivac|moderat|grav|maestos|cantabil|sostenut|tempo|menuett|zauberfl|figaro|giovanni|traviata|carmen|tosca|boh[e\u00e8]me|nutcracker|swan lake|four seasons|seasons)/;
const ENSEMBLE = /\b(orchestra|orchester|orchestre|orkest|symphony|sinfonie|philharmoni|quartet|quartett|quatuor|ensemble|choir|chorus|chor|trio|band|consort|camerata|sinfonietta|musopen)\b/;
const TRUSTED_CATEGORY = /^Category:(Musopen|European Archive|Featured sounds|Quality sounds|Sounds of the United States Marine Band|United States Marine Band|Audio files from the White House|hr-Sinfonieorchester)/i;
const JUNK_PERSON = /https?:|www\.|youtube|flickr|unknown|email|collection|repository|ibiblio|garageband|recording|archive|composer:|^\[\d+\]$|no machine-readable|fotograf|zeichner|uploaded|user:|own work|original uploader|see below|created by|anonymous|wikimedia|wikipedia/i;

function clean(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeLicense(label: string, url = ""): { name: string; url: string; ok: boolean; review: boolean } {
  const text = `${label} ${url}`.toLowerCase();
  if (/\b(nc|noncommercial|non-commercial|nd|noderiv)\b|-nc|-nd/.test(text)) return { name: clean(label) || "Restricted", url, ok: false, review: false };
  if (/publicdomain\/zero|\bcc0\b|cc-zero/.test(text)) return { name: "CC0", url: url || "https://creativecommons.org/publicdomain/zero/1.0/", ok: true, review: false };
  if (/public.?domain|\bpd\b|publicdomain\/mark|pd-/.test(text)) return { name: "Public domain", url, ok: true, review: false };
  const cc = text.match(/\bcc[ -]by(-sa)?[ -]?(\d\.\d)?/) ?? text.match(/licenses\/by(-sa)?\/(\d\.\d)/);
  if (cc) {
    const version = cc[2] ?? "";
    return {
      name: `CC BY${cc[1] ? "-SA" : ""}${version ? ` ${version}` : ""}`,
      url: url || `https://creativecommons.org/licenses/by${cc[1] ?? ""}/${version || "4.0"}/`,
      ok: true,
      review: false,
    };
  }
  if (/gfdl|free art|fal\b/.test(text)) return { name: clean(label), url, ok: true, review: true };
  return { name: clean(label) || "Unknown", url, ok: false, review: true };
}

function stripComposerPrefix(title: string, composer: Composer | null) {
  if (!composer) return title;
  const names = [composer.name, composer.short, ...(composer.aliases ?? [])]
    .filter((name) => name.length > 3)
    .sort((a, b) => b.length - a.length);
  let result = title;
  for (const name of names) {
    const pattern = new RegExp(`^(${escapeRegExp(name)}|${escapeRegExp(fold(name))})\\s*[-–—:,]\\s*`, "i");
    if (pattern.test(result) || pattern.test(fold(result))) {
      const length = result.length - fold(result).replace(pattern, "").length;
      const stripped = result.slice(length).trim();
      if (stripped.length > 2) result = stripped;
      break;
    }
  }
  return result;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanPerson(value: string, composer: Composer | null): string | null {
  let text = clean(value).replace(/\s*\(talk\)|\s*\(\s*\)/gi, "").trim();
  if (!text || JUNK_PERSON.test(text) || text.length > 140 || /^[IVX]+\.\s/.test(text) || MUSICAL_FORM.test(fold(text))) return null;
  // "Frédéric Chopin / Luke Faulkner": keep the half that is not the composer.
  const parts = text.split(/\s*[/;]\s*/).filter(Boolean);
  if (composer) {
    const composerNames = [composer.name, composer.short, ...(composer.aliases ?? [])].map(fold);
    const others = parts.filter((part) => !composerNames.some((name) => fold(part).includes(name) || name.includes(fold(part))));
    if (!others.length) return null;
    text = others.join(", ");
  }
  text = text.replace(/^(performed by|performer:|played by|recording:|interpret:)\s*/i, "").trim();
  return text.length >= 3 ? text : null;
}

/** Splits a raw file title into a clean work title and (if present) a performer. */
export function parseTitle(raw: string, composer: Composer | null) {
  let title = clean(raw)
    .replace(/^File:/i, "")
    .replace(/%\s?2C/gi, ",").replace(/%\s?27/g, "'")
    .replace(/\.(ogg|oga|mp3|flac|wav|webm|opus|m4a|mid|midi)$/i, "")
    .replace(/_/g, " ")
    .replace(/^IMSLP\d+-PMLP\d+-/i, "")
    .replace(/\(ISRC [^)]+\)/gi, "")
    .replace(/\((audio|version \d+|compressed|\d)\)/gi, "")
    .replace(/\b(european archive|musopen)\b/gi, "")
    .replace(/^\d{6,8}\s*[-–]?\s*/, "")
    .replace(/^\d{1,2}[\s.)-]+(?=[A-Za-z])/, "")
    .replace(/\s+/g, " ")
    .trim();
  let performer: string | null = null;

  const performedBy = title.match(/[,\-–]?\s*\(?(?:piano )?(?:performed|played|performance) by ([^)]+)\)?$/i);
  if (performedBy) {
    performer = performedBy[1].trim();
    title = title.slice(0, performedBy.index).trim();
  }
  const onInstrument = !performer && title.match(/\s*[-–,]?\s*([\p{Lu}][\p{L}.' ]{2,60}?) (?:on|at the) (?:piano|violin|cello|organ|guitar|harpsichord)$/u);
  if (onInstrument) {
    performer = onInstrument[1].trim();
    title = title.slice(0, onInstrument.index).trim();
  }
  const trailing = title.match(/\s*\(([^()]{3,80})\)$/);
  if (!performer && trailing && !MUSICAL_FORM.test(fold(trailing[1])) && !/^\d{4}$/.test(trailing[1].trim())) {
    performer = trailing[1].replace(/,\s*\d{4}$/, "").trim();
    title = title.slice(0, trailing.index).trim();
  }
  title = stripComposerPrefix(title, composer);
  // "Nocturne op. 27 n.2 - Patrizia Prati": a trailing segment with no musical words is a name.
  if (!performer) {
    const segments = title.split(/\s+[-–—]\s+/);
    const last = segments.at(-1) ?? "";
    if (segments.length > 1 && /^[\p{Lu}][\p{L}.'-]+( [\p{Lu}][\p{L}.'-]+){1,3}$/u.test(last) && !MUSICAL_FORM.test(fold(last))) {
      performer = last;
      title = segments.slice(0, -1).join(" – ");
    }
  }
  // Split CamelCase file names ("NocturneOp.9No.1InBFlatMinor").
  if (!title.includes(" ") && /[a-z][A-Z]/.test(title)) {
    title = title.replace(/([a-z.])([A-Z0-9])/g, "$1 $2").replace(/(\d)([A-Z])/g, "$1 $2").replace(/([A-Z])([A-Z][a-z])/g, "$1 $2");
  } else if (!title.includes(" ") && title.includes("-")) {
    title = title.replace(/-/g, " ");
  }
  title = title.replace(/\s*[-–—:,]\s*$/, "").replace(/^\s*[-–—:,]\s*/, "").replace(/\s+-\s+/g, " – ").trim();
  return { title: title || clean(raw), performer };
}

export function dedupeKey(composerSlug: string, title: string, performer: string | null) {
  const squash = (value: string) => fold(value).replace(/[^a-z0-9]+/g, "");
  return `${composerSlug}|${squash(title)}|${squash(performer ?? "")}`;
}

export function buildSearchText(title: string, composer: Composer | null, performer: string | null, description: string) {
  return fold([
    title,
    composer?.name, composer?.short, composer?.zh, ...(composer?.aliases ?? []), composer?.era,
    performer,
    description.slice(0, 400),
  ].filter(Boolean).join(" ")).replace(/\s+/g, " ").slice(0, 2000);
}

/** Decides what a discovered file is, how good it is, and whether to publish it. */
export function evaluate(raw: RawRecording): TrackDraft | null {
  const composer = raw.composer;
  if (!composer) return null;
  const notes: string[] = [];
  let score = 50;
  let hardReject = false;

  const license = normalizeLicense(raw.licenseName, raw.licenseUrl);
  const { title, performer: titlePerformer } = parseTitle(raw.rawTitle, composer);
  const performer = (titlePerformer && cleanPerson(titlePerformer, composer)) ?? cleanPerson(raw.artist, composer) ?? cleanPerson(raw.credit, composer);
  const description = clean(raw.description).slice(0, 2000);
  const haystack = fold([raw.rawTitle, description, raw.artist, raw.credit, ...raw.categories].join(" "));

  if (!PLAYABLE.test(raw.mime)) { hardReject = true; notes.push(`not a recording (${raw.mime})`); }
  if (!license.ok) {
    if (license.review) { score -= 25; notes.push(`licence needs checking: ${license.name}`); }
    else { hardReject = true; notes.push(`licence not reusable: ${license.name}`); }
  }
  for (const [pattern, reason] of HARD_REJECT) {
    if (pattern.test(haystack)) { hardReject = true; notes.push(reason); break; }
  }
  if (/midi/.test(raw.categories.join(" ").toLowerCase())) { hardReject = true; notes.push("MIDI category"); }

  const seconds = Math.round(raw.durationSeconds);
  if (seconds < 60) { hardReject = true; notes.push(`too short (${seconds}s)`); }
  else if (seconds < 90) { score -= 15; notes.push("short piece"); }
  else if (seconds >= 480) { score += 12; notes.push("full-length work"); }
  else if (seconds >= 180) score += 8;

  if (raw.sizeBytes && seconds > 0 && /mpeg|ogg|mp3|opus|webm/.test(raw.mime)) {
    const kbps = (raw.sizeBytes * 8) / seconds / 1000;
    if (kbps < 48) { score -= 20; notes.push(`low bitrate (${Math.round(kbps)} kbps)`); }
    else if (kbps < 80) { score -= 6; notes.push(`modest bitrate (${Math.round(kbps)} kbps)`); }
  }

  if (performer) { score += 10; if (ENSEMBLE.test(fold(performer))) score += 5; }
  else { score -= 5; notes.push("performer not credited"); }
  if (MUSICAL_FORM.test(fold(title))) score += 10;
  else notes.push("title does not name a recognisable work");
  if (/excerpt|auszug|extrait|fragment/.test(haystack)) { score -= 12; notes.push("excerpt"); }
  if (/\b(19[0-3]\d|18\d\d)\b.*(record|wax|cylinder|78)|edison|gramophone|victor talking/.test(haystack)) notes.push("historical recording");
  if (raw.categories.some((category) => TRUSTED_CATEGORY.test(category))) { score += 15; notes.push("trusted collection"); }
  if (license.name === "CC0" || license.name === "Public domain") score += 3;
  score += raw.trust;

  if (hardReject) score = Math.min(score, 20);
  score = Math.max(0, Math.min(100, score));
  const status: TrackStatus = score >= PUBLISH_AT ? "published" : score >= REVIEW_AT ? "review" : "rejected";

  const attribution = [
    performer ? `Performed by ${performer}` : clean(raw.artist || raw.credit).slice(0, 300),
    `${license.name}${license.url ? ` (${license.url})` : ""}`,
    `via ${raw.source === "wikimedia_commons" ? "Wikimedia Commons" : "Internet Archive"}`,
  ].filter(Boolean).join(" · ");

  return {
    source: raw.source,
    source_key: raw.sourceKey,
    source_page_url: raw.pageUrl,
    original_url: raw.originalUrl,
    stream_url: raw.streamUrl,
    title: title.slice(0, 300),
    composer_slug: composer.slug,
    composer_name: composer.name,
    performer: performer?.slice(0, 200) ?? null,
    description,
    duration_seconds: Math.max(1, seconds),
    size_bytes: raw.sizeBytes,
    mime_type: raw.mime,
    license_name: license.name,
    license_url: license.url,
    attribution: attribution.slice(0, 1000),
    quality_score: score,
    quality_notes: notes,
    dedupe_key: dedupeKey(composer.slug, title, performer),
    status,
    search_text: buildSearchText(title, composer, performer, description),
  };
}

export { COMPOSERS };
