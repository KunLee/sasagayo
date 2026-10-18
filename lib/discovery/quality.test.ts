import assert from "node:assert/strict";
import { test } from "node:test";
import { COMPOSER_BY_SLUG } from "../composers.ts";
import { queryTokens } from "../search-tokens.ts";
import { evaluate, normalizeLicense, parseTitle, type RawRecording } from "./quality.ts";

const chopin = COMPOSER_BY_SLUG.get("chopin")!;
const mozart = COMPOSER_BY_SLUG.get("mozart")!;

function raw(overrides: Partial<RawRecording>): RawRecording {
  return {
    source: "wikimedia_commons", sourceKey: "commons:1", pageUrl: "https://commons.wikimedia.org/wiki/File:X.ogg",
    originalUrl: "https://upload.wikimedia.org/x.ogg", streamUrl: "https://upload.wikimedia.org/x.ogg.mp3",
    mime: "application/ogg", sizeBytes: 6_000_000, durationSeconds: 300, rawTitle: "Nocturne Op. 9 No. 2",
    artist: "", credit: "", description: "", licenseName: "Public domain", licenseUrl: "", categories: [],
    composer: chopin, trust: 0, ...overrides,
  };
}

test("publishes a credited full performance with an open licence", () => {
  const draft = evaluate(raw({ rawTitle: "Chopin - Nocturne No. 8 in D-flat major, Op. 27 No. 2 (Frank Levy).flac", mime: "audio/flac", sizeBytes: 40_000_000 }))!;
  assert.equal(draft.status, "published");
  assert.equal(draft.title, "Nocturne No. 8 in D-flat major, Op. 27 No. 2");
  assert.equal(draft.performer, "Frank Levy");
});

test("rejects the kinds of junk the old importer let through", () => {
  const cases: Partial<RawRecording>[] = [
    { mime: "audio/midi", rawTitle: "Chopin, Mazurkas, Op. 6, No. 1.mid" },
    { rawTitle: "Inleiding Collegium Vocale Gent (audio)", composer: mozart },
    { rawTitle: "Sugar Plum Dark Mix (ISRC USUAN1100623)", artist: "Kevin MacLeod" },
    { rawTitle: "Debussy Voiles, Preludes, Book I, no. 2, mm.43-45", durationSeconds: 12 },
    { rawTitle: "Chopin Scherzo No. 1, bars 305-312.wav", durationSeconds: 18 },
    { rawTitle: "Etude, Db major no opus", artist: "The Al Goldstein collection in the Pandora Music repository at ibiblio.org." },
    { rawTitle: "Nocturne", licenseName: "CC BY-NC-SA 3.0" },
    { rawTitle: "Premix Brahms Symphony No. 1 in C Major 01.L" },
  ];
  for (const overrides of cases) assert.equal(evaluate(raw(overrides))!.status, "rejected", String(overrides.rawTitle));
});

test("does not mistake tempo markings, composers, or uploaders for performers", () => {
  assert.equal(parseTitle("Klaviersonate Nr. 1 Op. 2.1 – III.Menuetto and Trio (Allegretto)", null).performer, null);
  assert.equal(evaluate(raw({ rawTitle: "Symphony No. 40 in G minor, K550 (Mozart)", composer: mozart }))!.performer, null);
  assert.equal(evaluate(raw({ artist: "Frédéric Chopin / Luke Faulkner" }))!.performer, "Luke Faulkner");
  assert.equal(evaluate(raw({ artist: "https://web.archive.org/web/2014" }))!.performer, null);
});

test("recognises opera and vocal works, not just instrumental forms", () => {
  const draft = evaluate(raw({ rawTitle: "W. A. Mozart - Don Giovanni - 21. Batti, batti, o bel Masetto", artist: "Josef Krips, Wiener Staatsoper", composer: mozart }))!;
  assert.equal(draft.title, "Don Giovanni – 21. Batti, batti, o bel Masetto");
  assert.equal(draft.status, "published");
});

test("normalises licence labels", () => {
  assert.equal(normalizeLicense("CC BY-SA 3.0 de").name, "CC BY-SA 3.0");
  assert.equal(normalizeLicense("", "http://creativecommons.org/publicdomain/zero/1.0/").name, "CC0");
  assert.equal(normalizeLicense("CC BY-NC 4.0").ok, false);
});

test("segments Chinese queries into searchable words", () => {
  const sorted = (query: string) => queryTokens(query).sort();
  assert.deepEqual(sorted("肖邦 夜曲"), ["nocturne", "肖邦"]);
  assert.deepEqual(sorted("贝多芬月光奏鸣曲"), ["moonlight", "sonata", "贝多芬"]);
  assert.deepEqual(sorted("Dvořák New World"), ["dvorak", "new", "world"]);
});

test("pulls the performer out of 'Title – Name instrument' file names", () => {
  const vivaldi = COMPOSER_BY_SLUG.get("vivaldi")!;
  const draft = evaluate(raw({ rawTitle: "Four Seasons 2 Summer mvt 3 Presto - John Harrison violin", artist: "By uploader", composer: vivaldi }))!;
  assert.equal(draft.title, "Four Seasons 2 Summer mvt 3 Presto");
  assert.equal(draft.performer, "John Harrison");
});

test("manual mode sends would-be publications to review", () => {
  const good = raw({ rawTitle: "Chopin - Nocturne No. 8 in D-flat major, Op. 27 No. 2 (Frank Levy).flac", mime: "audio/flac" });
  assert.equal(evaluate(good, { mode: "manual", publishAt: 60, reviewAt: 40 })!.status, "review");
  assert.equal(evaluate(good, { mode: "auto", publishAt: 95, reviewAt: 40 })!.status, "review");
  assert.equal(evaluate(raw({ mime: "audio/midi" }), { mode: "auto", publishAt: 30, reviewAt: 25 })!.status, "rejected");
});
