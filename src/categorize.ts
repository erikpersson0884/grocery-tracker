import type { Category } from './types'

export const normalizeName = (s: string) => s.toUpperCase().replace(/\s+/g, ' ').trim()

// First match wins, so put specific keywords before general ones.
const KEYWORDS: [Category, string[]][] = [
  ['Sauces & Pantry', ['SÅS', 'KETCHUP', 'SENAP', 'MAJSKORN', 'BÖNOR', 'LINSER', 'PASTA', 'RIS ', 'MJÖL', 'SOCKER', 'OLJA', 'KROSSAD', 'BULJONG', 'KRYDDA', 'TORTILLA', 'SPAGHETTI', 'KONSERV']],
  ['Meat & Veg-protein', ['FÄRS', 'KYCKLING', 'KORV', 'BACON', 'SKINKA', 'LAX', 'FISK', 'TOFU', 'QUORN', 'VEGO', 'BIFF', 'FLÄSK', 'RÄKOR']],
  ['Dairy', ['FRAICHE', 'MJÖLK', 'GOUDA', 'OST ', 'SMÖR', 'YOGHURT', 'FILMJÖLK', 'GRÄDDE', 'KVARG', 'CHEDDAR', 'ÄGG', 'CREME', 'MOZZARELLA']],
  ['Snacks & Sweets', ['CHIPS', 'NACHO', 'GODIS', 'CHOKLAD', 'KEX', 'GLASS', 'POPCORN', 'NÖTTER']],
  ['Bakery', ['KLADDKAKA', 'BRÖD', 'BULLE', 'KAKA', 'LIMPA', 'BAGUETTE', 'MUFFIN', 'TÅRTA']],
  ['Frozen', ['FRYS', 'DJUPFRYS', 'PIZZA']],
  ['Drinks', ['JUICE', 'LÄSK', 'VATTEN', 'ÖL ', 'VIN ', 'KAFFE', 'TE ', 'SAFT', 'DRYCK', 'COLA']],
  ['Household', ['DISK', 'TVÄTT', 'TOALETT', 'PAPPER', 'PÅSE', 'SCHAMPO', 'TVÅL', 'TANDKRÄM', 'BATTERI']],
  ['Produce', ['GURKA', 'TOMAT', 'LÖK', 'AVOKADO', 'SALLAD', 'PAPRIKA', 'MORÖT', 'POTATIS', 'BANAN', 'ÄPPLE', 'CITRON', 'LIME', 'BROCCOLI', 'SVAMP', 'CHAMPINJON', 'VITLÖK', 'SPENAT', 'FRUKT', 'BÄR', 'KÅL', 'ZUCCHINI', 'PERSILJA', 'KORIANDER']],
]

export function guessCategory(rawName: string): Category {
  const n = normalizeName(rawName) + ' '
  for (const [cat, words] of KEYWORDS) if (words.some(w => n.includes(w))) return cat
  return 'Other'
}

/** Saved user corrections beat keyword guesses. */
export function categorize(rawName: string, rules: Map<string, Category>): Category {
  return rules.get(normalizeName(rawName)) ?? guessCategory(rawName)
}
