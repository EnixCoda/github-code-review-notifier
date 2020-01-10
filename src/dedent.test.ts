import { dedent } from './dedent'

test(`blank`, () => {
  expect(dedent``).toBe(``)
})

test(`spaces`, () => {
  expect(dedent`  `).toBe(`  `)
})

test(`single line with no spaces`, () => {
  expect(dedent`ok`).toBe(`ok`)
})

test(`single line with spaces`, () => {
  expect(dedent`    ok`).toBe(`    ok`)
})

test(`multi lines 1`, () => {
  expect(dedent`
  ok`).toBe(`
ok`)
})

test(`multi lines 2`, () => {
  expect(dedent`
  ok
    cool
  fine`).toBe(`
ok
  cool
fine`)
})

test(`real`, () => {
  const input = dedent`🔧 Please setup your GitHub projects with this webhook:
  ${'url'}

  Need help? Read the ${'link'} section.`

  const expected = `🔧 Please setup your GitHub projects with this webhook:
${'url'}

Need help? Read the ${'link'} section.`

  expect(input).toBe(expected)
})
