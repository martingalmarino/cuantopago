/** Minúsculas sin tildes; «+» se lee «plus» como en los alias del catálogo; el resto de los signos separa palabras. */
export function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\+/g, ' plus ')
    .replace(/[^a-z0-9ñ]+/g, ' ')
    .trim();
}

export function tokens(value: string): string[] {
  const text = normalize(value);
  return text ? text.split(' ') : [];
}

export const STOPWORDS = new Set([
  'a', 'al', 'algo', 'algun', 'alguna', 'algunas', 'alguno', 'algunos', 'ante', 'aca', 'ahi', 'asi', 'aun',
  'como', 'con', 'cual', 'cuales', 'de', 'del', 'desde', 'donde', 'dos', 'e', 'el', 'ella', 'ellos', 'en', 'entre',
  'era', 'es', 'esa', 'ese', 'eso', 'esta', 'este', 'esto', 'estan', 'estoy', 'fue', 'ha', 'hay', 'la', 'las', 'le',
  'les', 'lo', 'los', 'me', 'mi', 'mis', 'mucho', 'muy', 'ni', 'no', 'nos', 'o', 'otra', 'otro', 'para', 'pero',
  'poco', 'por', 'porque', 'puedo', 'que', 'quiero', 'se', 'sea', 'ser', 'si', 'sin', 'sobre', 'son', 'su', 'sus',
  'tambien', 'te', 'tengo', 'tiene', 'tienen', 'tu', 'tus', 'u', 'un', 'una', 'uno', 'unos', 'unas', 'y', 'ya', 'yo',
  'vos', 'decime', 'dame', 'saber', 'necesito', 'podes', 'podrias', 'queria', 'quisiera', 'favor', 'hola', 'gracias',
  'abonito', 'cuanto', 'cuanta', 'cuantos', 'cuantas', 'hoy', 'ahora', 'actual', 'argentina', 'ar',
  'funciona', 'funcionan', 'sirve', 'usar', 'uso', 'puede', 'pueden', 'hace', 'hacer', 'esta', 'estas',
]);

/** Plural simple: lo suficiente para que «planes» y «plan» o «anuncios» y «anuncio» coincidan. */
export function stem(token: string): string {
  if (token.length > 4 && token.endsWith('es')) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith('s')) return token.slice(0, -1);
  return token;
}

export function contentTokens(value: string): string[] {
  return tokens(value).filter((token) => !STOPWORDS.has(token)).map(stem);
}

export function levenshtein(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
      rowMin = Math.min(rowMin, current[j]);
    }
    if (rowMin > max) return max + 1;
    previous = current;
  }
  return previous[b.length];
}
