import { invalidInput, operationFailed } from '../../src/errors.mjs'

export const createBeatRecorder = (expectedBeats, clock = () => performance.now()) => {
  if (
    !Array.isArray(expectedBeats) ||
    expectedBeats.length === 0 ||
    expectedBeats.some((beat) => typeof beat !== 'string' || beat.trim() === '') ||
    new Set(expectedBeats).size !== expectedBeats.length
  ) {
    throw invalidInput('expectedBeats must be a non-empty array of unique strings')
  }

  const startedAt = clock()
  const events = []

  const mark = (beat) => {
    const expected = expectedBeats[events.length]
    if (beat !== expected) throw operationFailed(`Expected beat ${expected ?? '<complete>'}, received ${beat}`)
    const event = { beat, atMs: Math.max(0, Math.round(clock() - startedAt)) }
    events.push(event)
    return event
  }

  const audit = () => {
    if (events.length !== expectedBeats.length) {
      throw operationFailed(`Missing beats: ${expectedBeats.slice(events.length).join(', ')}`)
    }
    return events.map((event) => ({ ...event }))
  }

  return { audit, events, mark }
}
