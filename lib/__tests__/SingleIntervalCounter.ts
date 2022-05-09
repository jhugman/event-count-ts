import { SingleIntervalCounter } from '../SingleIntervalCounter'
import { IntervalConfig } from '../IntervalConfig'

// This is an interval that represents a second long bucket, with 60 buckets.
const config: IntervalConfig = { interval: 1000, numBuckets: 60, id: 'second' }
const now = Date.now()
const times = [0, 1, 10, 59, 60, 61, 62, 72].map((t) => t * 1000 + now)
const [t0, t1, t10, t59, t60, t61, t62, t72] = times

describe('SingleIntervalCounter', () => {
    it('increments running total and current count', () => {
        const counter = new SingleIntervalCounter(config, now)
        expect(counter.current).toBe(0)
        expect(counter.total).toBe(0)
        counter.increment()
        expect(counter.current).toBe(1)
        expect(counter.total).toBe(1)
    })

    it('advancing keeps track of running totals', () => {
        const counter = new SingleIntervalCounter(config, now)
        counter.increment(2)
        expect(counter.total).toBe(2) // +2 t0

        counter.maybeAdvance(t1, 0)
        counter.increment(2)
        expect(counter.total).toBe(4) // +2 t1

        counter.maybeAdvance(t10, 0)
        counter.increment(2)
        expect(counter.total).toBe(6) // +2 t10

        counter.maybeAdvance(t59, 0)
        counter.increment(2)
        expect(counter.total).toBe(8) // +2 t60

        counter.maybeAdvance(t60, 0)
        expect(counter.total).toBe(6) // -(+2 from t10)

        counter.maybeAdvance(t61, 0)
        expect(counter.total).toBe(4) // -(+2 from t1)

        counter.maybeAdvance(t62, 0)
        expect(counter.total).toBe(4)

        counter.maybeAdvance(t59 + 59 * 1000, 0)
        expect(counter.total).toBe(2) // not quite all gone

        counter.maybeAdvance(t59 + 60 * 1000, 0)
        expect(counter.total).toBe(0) // all gone
    })

    it('advancing keeps track of running totals, incrementing from overflows', () => {
        const counter = new SingleIntervalCounter(config, now)
        counter.increment(2)
        expect(counter.total).toBe(2) // +2 t0

        counter.maybeAdvance(t1, 2)
        expect(counter.total).toBe(4) // +2 t1

        counter.maybeAdvance(t10, 2)
        expect(counter.total).toBe(6) // +2 t10

        counter.maybeAdvance(t59, 2)
        expect(counter.total).toBe(8) // +2 t60

        counter.maybeAdvance(t60, 0)
        expect(counter.total).toBe(6) // -(+2 from t10)

        counter.maybeAdvance(t61, 0)
        expect(counter.total).toBe(4) // -(+2 from t1)

        counter.maybeAdvance(t62, 0)
        expect(counter.total).toBe(4)

        counter.maybeAdvance(t59 + 59 * 1000, 0)
        expect(counter.total).toBe(2) // not quite all gone

        counter.maybeAdvance(t59 + 60 * 1000, 0)
        expect(counter.total).toBe(0) // all gone
    })

    it('invariant is that the running total is the same as ', () => {
        const counter = new SingleIntervalCounter(config, now - 2000)
        expect(counter.checkInvariant()).toBeUndefined()
        counter.increment(2)

        for (let t of times) {
            counter.increment(2)
            expect(counter.current).toBe(4)

            counter.maybeAdvance(t, 2)
            expect(counter.checkInvariant()).toBeUndefined()
        }
    })
})
