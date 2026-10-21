import assert from "node:assert/strict";
import { test } from "node:test";
import { parseWork, workKey } from "./works.ts";

test("splits works and movements from real catalogue titles", () => {
  const cases: [string, string, number, string][] = [
    ["Symphony No. 40 in G minor, K550 – IV. Finale. Allegro assai", "Symphony No. 40 in G minor, K550", 4, "Finale. Allegro assai"],
    ["Cello Sonata in G minor, Op. 65 – IV. Finale. Allegro", "Cello Sonata in G minor, Op. 65", 4, "Finale. Allegro"],
    ["Symphony No. 1 in C (Op. 21): I. Adagio molto, Allegro con brio", "Symphony No. 1 in C (Op. 21)", 1, "Adagio molto, Allegro con brio"],
    ["Don Giovanni – 21. Batti, batti, o bel Masetto", "Don Giovanni", 21, "Batti, batti, o bel Masetto"],
    ["Four Seasons 2 Summer mvt 3 Presto", "Four Seasons 2 Summer", 3, "Presto"],
    ["Chopin Sonata no 2 1st movement", "Chopin Sonata no 2", 1, ""],
    ["Symphony No.18 in F Major K. 130 I. Allegro", "Symphony No.18 in F Major K. 130", 1, "Allegro"],
    ["Klaviersonate Nr. 31 As-Dur op. 110 – III. Adagio, ma non troppo", "Klaviersonate Nr. 31 As-Dur op. 110", 3, "Adagio, ma non troppo"],
    // 78 rpm sides
    ["Sonata in B flat minor, Op. 35 – Part 2", "Sonata in B flat minor, Op. 35", 2, ""],
    ["Ballade in G minor (Pt. 1)", "Ballade in G minor", 1, ""],
    ["Hungarian Rhapsody No. 2 - 2nd part", "Hungarian Rhapsody No. 2", 2, ""],
  ];
  for (const [title, work, number, movement] of cases) {
    assert.deepEqual(parseWork(title), { workTitle: work, movementNumber: number, movementTitle: movement }, title);
  }
});

test("leaves standalone pieces alone", () => {
  for (const title of [
    "Nocturne No. 8 in D-flat major, Op. 27 No. 2",
    "Prelude in D-flat Op-28 No-15 (Raindrop)",
    "Rêverie",
    "Toccata und Fuge d-moll BWV 565, Norbert Schenk",
    "Paderewski – Steinway grand piano",
    "Mass in C Minor, K.427",
  ]) assert.equal(parseWork(title), null, title);
});

test("groups by composer, work and performer", () => {
  assert.equal(workKey("mozart", "Symphony No. 40", "Fricsay"), workKey("mozart", "symphony no 40", "fricsay"));
  assert.notEqual(workKey("mozart", "Symphony No. 40", "Fricsay"), workKey("mozart", "Symphony No. 40", "Karajan"));
});
