import type { Category } from './types'

export const normalizeName = (s: string) => s.toUpperCase().replace(/\s+/g, ' ').trim()

// Names are matched as " NAME " so a leading/trailing space in a keyword means "whole word".
// Categories are checked top to bottom and the first match wins, so the order matters.
const KEYWORDS: [Category, string[]][] = [
  ['Household', ['KASSE', 'PÅSE', 'DISK', 'TVÄTT', 'SKÖLJ', 'TOALETT', 'HUSHÅLL', 'SCHAMPO', 'BALSAM', 'TVÅL', 'TANDKRÄM', 'TANDBORSTE', 'BATTERI', ' LJUS', 'TÄNDSTICK', 'FOLIE', 'BAKPAPPER', 'DEODORANT', 'RENGÖR', 'LUFTFÖRFRISK', 'SPRAY', 'GRILLKOL', 'GRILLBRIKETT', 'GRILLPINNAR', 'TÄNDARE', 'TALLRIK']],
  ['Frozen', ['FRYS', 'POMMES', 'PIZZA', 'GLASS', 'GRATÄNG', 'FRIES', ' GB ', 'SINGOALLA', ' VANILJ 1.5L']],
  ['Drinks', ['FANTA', 'COCA', ' COLA', 'PEPSI', 'SPRITE', 'LÄSK', 'JUICE', 'VATTEN ', 'MINERAL', 'HYDRATE', 'ENERGY', 'MONSTER', 'NOCCO', 'LEMONAD', ' SAFT', 'KAFFE', ' TE ', ' THE ', 'DRYCK', ' ÖL ', ' VIN ', 'CIDER', 'PRIPPS', 'SMOOTHIE', 'PANT ', 'CHAI', 'MELLANROST', 'BOY ORIGINAL']],
  ['Snacks & Sweets', ['CHIPS', 'NACHO', 'POPCORN', 'GODIS', 'CHOKLAD', 'KEX', 'SALTINER', ' TUC ', 'LAKRITS', 'PASTILL', 'KARAMELL', 'MARABOU', 'DAIM', 'NÖTTER', 'CASHEW', 'MANDEL', 'SALTA ', 'CHEESE DOODLES', 'OSTBÅGAR', 'MICROPOP', 'SOURC']],
  ['Sauces & Pantry', ['SÅS', 'SAUCE', 'KETCHUP', 'SENAP', 'MAJONNÄS', 'DRESSING', 'MARMELAD', 'SYLT', 'HONUNG', 'SIRAP', 'OLIV', 'ANTIPASTO', 'KIKÄRT', 'BÖNOR', 'LINSER', 'MAJSKORN', 'PASTA', 'MACARONI', 'MANICHE', 'MEZZE', 'FUSILLI', 'PENNE', 'NUDLAR', ' RIS ', 'MATIRIS', 'JASMINRIS', 'COUSCOUS', 'HAVREGRYN', 'MÜSLI', 'KROSSAD', 'PASSATA', 'TOMATPURE', 'BULJONG', 'KRYDDA', 'KRYDDOR', ' SALT ', 'PEPPAR', 'VINÄGER', 'OLJA', 'MJÖL ', 'SOCKER', 'BAKPULVER', 'JÄST', 'NUTELLA', 'JORDNÖTSSMÖR', 'KOKOSMJÖLK', 'KAVIAR', 'TONFISK', 'KONSERV', 'TORTILLA', 'TACOSKAL', 'SOJA', 'CHIAFRÖN', 'BEARNAISE', 'SALSA', 'MAYO', 'NOODLES', 'SPISKUMMIN', 'SRIRACHA', 'CAVIAR', 'ÄTTIK', 'PAD THAI']],
  ['Bakery', ['BRÖD', 'LIMPA', 'SURDEG', 'BAGUETTE', 'BULLE', 'KAKA', 'MUFFIN', 'TÅRTA', 'CROISSANT', 'SEMLA', ' PITA', 'NAAN', 'FRANSKA', 'LEVAIN']],
  ['Dairy', ['BAVARIA BLU', 'FRAICHE', 'MJÖLK', 'GOUDA', 'OST ', 'SMÖR', 'YOGHURT', 'YOGURT', 'GRÄDD', 'KVARG', 'CHEDDAR', 'BRIE', 'FETA', 'HALLOUMI', 'CAMEMBERT', 'PARMESAN', 'MOZZARELLA', 'BLÅMÖGEL', ' ÄGG', 'MARGARIN', 'KESELLA', 'CREME', 'FILMJÖLK', 'BECEL', 'HAVREMAT', 'VISP', 'GURT', 'RISIFRUTTI', 'TZATZIKI']],
  ['Meat & Veg-protein', ['FÄRS', 'KYCKLIN', 'KORV', 'BACON', 'SKINKA', 'SALAMI', 'CHORIZO', 'PROSCIUTTO', 'LEVERPOSTEJ', 'KÖTT', 'BIFF', 'FLÄSK', 'KALKON', 'LAMM', 'BURGARE', 'NUGGETS', 'LAX', 'FISK', 'RÄKOR', 'SILL', 'TOFU', 'QUORN', 'VEGO', 'TEMPEH', 'SEITAN', 'WURST', 'KABANOSS', 'KARRE', 'KARRÉ', 'FILET', 'FILÉ', 'SOUVLAKI', 'GRILLSPETT', 'PULLED', 'CHICKEN', 'CH*CKEN', ' VEG ']],
  ['Produce', ['GURKA', 'TOMAT', 'LÖK', 'AVOKADO', 'AVOCADO', 'SALLAD', 'SALAT', 'PAPRIKA', 'MOROT', 'MORÖT', 'POTATIS', 'BANAN', 'ÄPPLE', 'CITRON', 'LIME', 'BROCCOLI', 'BLOMKÅL', 'SVAMP', 'CHAMPINJON', 'SPENAT', 'KÅL', 'ZUCCHINI', 'SQUASH', 'AUBERGINE', 'MAJSKOLV', 'RÖDBETA', 'SELLERI', 'INGEFÄRA', 'CHILI', 'PERSILJA', 'KORIANDER', 'BASILIKA', 'DILL', 'RUCOLA', 'FRUKT', 'BÄR', 'JORDGUBB', 'HALLON', 'DRUV', 'APELSIN', 'MANDARIN', 'KLEMENTIN', 'MANGO', 'ANANAS', 'PÄRON', 'PERSIKA', 'MELON', 'KIWI', 'PLOMMON', 'KRYDDKRUKA', 'ÄRTER', 'SPROUTS', 'RÄDIS']],
]

export function guessCategory(rawName: string): Category {
  const n = ' ' + normalizeName(rawName) + ' '
  for (const [cat, words] of KEYWORDS) if (words.some(w => n.includes(w))) return cat
  return 'Other'
}

/** Saved user corrections beat keyword guesses. */
export function categorize(rawName: string, rules: Map<string, Category>): Category {
  return rules.get(normalizeName(rawName)) ?? guessCategory(rawName)
}