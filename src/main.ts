// 道德經 — tao reader
// a scroll. one chapter at a time. one character at a time.

import "./style.css"
import { renderChapter } from "./render.ts"
import { handleCharTouch } from "./encounter.ts"
import { mountScroll, scrollToStart } from "./scroll.ts"

// --- mount ---

const app = document.querySelector<HTMLDivElement>("#app")!
app.setAttribute("role", "main")
app.innerHTML = renderChapter(0)

// start at the rightmost column — line 1 of the classical text
scrollToStart(app)

// delegate all character touches through the app container
app.addEventListener("click", (e) => {
  const charEl = (e.target as HTMLElement).closest(".char") as HTMLElement | null
  if (charEl) handleCharTouch(charEl)
})

mountScroll()
