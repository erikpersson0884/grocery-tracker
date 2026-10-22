// Parses the text of a Willys self-scan receipt. Card/loyalty numbers are never read or stored.
export interface ParsedItem { rawName: string; qty: number; unitPrice: number; netTotal: number }
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

const RE_DISCOUNT = new RegExp(`^\\d+\\s*\\*\\s*Rabatt:?.*?\\s(${AMT})$`, 'i')
const RE_WEIGHT = new RegExp(`^(.+?)\\s+(\\d+[.,]\\d+)\\s*kg\\s*\\*\\s*(${AMT})\\s+(${AMT})$`, 'i')
const RE_MULTI = new RegExp(`^(.+?)\\s+(\\d+)\\s*st\\s*\\*\\s*(${AMT})\\s+(${AMT})$`, 'i')
const RE_SIMPLE = new RegExp(`^(.+?)\\s+(${AMT})$`)

export function parseWillys(lines: string[]): ParsedReceipt {
  const warnings: string[] = []
  const start = lines.findIndex(l => /Start Självscanning/i.test(l))
  const end = lines.findIndex(l => /Slut Självscanning/i.test(l))
  if (start < 0 || end < 0) throw new Error('This does not look like a Willys self-scan receipt.')

  const items: ParsedItem[] = []
  for (const line of lines.slice(start + 1, end)) {
    let m: RegExpMatchArray | null
    if ((m = line.match(RE_DISCOUNT))) {
      const prev = items[items.length - 1]
      if (prev) prev.netTotal += toOre(m[1])
      else warnings.push(`Discount without an item: "${line}"`)
    } else if ((m = line.match(RE_WEIGHT))) {
      items.push({ rawName: m[1].trim(), qty: 1, unitPrice: toOre(m[3]), netTotal: toOre(m[4]) })
    } else if ((m = line.match(RE_MULTI))) {
      items.push({ rawName: m[1].trim(), qty: parseInt(m[2], 10), unitPrice: toOre(m[3]), netTotal: toOre(m[4]) })
    } else if ((m = line.match(RE_SIMPLE))) {
      const p = toOre(m[2])
      items.push({ rawName: m[1].trim(), qty: 1, unitPrice: p, netTotal: p })
    } else {
      warnings.push(`Could not read line: "${line}"`)
    }
  }

  const text = lines.join('\n')
  const totalM = text.match(/Totalt\s+(\d[\d\s]*[.,]\d{2})\s*SEK/i)
  const countM = text.match(/Totalt\s+(\d+)\s+varor/i)
  const dateM = text.match(/(\d{4}-\d{2}-\d{2})\s+\d{2}:\d{2}/)
  const firstLine = lines.find(l => l.trim()) ?? ''

  if (!totalM) throw new Error('Could not find the receipt total.')
  if (!dateM) warnings.push('Could not find a purchase date; using today.')

  const total = toOre(totalM[1])
  const expectedCount = countM ? parseInt(countM[1], 10) : null
  const sum = items.reduce((s, i) => s + i.netTotal, 0)
  const count = items.reduce((s, i) => s + i.qty, 0)
  if (sum !== total) warnings.push(`Items add up to ${(sum / 100).toFixed(2)} but the receipt total is ${(total / 100).toFixed(2)}.`)
  if (expectedCount !== null && count !== expectedCount) warnings.push(`Found ${count} items but the receipt says ${expectedCount}.`)

  return {
    store: `Willys ${firstLine}`.trim(),
    purchasedAt: dateM ? dateM[1] : new Date().toISOString().slice(0, 10),
    total, expectedCount, items, warnings,
  }
}
