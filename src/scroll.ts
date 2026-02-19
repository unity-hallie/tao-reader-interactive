// scroll — chapter navigation for a vertical scroll reader
//
// the text flows top-to-bottom, right-to-left, like a classical manuscript.
// navigation is minimal: faint chapter markers in the margin, arrow keys,
// and swipe. the reader should feel like unrolling a scroll, not clicking tabs.
//
// chapter transitions slide horizontally — the current chapter departs in
// the reading direction, the new one enters from the other side.

import { chapters } from "./text/chapters.ts"
import { renderChapter } from "./render.ts"
import { releaseActive } from "./encounter.ts"
import { toChineseNumeral } from "./numerals.ts"

let currentIndex = 0
let transitioning = false

const SWIPE_THRESHOLD = 50

// --- RTL scroll origin ---
// classical text starts at the rightmost column. after rendering,
// scroll the container all the way to the right so line 1 is visible.

export function scrollToStart(container: HTMLElement) {
  container.scrollLeft = container.scrollWidth - container.clientWidth
}

// --- nav UI ---

function updateNav() {
  const prev = document.querySelector<HTMLButtonElement>("#nav-prev")
  const next = document.querySelector<HTMLButtonElement>("#nav-next")
  const indicator = document.querySelector<HTMLElement>("#nav-indicator")

  if (prev) prev.disabled = currentIndex === 0
  if (next) next.disabled = currentIndex === chapters.length - 1
  if (indicator) {
    indicator.textContent = `第${toChineseNumeral(currentIndex + 1)}章`
  }
}

// --- chapter transitions: horizontal slide ---

async function goToChapter(index: number) {
  if (index < 0 || index >= chapters.length) return
  if (index === currentIndex) return
  if (transitioning) return

  transitioning = true
  const direction = index > currentIndex ? "next" : "prev"

  await releaseActive()

  const app = document.querySelector<HTMLElement>("#app")
  if (!app) { transitioning = false; return }

  const oldChapter = app.querySelector<HTMLElement>(".chapter")

  // --- exit the old chapter ---
  if (oldChapter) {
    oldChapter.classList.add(`slide-exit-${direction}`)
  }

  // prepare the new chapter off-screen
  currentIndex = index
  const newHTML = renderChapter(currentIndex)

  // wait for exit to begin visually before inserting the new one
  await new Promise<void>((r) => setTimeout(r, 80))

  // insert new chapter
  const temp = document.createElement("div")
  temp.innerHTML = newHTML
  const newChapter = temp.firstElementChild as HTMLElement
  newChapter.classList.add(`slide-enter-${direction}`)
  app.appendChild(newChapter)

  // remove old chapter after its exit transition
  if (oldChapter) {
    const removeOld = () => oldChapter.remove()
    oldChapter.addEventListener("transitionend", removeOld, { once: true })
    setTimeout(removeOld, 600) // fallback
  }

  updateNav()

  // force reflow, then trigger enter transition
  newChapter.offsetHeight
  requestAnimationFrame(() => {
    newChapter.classList.remove(`slide-enter-${direction}`)
    newChapter.classList.add("slide-enter-active")

    // scroll to RTL start once the new chapter is in
    scrollToStart(app)

    // clean up transition class after it finishes
    const cleanup = () => {
      newChapter.classList.remove("slide-enter-active")
      transitioning = false
    }
    newChapter.addEventListener("transitionend", cleanup, { once: true })
    setTimeout(cleanup, 900) // fallback
  })
}

// --- swipe tracking ---

let touchStartY = 0

export function mountScroll() {
  updateNav()

  // nav button clicks
  document.querySelector("#nav-prev")?.addEventListener("click", () => {
    goToChapter(currentIndex - 1)
  })
  document.querySelector("#nav-next")?.addEventListener("click", () => {
    goToChapter(currentIndex + 1)
  })

  // keyboard: left/right arrows navigate chapters
  document.addEventListener("keydown", (e) => {
    // suppress navigation while encounter is active
    if (document.body.classList.contains("encounter-active")) return

    if (e.key === "ArrowRight") goToChapter(currentIndex - 1) // right = earlier chapter (scroll direction)
    if (e.key === "ArrowLeft") goToChapter(currentIndex + 1)  // left = later chapter
    if (e.key === "ArrowUp") goToChapter(currentIndex - 1)
    if (e.key === "ArrowDown") goToChapter(currentIndex + 1)
  })

  // swipe: vertical swipe on the chapter body
  document.addEventListener("touchstart", (e) => {
    touchStartY = e.touches[0].clientY
  }, { passive: true })

  document.addEventListener("touchend", (e) => {
    // suppress navigation while encounter is active
    if (document.body.classList.contains("encounter-active")) return

    const dy = e.changedTouches[0].clientY - touchStartY
    if (Math.abs(dy) > SWIPE_THRESHOLD) {
      goToChapter(dy > 0 ? currentIndex - 1 : currentIndex + 1)
    }
  }, { passive: true })
}
