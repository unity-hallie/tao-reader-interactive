// encounter — the interaction at the heart of the reader
//
// one character at a time. you lift it; its neighbors yield.
// a second cannot enter while the first is open.
// to release is to tap again — deliberate, not accidental.
//
// on narrow viewports the encounter becomes the whole world:
// the text recedes, the character and its meaning rise to fill
// the screen. a pause in the reading, not a sidebar.

import { lookup } from "./dictionary.ts"

let activeChar: HTMLElement | null = null

const panel = document.getElementById("unfold-panel")!
const app = document.getElementById("app")!
const NARROW = 640
const DRAWER_WIDTH = 256 // 16rem

// --- helpers ---

function isNarrow(): boolean {
  return window.innerWidth <= NARROW
}

// --- yield: neighboring characters part to make space ---

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

// --- unfold panel ---

function openUnfold(charEl: HTMLElement) {
  const ch = charEl.dataset.char
  if (!ch) return

  const info = lookup(ch)

  if (info) {
    const etymParts: string[] = []
    if (info.etymology) {
      if (info.etymology.semantic) etymParts.push(info.etymology.semantic)
      if (info.etymology.hint) etymParts.push(`"${info.etymology.hint}"`)
      if (info.etymology.phonetic) etymParts.push(`+ ${info.etymology.phonetic}`)
    }
    const etymLine =
      etymParts.length > 0
        ? `<span class="unfold-etym">${info.decomposition} ${etymParts.join(" ")}</span>`
        : info.decomposition
        ? `<span class="unfold-etym">${info.decomposition}</span>`
        : ""

    panel.innerHTML = `
      <div class="unfold-inner">
        <span class="unfold-char" aria-hidden="true">${ch}</span>
        <span class="unfold-pinyin">${info.pinyin}</span>
        ${etymLine}
        <span class="unfold-def">${info.definition}</span>
      </div>
    `
  } else {
    panel.innerHTML = `
      <div class="unfold-inner">
        <span class="unfold-char" aria-hidden="true">${ch}</span>
        <span class="unfold-def">…</span>
      </div>
    `
  }

  panel.setAttribute("aria-label", `${ch} — character detail`)
  panel.setAttribute("aria-hidden", "false")
  charEl.setAttribute("aria-expanded", "true")

  // signal encounter state
  document.body.classList.add("encounter-active")

  panel.classList.remove("open", "settling")
  panel.offsetHeight // force reflow for transition reset
  requestAnimationFrame(() => panel.classList.add("open"))

  // on narrow viewports, hide app from assistive tech
  if (isNarrow()) {
    app.setAttribute("aria-hidden", "true")
    // move focus into the panel after it settles
    requestAnimationFrame(() => {
      const inner = panel.querySelector<HTMLElement>(".unfold-inner")
      if (inner) {
        inner.setAttribute("tabindex", "-1")
        inner.focus({ preventScroll: true })
      }
    })
  } else {
    // on wide viewports, scroll to keep the active character visible
    // if it would be occluded by the drawer
    requestAnimationFrame(() => {
      const rect = charEl.getBoundingClientRect()
      const drawerLeft = window.innerWidth - DRAWER_WIDTH
      if (rect.right > drawerLeft - 32) {
        charEl.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })
      }
    })
  }
}

function closeUnfold(): Promise<void> {
  return new Promise((resolve) => {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      panel.classList.remove("open", "settling")
      panel.setAttribute("aria-hidden", "true")
      document.body.classList.remove("encounter-active")
      app.setAttribute("aria-hidden", "false")
      resolve()
    }
    panel.classList.remove("open")
    panel.classList.add("settling")
    panel.addEventListener("transitionend", finish, { once: true })
    setTimeout(finish, 1100)
  })
}

// --- refuseTug: a second character tries to lift but the space won't yield ---

function refuseTug(charEl: HTMLElement) {
  const current = getComputedStyle(charEl).transform
  const base = current === "none" ? "" : current + " "

  charEl.animate(
    [
      { transform: base + "scale(1) translateY(0)" },
      { transform: base + "scale(1.04) translateY(-2px)", offset: 0.3 },
      { transform: base + "scale(0.99) translateY(0.5px)", offset: 0.7 },
      { transform: base + "scale(1) translateY(0)" },
    ],
    { duration: 600, easing: "cubic-bezier(0.4, 0, 0.7, 1)" }
  )

  if (activeChar) {
    activeChar.classList.add("shudder")
    activeChar.addEventListener("animationend", () => activeChar?.classList.remove("shudder"), { once: true })
  }
  panel.classList.add("shudder")
  panel.addEventListener("animationend", () => panel.classList.remove("shudder"), { once: true })
}

// --- dismiss: close the current encounter ---

function dismiss() {
  if (!activeChar) return
  const charToRefocus = activeChar

  activeChar.classList.remove("active")
  activeChar.setAttribute("aria-expanded", "false")
  clearYield()
  closeUnfold().then(() => {
    // return focus to the character that was tapped
    charToRefocus.focus({ preventScroll: true })
  })
  activeChar = null
}

// --- handleCharTouch: the full encounter logic ---

export function handleCharTouch(charEl: HTMLElement) {
  const isSameChar = charEl === activeChar

  if (isSameChar && activeChar) {
    dismiss()
    return
  }

  if (activeChar) {
    refuseTug(charEl)
    return
  }

  activeChar = charEl
  charEl.classList.add("active")
  applyYield(charEl)
  openUnfold(charEl)
}

// release any open character — called on chapter transitions
export function releaseActive(): Promise<void> {
  if (!activeChar) return Promise.resolve()

  activeChar.classList.remove("active")
  activeChar.setAttribute("aria-expanded", "false")
  clearYield()
  activeChar = null

  return closeUnfold()
}

// --- global listeners ---

// Escape key dismisses the encounter
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && activeChar) {
    e.preventDefault()
    dismiss()
  }
})

// on narrow viewports, tapping the panel background dismisses the encounter
panel.addEventListener("click", (e) => {
  if (!activeChar || !isNarrow()) return
  // only dismiss if tapping the panel background, not the content
  const inner = panel.querySelector(".unfold-inner")
  if (inner && inner.contains(e.target as Node)) return
  dismiss()
})

// swipe-down-to-dismiss on the encounter surface (narrow viewports)
let panelTouchStartY = 0
let panelTouchActive = false

panel.addEventListener("touchstart", (e) => {
  if (!activeChar || !isNarrow()) return
  panelTouchStartY = e.touches[0].clientY
  panelTouchActive = true
}, { passive: true })

panel.addEventListener("touchend", (e) => {
  if (!panelTouchActive) return
  panelTouchActive = false
  const dy = e.changedTouches[0].clientY - panelTouchStartY
  if (dy > 60) {
    dismiss()
  }
}, { passive: true })
