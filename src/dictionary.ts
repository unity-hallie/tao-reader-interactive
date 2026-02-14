// character lookup — bundled data, no network calls
// sources: Unicode Unihan (Unicode License V3), Make Me a Hanzi (LGPL v3+ / Arphic PL)

import unihanData from "./data/unihan.json"
import hanziData from "./data/hanzi.json"

type UnihanEntry = {
  pinyin: string
  definition: string
  radical: string
  strokes: number
}

type HanziEtymology = {
  type?: string
  hint?: string
  phonetic?: string
  semantic?: string
}

type HanziEntry = {
  definition: string
  pinyin: string[]
  radical: string
  decomposition: string
  etymology: HanziEtymology
}

export type { HanziEtymology }

export type CharacterInfo = {
  character: string
  pinyin: string
  definition: string
  radical: string
  strokes: number
  decomposition: string
  etymology: HanziEtymology | null
}

const unihan = unihanData as Record<string, UnihanEntry>
const hanzi = hanziData as Record<string, HanziEntry>

export function lookup(ch: string): CharacterInfo | null {
  const u = unihan[ch]
  const h = hanzi[ch]

  // need at least one source
  if (!u && !h) return null

  return {
    character: ch,
    pinyin: u?.pinyin ?? h?.pinyin[0] ?? "",
    definition: u?.definition ?? h?.definition ?? "",
    radical: h?.radical ?? u?.radical ?? "",
    strokes: u?.strokes ?? 0,
    decomposition: h?.decomposition ?? "",
    etymology: h?.etymology ?? null,
  }
}
