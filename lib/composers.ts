export type Era = "Medieval & Renaissance" | "Baroque" | "Classical" | "Romantic" | "Modern";

export type Composer = {
  slug: string;
  name: string;
  /** Surname or familiar short form used in compact UI and title matching. */
  short: string;
  zh: string;
  born: number;
  died: number;
  era: Era;
  /** Wikimedia Commons category, crawled with `deepcat:` so sub-categories are included. */
  category: string;
  /** Extra spellings used to recognise the composer in free text. */
  aliases?: string[];
};

export const ERAS: { name: Era; span: string; blurb: string }[] = [
  { name: "Medieval & Renaissance", span: "before 1600", blurb: "Plainchant, polyphony, and the voice at the centre of everything." },
  { name: "Baroque", span: "1600–1750", blurb: "Counterpoint, continuo, and dance rhythms that never sit still." },
  { name: "Classical", span: "1750–1820", blurb: "Clarity, balance, and the birth of the symphony and sonata." },
  { name: "Romantic", span: "1820–1900", blurb: "Big feelings, virtuoso pianists, and national voices." },
  { name: "Modern", span: "1900 onward", blurb: "Impressionism, new harmonies, and the century that broke the rules." },
];

const c = (
  slug: string, name: string, short: string, zh: string, born: number, died: number,
  era: Era, aliases: string[] = [], category = `Audio files of music by ${name}`,
): Composer => ({ slug, name, short, zh, born, died, era, category, aliases });

