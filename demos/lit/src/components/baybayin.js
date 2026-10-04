// Romanized Tagalog to Baybayin: one sign per syllable. A bare sign reads
// consonant + a; a kudlit above makes it e/i, below o/u. Final consonants were
// originally left unwritten; the krus-kudlit (virama) marks them.
const VOWELS = { a: "ᜀ", e: "ᜁ", i: "ᜁ", o: "ᜂ", u: "ᜂ" };
const KUDLIT = { a: "", e: "ᜒ", i: "ᜒ", o: "ᜓ", u: "ᜓ" };
const VIRAMA = "᜔";
const CONSONANTS = {
  k: "ᜃ", g: "ᜄ", ng: "ᜅ", t: "ᜆ", d: "ᜇ", n: "ᜈ", p: "ᜉ",
  b: "ᜊ", m: "ᜋ", y: "ᜌ", l: "ᜎ", w: "ᜏ", s: "ᜐ", h: "ᜑ",
};
// Sounds without a sign of their own, written the way Tagalog speakers did.
const SPELLING = [[/ch/g, "ts"], [/[cq]/g, "k"], [/f/g, "p"], [/v/g, "b"], [/z/g, "s"], [/j/g, "h"], [/r/g, "d"], [/x/g, "ks"]];
const PUNCTUATION = { ",": "᜵", ";": "᜵", ".": "᜶", "!": "᜶", "?": "᜶" };

// Returns words as lists of { sign, roman, silent } syllables.
export function transliterate(text, { virama = true } = {}) {
  let s = text.toLowerCase().replace(/ñ/g, "ny").normalize("NFD").replace(/\p{M}/gu, "");
  for (const [from, to] of SPELLING) s = s.replace(from, to);

  const words = [];
  let word = [];
  const flush = () => word.length && (words.push(word), (word = []));
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c in VOWELS) {
      word.push({ sign: VOWELS[c], roman: c });
    } else if (s.startsWith("ng", i) || c in CONSONANTS) {
      const cons = s.startsWith("ng", i) ? "ng" : c;
      i += cons.length - 1;
      const v = s[i + 1];
      if (v in VOWELS) {
        word.push({ sign: CONSONANTS[cons] + KUDLIT[v], roman: cons + v });
        i++;
      } else {
        word.push(virama ? { sign: CONSONANTS[cons] + VIRAMA, roman: cons } : { sign: "", roman: cons, silent: true });
      }
    } else if (c in PUNCTUATION) {
      word.push({ sign: PUNCTUATION[c], roman: c });
      flush();
    } else if (/\s/.test(c)) {
      flush();
    }
  }
  flush();
  return words;
}

export const toBaybayin = (text, options) =>
  transliterate(text, options).map((w) => w.map((syl) => syl.sign).join("")).join(" ");
