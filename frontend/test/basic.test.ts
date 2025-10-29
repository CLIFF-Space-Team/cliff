// Globals API - no imports needed with globals: true

test('basic test', () => {
  expect(1 + 1).toBe(2)
})

test('environment test', () => {
  expect(typeof window).toBe('object')
  expect(typeof document).toBe('object')
})

describe('CLIFF System', () => {
  it('should have working test environment', () => {
    expect(true).toBe(true)
  })
})