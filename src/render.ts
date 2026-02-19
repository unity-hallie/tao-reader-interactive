// render — turns source text into interactive markup
// each character becomes a button; each line a column; each chapter an article

import { chapters } from "./text/chapters.ts"
import { toChineseNumeral } from "./numerals.ts"

export function renderChapter(index: number): string {
  const chapter = chapters[index]
  if (!chapter) return ""

  const chapterNum = toChineseNumeral(index + 1)

  const lines = chapter
    .map((line, lineIdx) => {
      const chars = [...line]
        .map(
          (ch) =>
            `<button class="char" data-char="${ch}" type="button" aria-label="${ch}" aria-expanded="false">${ch}</button>`
        )
        .join("")
      return `<span class="line" role="group" aria-label="第${chapterNum}章 第${toChineseNumeral(lineIdx + 1)}行">${chars}</span>`
    })
    .join("")

  return `
    <article class="chapter" aria-label="道德經 第${chapterNum}章" lang="lzh">
      ${lines}
      <span class="chapter-number" aria-hidden="true">第${chapterNum}章</span>
    </article>
  `
}