export const COMPOSERS: Composer[] = [
  c("palestrina", "Giovanni Pierluigi da Palestrina", "Palestrina", "帕莱斯特里纳", 1525, 1594, "Medieval & Renaissance"),
  c("byrd", "William Byrd", "Byrd", "伯德", 1540, 1623, "Medieval & Renaissance"),
  c("tallis", "Thomas Tallis", "Tallis", "塔利斯", 1505, 1585, "Medieval & Renaissance"),
  c("monteverdi", "Claudio Monteverdi", "Monteverdi", "蒙特威尔第", 1567, 1643, "Baroque"),
  c("purcell", "Henry Purcell", "Purcell", "珀塞尔", 1659, 1695, "Baroque"),
  c("pachelbel", "Johann Pachelbel", "Pachelbel", "帕赫贝尔", 1653, 1706, "Baroque"),
  c("corelli", "Arcangelo Corelli", "Corelli", "科雷利", 1653, 1713, "Baroque"),
  c("vivaldi", "Antonio Vivaldi", "Vivaldi", "维瓦尔第", 1678, 1741, "Baroque"),
  c("telemann", "Georg Philipp Telemann", "Telemann", "泰勒曼", 1681, 1767, "Baroque"),
  c("rameau", "Jean-Philippe Rameau", "Rameau", "拉莫", 1683, 1764, "Baroque"),
  c("bach", "Johann Sebastian Bach", "Bach", "巴赫", 1685, 1750, "Baroque", ["J.S. Bach", "JS Bach", "J. S. Bach", "BWV"]),
  c("handel", "George Frideric Handel", "Handel", "亨德尔", 1685, 1759, "Baroque", ["Händel", "Haendel", "HWV"], "Audio files of music by Georg Frideric Händel"),
  c("scarlatti", "Domenico Scarlatti", "Scarlatti", "斯卡拉蒂", 1685, 1757, "Baroque"),
  c("couperin", "François Couperin", "Couperin", "库普兰", 1668, 1733, "Baroque"),
  c("haydn", "Joseph Haydn", "Haydn", "海顿", 1732, 1809, "Classical", ["Hob."]),
  c("boccherini", "Luigi Boccherini", "Boccherini", "博凯里尼", 1743, 1805, "Classical"),
  c("clementi", "Muzio Clementi", "Clementi", "克莱门蒂", 1752, 1832, "Classical"),
  c("mozart", "Wolfgang Amadeus Mozart", "Mozart", "莫扎特", 1756, 1791, "Classical", ["W. A. Mozart", "W.A. Mozart", "K."]),
  c("beethoven", "Ludwig van Beethoven", "Beethoven", "贝多芬", 1770, 1827, "Classical"),
  c("paganini", "Niccolò Paganini", "Paganini", "帕格尼尼", 1782, 1840, "Romantic"),
  c("weber", "Carl Maria von Weber", "Weber", "韦伯", 1786, 1826, "Romantic"),
  c("rossini", "Gioachino Rossini", "Rossini", "罗西尼", 1792, 1868, "Romantic"),
  c("schubert", "Franz Schubert", "Schubert", "舒伯特", 1797, 1828, "Romantic", ["D."]),
  c("donizetti", "Gaetano Donizetti", "Donizetti", "多尼采蒂", 1797, 1848, "Romantic"),
  c("bellini", "Vincenzo Bellini", "Bellini", "贝利尼", 1801, 1835, "Romantic"),
  c("berlioz", "Hector Berlioz", "Berlioz", "柏辽兹", 1803, 1869, "Romantic"),
  c("mendelssohn", "Felix Mendelssohn", "Mendelssohn", "门德尔松", 1809, 1847, "Romantic"),
  c("chopin", "Frédéric Chopin", "Chopin", "肖邦", 1810, 1849, "Romantic", ["Fryderyk Chopin"]),
  c("schumann", "Robert Schumann", "Schumann", "舒曼", 1810, 1856, "Romantic"),
  c("liszt", "Franz Liszt", "Liszt", "李斯特", 1811, 1886, "Romantic"),
  c("wagner", "Richard Wagner", "Wagner", "瓦格纳", 1813, 1883, "Romantic"),
  c("verdi", "Giuseppe Verdi", "Verdi", "威尔第", 1813, 1901, "Romantic"),
  c("offenbach", "Jacques Offenbach", "Offenbach", "奥芬巴赫", 1819, 1880, "Romantic"),
  c("franck", "César Franck", "Franck", "弗朗克", 1822, 1890, "Romantic"),
  c("smetana", "Bedřich Smetana", "Smetana", "斯美塔那", 1824, 1884, "Romantic"),
  c("bruckner", "Anton Bruckner", "Bruckner", "布鲁克纳", 1824, 1896, "Romantic"),
  c("strauss-ii", "Johann Strauss II", "Johann Strauss", "约翰·施特劳斯", 1825, 1899, "Romantic", ["Strauss II", "Johann Strauss Jr"]),
  c("brahms", "Johannes Brahms", "Brahms", "勃拉姆斯", 1833, 1897, "Romantic"),
  c("borodin", "Alexander Borodin", "Borodin", "鲍罗丁", 1833, 1887, "Romantic"),
  c("saint-saens", "Camille Saint-Saëns", "Saint-Saëns", "圣-桑", 1835, 1921, "Romantic", ["Saint-Saens"]),
  c("bizet", "Georges Bizet", "Bizet", "比才", 1838, 1875, "Romantic"),
  c("mussorgsky", "Modest Mussorgsky", "Mussorgsky", "穆索尔斯基", 1839, 1881, "Romantic", ["Moussorgsky", "Musorgsky"]),
  c("tchaikovsky", "Pyotr Ilyich Tchaikovsky", "Tchaikovsky", "柴可夫斯基", 1840, 1893, "Romantic", ["Tschaikowsky", "Tchaikowsky", "Chaikovsky"]),
  c("dvorak", "Antonín Dvořák", "Dvořák", "德沃夏克", 1841, 1904, "Romantic", ["Dvorak"]),
  c("grieg", "Edvard Grieg", "Grieg", "格里格", 1843, 1907, "Romantic"),
  c("rimsky-korsakov", "Nikolai Rimsky-Korsakov", "Rimsky-Korsakov", "里姆斯基-科萨科夫", 1844, 1908, "Romantic"),
  c("faure", "Gabriel Fauré", "Fauré", "福雷", 1845, 1924, "Romantic", ["Faure"]),
  c("janacek", "Leoš Janáček", "Janáček", "雅纳切克", 1854, 1928, "Modern", ["Janacek"]),
  c("elgar", "Edward Elgar", "Elgar", "埃尔加", 1857, 1934, "Romantic"),
  c("puccini", "Giacomo Puccini", "Puccini", "普契尼", 1858, 1924, "Romantic"),
  c("mahler", "Gustav Mahler", "Mahler", "马勒", 1860, 1911, "Romantic"),
  c("albeniz", "Isaac Albéniz", "Albéniz", "阿尔贝尼斯", 1860, 1909, "Romantic", ["Albeniz"]),
  c("debussy", "Claude Debussy", "Debussy", "德彪西", 1862, 1918, "Modern"),
  c("r-strauss", "Richard Strauss", "R. Strauss", "理查·施特劳斯", 1864, 1949, "Modern"),
  c("nielsen", "Carl Nielsen", "Nielsen", "尼尔森", 1865, 1931, "Modern"),
  c("satie", "Erik Satie", "Satie", "萨蒂", 1866, 1925, "Modern"),
  c("granados", "Enrique Granados", "Granados", "格拉纳多斯", 1867, 1916, "Romantic"),
  c("scriabin", "Alexander Scriabin", "Scriabin", "斯克里亚宾", 1872, 1915, "Modern", ["Skryabin"]),
  c("rachmaninoff", "Sergei Rachmaninoff", "Rachmaninoff", "拉赫玛尼诺夫", 1873, 1943, "Modern", ["Rachmaninov"]),
  c("holst", "Gustav Holst", "Holst", "霍尔斯特", 1874, 1934, "Modern"),
  c("ravel", "Maurice Ravel", "Ravel", "拉威尔", 1875, 1937, "Modern"),
  c("falla", "Manuel de Falla", "Falla", "法雅", 1876, 1946, "Modern"),
  c("respighi", "Ottorino Respighi", "Respighi", "雷斯庇基", 1879, 1936, "Modern"),
  c("bartok", "Béla Bartók", "Bartók", "巴托克", 1881, 1945, "Modern", ["Bartok"]),
  c("prokofiev", "Sergei Prokofiev", "Prokofiev", "普罗科菲耶夫", 1891, 1953, "Modern"),
  c("gershwin", "George Gershwin", "Gershwin", "格什温", 1898, 1937, "Modern"),
  c("shostakovich", "Dmitri Shostakovich", "Shostakovich", "肖斯塔科维奇", 1906, 1975, "Modern"),
];

export const COMPOSER_BY_SLUG = new Map(COMPOSERS.map((composer) => [composer.slug, composer]));

export function fold(value: string) {
  return value.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Finds the composer named in a piece of free text (titles, archive metadata). */
export function detectComposer(text: string): Composer | null {
  const haystack = fold(text);
  let best: { composer: Composer; index: number } | null = null;
  for (const composer of COMPOSERS) {
    const names = [composer.name, composer.short, ...(composer.aliases ?? []).filter((alias) => alias.length > 4)];
    for (const name of names) {
      const index = haystack.search(new RegExp(`\\b${fold(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`));
      if (index >= 0 && (!best || index < best.index)) best = { composer, index };
    }
  }
  return best?.composer ?? null;
}

export function lifespan(composer: Composer) {
  return `${composer.born}–${composer.died}`;
}
