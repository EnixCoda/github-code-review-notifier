export function dedent(stripes: TemplateStringsArray, ...exps: string[]): string {
  const merged = []
  let i = 0
  while (i < exps.length) {
    merged.push(stripes[i])
    merged.push(exps[i])
    i += 1
  }
  while (i < stripes.length) {
    merged.push(stripes[i])
    i += 1
  }
  return dedentCore(merged.join(''))
}

export function dedentCore(raw: string): string {
  const leadingSpacesRegex = /(\n +(?=[^ ]))/g
  const match = raw.match(leadingSpacesRegex)
  const min = match ? match.reduce((min, stripe) => Math.min(min, stripe.length - 1), Infinity) : 0

  return raw.replace(new RegExp(`(^|\n)( {${min}})( *)(?=[^ ])`, 'g'), '$1$3')
}
