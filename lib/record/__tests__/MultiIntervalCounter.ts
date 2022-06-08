import { Instant } from '../types'
import { MultiIntervalCounter } from '../MultiIntervalCounter'
import { SimpleStartInstantCalculator } from '../startInstant'
import { minute, second, hour, day, testIntervals } from '../intervals'

const startInstantCalculator = new SimpleStartInstantCalculator()
// We calculate `now` as being at the beginning of the minute, because it makes the tests
// deterministic.
const now = startInstantCalculator.calculateStartInstantBefore(
    new Date().getTime(),
    'minute'
)
function createTestTimes(now: Instant): Array<Instant> {
    return [
        1 * minute + 1 * second,
        1 * hour + 1 * minute,
        1 * day + 1 * second,
    ].map((i) => i + now)
}

describe('MultiIntervalCounter', () => {
    it('increments running total and current count', () => {
        const counter = new MultiIntervalCounter(
            now,
            testIntervals,
            startInstantCalculator
        )

        counter.increment(1)

        expect(counter.query(1, 'minute')).toBe(1)
        expect(counter.query(1, 'hour')).toBe(1)
        expect(counter.query(1, 'day')).toBe(1)

        counter.maybeAdvance(now + 1 * minute)

        expect(counter.query(1, 'minute')).toBe(0)
        expect(counter.query(1, 'hour')).toBe(1)
        expect(counter.query(1, 'day')).toBe(1)
    })

    it('increments and supports querying', () => {
        const counter = new MultiIntervalCounter(
            now,
            testIntervals,
            startInstantCalculator
        )

        const threshold = 60
        for (let i = 1; i < threshold; i++) {
            counter.increment(1)
            expect(counter.query(1, 'minute', 0)).toBe(
                counter.query(1, 'hour', 0)
            )
            expect(counter.query(1, 'hour', 0)).toBe(counter.query(1, 'day', 0))
            counter.maybeAdvance(now + i * second)
            expect(counter.checkInvariant()).toBeUndefined()
        }

        counter.increment(1)
        for (let i = threshold; i < 60 * 60; i++) {
            counter.maybeAdvance(now + i * second)
            counter.increment(1)
            expect(counter.checkInvariant()).toBeUndefined()

            // previous minute
            expect(counter.query(1, 'minute', 1)).toBe(60)
            // current minute
            expect(counter.query(1, 'minute', 0)).toBe((i % 60) + 1)
            // in the last 60 seconds
            expect(counter.query(60, 'second', 0)).toBe(60)
        }
    })

    function checkInvariant(now: Instant) {
        const times = createTestTimes(now)
        const counter = new MultiIntervalCounter(
            now,
            testIntervals,
            startInstantCalculator
        )

        expect(counter.checkInvariant()).toBeUndefined()
        counter.maybeAdvance(now)
        expect(counter.checkInvariant()).toBeUndefined()

        for (let t of times) {
            counter.increment(10)
            expect(counter.checkInvariant()).toBeUndefined()
            counter.maybeAdvance(t)
            expect(counter.checkInvariant()).toBeUndefined()
        }
        counter.increment()
    }

    it('invariants checks out', () => {
        checkInvariant(now)
    })

    it('invariant checks out before midnight', () => {
        checkInvariant(
            startInstantCalculator.calculateStartInstantBefore(now, 'day') -
                1 * minute
        )
    })

    it('invariant checks out after midnight', () => {
        checkInvariant(
            startInstantCalculator.calculateStartInstantBefore(now, 'day') +
                1 * minute
        )
    })
})
