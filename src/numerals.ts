// classical Chinese numerals — 一 through 八十一
// the Tao Te Ching has 81 chapters, so this is sufficient

export function toChineseNumeral(n: number): string {
  const ones = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"]
  const tens = ["", "十", "二十", "三十", "四十", "五十", "六十", "七十", "八十"]
  if (n <= 10) return n === 10 ? "十" : ones[n]
  if (n < 20) return "十" + ones[n - 10]
  const t = Math.floor(n / 10)
  const o = n % 10
  return tens[t] + ones[o]
}
