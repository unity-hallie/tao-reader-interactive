import "./style.css"
import { chapters } from "./text/chapters.ts"

// render a single chapter as characters you can encounter
function renderChapter(index: number): string {
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
      return `<p class="line" role="group" aria-label="第${chapterNum}章 第${toChineseNumeral(lineIdx + 1)}行">${chars}</p>`
    })
    .join("")

  return `
    <article class="chapter" aria-label="道德經 第${chapterNum}章" lang="lzh">
      <header class="chapter-number" aria-hidden="true">第${chapterNum}章</header>
      ${lines}
    </article>
  `
}

function toChineseNumeral(n: number): string {
  const numerals = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"]
  const tens = ["", "十", "二十", "三十", "四十", "五十", "六十", "七十", "八十"]
  if (n <= 10) return n === 10 ? "十" : numerals[n]
  if (n < 20) return "十" + numerals[n - 10]
  const t = Math.floor(n / 10)
  const o = n % 10
  return tens[t] + numerals[o]
}

// --- interaction: the encounter ---

let activeChar: HTMLElement | null = null
let activeUnfold: HTMLElement | null = null

function clearYield() {
  document.querySelectorAll(".yield-near, .yield-far").forEach((el) => {
    el.classList.remove("yield-near", "yield-far")
    ;(el as HTMLElement).style.removeProperty("--yield-dir")
  })
}

function applyYield(charEl: HTMLElement) {
  const line = charEl.parentElement
  if (!line) return
  const siblings = Array.from(line.children) as HTMLElement[]
  const idx = siblings.indexOf(charEl)

  siblings.forEach((sib, i) => {
    if (i === idx) return
    const dist = i - idx
    const absDist = Math.abs(dist)
    const dir = dist < 0 ? -1 : 1

    if (absDist === 1) {
      sib.classList.add("yield-near")
      sib.style.setProperty("--yield-dir", String(dir))
    } else if (absDist === 2) {
      sib.classList.add("yield-far")
      sib.style.setProperty("--yield-dir", String(dir))
    }
  })
}

function settleUnfold(unfold: HTMLElement): Promise<void> {
  return new Promise((resolve) => {
    unfold.classList.remove("open")
    unfold.classList.add("settling")
    unfold.addEventListener("transitionend", () => {
      unfold.remove()
      resolve()
    }, { once: true })
    setTimeout(() => {
      unfold.remove()
      resolve()
    }, 1100)
  })
}

function openUnfold(charEl: HTMLElement) {
  const ch = charEl.dataset.char
  if (!ch) return

  const line = charEl.closest(".line")
  if (!line) return

  const unfold = document.createElement("aside")
  unfold.classList.add("unfold")
  unfold.setAttribute("role", "region")
  unfold.setAttribute("aria-label", `${ch} — character detail`)
  unfold.innerHTML = `
    <div class="unfold-inner">
      <span class="unfold-char" aria-hidden="true">${ch}</span>
      <span>…</span>
    </div>
  `

  line.after(unfold)
  charEl.setAttribute("aria-expanded", "true")
  unfold.offsetHeight

  requestAnimationFrame(() => {
    unfold.classList.add("open")
  })

  activeUnfold = unfold
}

// the tug-and-refuse: character tries to lift but the occupied space won't yield
function refuseTug(charEl: HTMLElement) {
  // read where the character currently is (may be displaced by yield)
  const current = getComputedStyle(charEl).transform
  const base = current === "none" ? "" : current + " "

  // animate from current position: tries to lift, gives up, settles back
  charEl.animate([
    { transform: base + "scale(1) translateY(0)" },
    { transform: base + "scale(1.04) translateY(-2px)", offset: 0.3 },
    { transform: base + "scale(0.99) translateY(0.5px)", offset: 0.7 },
    { transform: base + "scale(1) translateY(0)" },
  ], {
    duration: 600,
    easing: "cubic-bezier(0.4, 0, 0.7, 1)",
  })

  // the active character and its unfold both shudder — "close me first"
  if (activeChar) {
    activeChar.classList.add("shudder")
    activeChar.addEventListener("animationend", () => {
      activeChar?.classList.remove("shudder")
    }, { once: true })
  }
  if (activeUnfold) {
    activeUnfold.classList.add("shudder")
    activeUnfold.addEventListener("animationend", () => {
      activeUnfold?.classList.remove("shudder")
    }, { once: true })
  }
}

function handleCharTouch(charEl: HTMLElement) {
  const isSameChar = charEl === activeChar

  // tapping the active character closes it — deliberate release
  if (isSameChar && activeChar) {
    activeChar.classList.remove("active")
    activeChar.setAttribute("aria-expanded", "false")
    clearYield()
    if (activeUnfold) {
      settleUnfold(activeUnfold)
      activeUnfold = null
    }
    activeChar = null
    return
  }

  // something is already open — refuse the new one, it can't come in yet
  if (activeChar) {
    refuseTug(charEl)
    return
  }

  // nothing open — this character is free to lift
  activeChar = charEl
  charEl.classList.add("active")
  applyYield(charEl)
  openUnfold(charEl)
}

// --- mount ---

const app = document.querySelector<HTMLDivElement>("#app")!
app.setAttribute("role", "main")
app.innerHTML = renderChapter(0)

app.addEventListener("click", (e) => {
  const charEl = (e.target as HTMLElement).closest(".char") as HTMLElement | null
  if (charEl) {
    handleCharTouch(charEl)
  }
})
