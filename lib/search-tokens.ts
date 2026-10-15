import { COMPOSERS, fold } from "./composers.ts";

/** Chinese musical vocabulary → the English words used in titles. */
const ZH_TERMS: [string, string][] = [
  ["弦乐四重奏", "quartet"], ["波兰舞曲", "polonaise"], ["无伴奏", "solo"], ["平均律", "clavier"], ["哥德堡", "goldberg"],
  ["勃兰登堡", "brandenburg"], ["月光", "moonlight"], ["悲怆", "pathetique"], ["命运", "symphony 5"], ["田园", "pastoral"],
  ["英雄", "eroica"], ["合唱", "choral"], ["欢乐颂", "joy"], ["致爱丽丝", "elise"], ["四季", "seasons"], ["春", "spring"],
  ["冬", "winter"], ["天鹅湖", "swan"], ["胡桃夹子", "nutcracker"], ["魔笛", "zauberflote"], ["费加罗", "figaro"],
  ["唐璜", "giovanni"], ["卡门", "carmen"], ["茶花女", "traviata"], ["托斯卡", "tosca"], ["新世界", "new world"],
  ["交响曲", "symphony"], ["协奏曲", "concerto"], ["奏鸣曲", "sonata"], ["前奏曲", "prelude"], ["练习曲", "etude"],
  ["圆舞曲", "waltz"], ["夜曲", "nocturne"], ["叙事曲", "ballade"], ["谐谑曲", "scherzo"], ["即兴曲", "impromptu"],
  ["马祖卡", "mazurka"], ["变奏曲", "variation"], ["赋格", "fugue"], ["托卡塔", "toccata"], ["组曲", "suite"],
  ["序曲", "overture"], ["安魂曲", "requiem"], ["弥撒", "mass"], ["清唱剧", "oratorio"], ["康塔塔", "cantata"],
  ["咏叹调", "aria"], ["歌剧", "opera"], ["小夜曲", "serenade"], ["进行曲", "march"], ["小步舞曲", "minuet"],
  ["狂想曲", "rhapsody"], ["幻想曲", "fantasy"], ["船歌", "barcarolle"], ["摇篮曲", "berceuse"], ["幽默曲", "humoresque"],
  ["钢琴", "piano"], ["小提琴", "violin"], ["大提琴", "cello"], ["中提琴", "viola"], ["长笛", "flute"], ["单簧管", "clarinet"],
  ["双簧管", "oboe"], ["管风琴", "organ"], ["羽管键琴", "harpsichord"], ["吉他", "guitar"], ["竖琴", "harp"],
  ["四重奏", "quartet"], ["三重奏", "trio"], ["五重奏", "quintet"], ["管弦乐", "orchestra"], ["乐团", "orchestra"],
  ["巴洛克", "baroque"], ["古典主义", "classical"], ["浪漫", "romantic"],
];
const ZH_COMPOSERS = COMPOSERS.map((composer) => [composer.zh, composer.zh] as [string, string]);

/** Splits a query into accent-free tokens; CJK runs are segmented with the term list above. */
export function queryTokens(query: string) {
  let text = fold(query.slice(0, 120));
  const tokens: string[] = [];
  for (const [term, replacement] of [...ZH_COMPOSERS, ...ZH_TERMS].sort((a, b) => b[0].length - a[0].length)) {
    if (text.includes(term)) {
      tokens.push(...replacement.split(" "));
      text = text.replaceAll(term, " ");
    }
  }
  tokens.push(...text.split(/[^\p{L}\p{N}]+/u).filter(Boolean));
  const stop = new Set(["the", "a", "of", "in", "and", "by", "no", "op", "de", "la", "le", "der", "die", "das", "的", "曲"]);
  return [...new Set(tokens)].filter((token) => token.length > 1 || /\p{Script=Han}|\d/u.test(token)).filter((token) => !stop.has(token)).slice(0, 8);
}
