// Parses the text of a Willys receipt (self-scan and self-checkout layouts).
// Card/loyalty numbers are never read or stored.
export interface ParsedItem { rawName: string; qty: number; unitPrice: number; netTotal: number; deposit?: boolean }
export interface ParsedReceipt {
  store: string
  purchasedAt: string
  total: number
  expectedCount: number | null
  items: ParsedItem[]
  warnings: string[]
}

const toOre = (s: string) => Math.round(parseFloat(s.replace(/\s/g, '').replace(',', '.')) * 100)
const AMT = '-?\\d+[.,]\\d{2}'
const PERKG = '\\s*(?:kr\\s*/\\s*kg)?'

// Any line ending in a negative amount is a discount ("Rab:", "Rabatt:", "2 * Rab:", "W Plus:" ...)
const RE_DISCOUNT = new RegExp(`\\s(-\\d+[.,]\\d{2})$`)
const RE_PANT = new RegExp(`^\\+?\\s*PANT\\b.*?\\s(${AMT})$`, 'i')
// Weighed item with the name on the previous line: "0,635kg*89,90kr/kg 57,09"
const RE_WEIGHT_ONLY = new RegExp(`^(\\d+[.,]\\d+)\\s*kg\\s*\\*\\s*(${AMT})${PERKG}\\s+(${AMT})$`, 'i')
// Weighed item with the name on the same line
const RE_WEIGHT = new RegExp(`^(.+?)\\s+(\\d+[.,]\\d+)\\s*kg\\s*\\*\\s*(${AMT})${PERKG}\\s+(${AMT})$`, 'i')
const RE_MULTI = new RegExp(`^(.+?)\\s+(\\d+)\\s*st\\s*\\*\\s*(${AMT})\\s+(${AMT})$`, 'i')
const RE_SIMPLE = new RegExp(`^(.+?)\\s+(${AMT})$`)
const RE_ENDS_WITH_AMOUNT = new RegExp(`${AMT}$`)

export function parseWillys(lines: string[]): ParsedReceipt {
  const warnings: string[] = []

  // Items sit between the first dashed line and the "Totalt N varor" line.
  const totIdx = lines.findIndex(l => /^Totalt\s+\d+\s+var(?:a|or)\b/i.test(l))
  const firstDash = lines.findIndex(l => /^-{5,}$/.test(l))
  if (totIdx < 0 || firstDash < 0 || firstDash >= totIdx)
    throw new Error('This does not look like a Willys receipt.')
  const body = lines
    .slice(firstDash + 1, totIdx)
    .filter(l => !/^[-=]{5,}$/.test(l) && !/Självscanning/i.test(l))

  const items: ParsedItem[] = []
  let pending: string | null = null // item name waiting for its weight line

  for (const line of body) {
    let m: RegExpMatchArray | null
    if ((m = line.match(RE_PANT))) {
      const p = toOre(m[1])
      items.push({ rawName: line.slice(0, line.length - m[1].length).trim(), qty: 1, unitPrice: p, netTotal: p, deposit: true })
      pending = null
    } else if ((m = line.match(RE_DISCOUNT))) {
      const prev = [...items].reverse().find(i => !i.deposit) // applies to the item above it
      if (prev) prev.netTotal += toOre(m[1])
      else warnings.push(`Discount without an item: "${line}"`)
      pending = null
    } else if ((m = line.match(RE_WEIGHT_ONLY))) {
      if (!pending) warnings.push(`Weighed item without a name: "${line}"`)
      items.push({ rawName: pending ?? 'Weighed item', qty: 1, unitPrice: toOre(m[2]), netTotal: toOre(m[3]) })
      pending = null
    } else if ((m = line.match(RE_WEIGHT))) {
      items.push({ rawName: m[1].trim(), qty: 1, unitPrice: toOre(m[3]), netTotal: toOre(m[4]) })
      pending = null
    } else if ((m = line.match(RE_MULTI))) {
      items.push({ rawName: m[1].trim(), qty: parseInt(m[2], 10), unitPrice: toOre(m[3]), netTotal: toOre(m[4]) })
      pending = null
    } else if ((m = line.match(RE_SIMPLE))) {
      const p = toOre(m[2])
      items.push({ rawName: m[1].trim(), qty: 1, unitPrice: p, netTotal: p })
      pending = null
    } else if (!RE_ENDS_WITH_AMOUNT.test(line)) {
      pending = line.trim() // a name on its own line, price follows on the next line
    } else {
      warnings.push(`Could not read line: "${line}"`)
    }
  }
  if (pending) warnings.push(`Item without a price: "${pending}"`)

  const text = lines.join('\n')
  const totalM = text.match(/Totalt\s+(\d[\d\s]*[.,]\d{2})\s*SEK/i)
  const countM = text.match(/Totalt\s+(\d+)\s+var(?:a|or)\b/i)
  const dateM = text.match(/(\d{4}-\d{2}-\d{2})\s+\d{2}:\d{2}/)
  const firstLine = lines.find(l => l.trim()) ?? ''

  if (!totalM) throw new Error('Could not find the receipt total.')
  if (!dateM) warnings.push('Could not find a purchase date; using today.')

  const total = toOre(totalM[1])
  const expectedCount = countM ? parseInt(countM[1], 10) : null
  const sum = items.reduce((s, i) => s + i.netTotal, 0)
  const count = items.filter(i => !i.deposit).reduce((s, i) => s + i.qty, 0) // deposits aren't counted
  if (sum !== total) warnings.push(`Items add up to ${(sum / 100).toFixed(2)} but the receipt total is ${(total / 100).toFixed(2)}.`)
  if (expectedCount !== null && count !== expectedCount) warnings.push(`Found ${count} items but the receipt says ${expectedCount}.`)

  return {
    store: `Willys ${firstLine}`.trim(),
    purchasedAt: dateM ? dateM[1] : new Date().toISOString().slice(0, 10),
    total, expectedCount, items, warnings,
  }
}