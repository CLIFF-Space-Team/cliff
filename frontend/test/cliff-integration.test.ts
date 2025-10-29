test('CLIFF Integration - basic test', () => {
  expect(1 + 1).toBe(2)
})

test('CLIFF Integration - environment test', () => {
  expect(typeof window).toBe('object')
})

describe('CLIFF System', () => {
  it('should work with globals', () => {
    expect(typeof vi).toBe('object')
  })
})