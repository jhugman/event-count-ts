import { IntervalConfig } from '../IntervalConfig'
import { Instant } from '../IntervalCounter'
import { MultiIntervalCounter } from '../MultiIntervalCounter'
import { SimpleLastTickMap } from '../LastTickTimer'

const now = 1500000000
const ms = 1
const sec = 1000 * ms
const min = 60 * sec
const hr = 60 * min
const day = 24 * hr

function createTestTimes(now: Instant): Array<Instant> {
    return [1 * min + 1 * sec, 1 * hr + 1 * min, 1 * day + 1 * sec].map(
        (i) => i + now
    )
}

const configs: Array<IntervalConfig> = [
    {
        id: 'second',
        interval: 1 * sec,
    },
    {
        id: 'minute',
        interval: 1 * min,
    },
    {
        id: 'hour',
        interval: 1 * hr,
    },
    {
        id: 'day',
        interval: 1 * day,
    },
].map((config, index, array) => {
    const numBuckets =
        index < array.length - 1
            ? Math.floor(array[index + 1].interval / config.interval)
            : 5
    return { numBuckets, ...config }
})

describe('MultiIntervalCounter', () => {
    it('increments running total and current count', () => {
        const counter = new MultiIntervalCounter(
            now,
            configs,
            new SimpleLastTickMap()
        )

        counter.increment(1)

        expect(counter.query(1, 'minute')).toBe(1)
        expect(counter.query(1, 'hour')).toBe(1)
        expect(counter.query(1, 'day')).toBe(1)

        counter.maybeAdvance(now + 1 * min)

        expect(counter.query(1, 'minute')).toBe(0)
        expect(counter.query(1, 'hour')).toBe(1)
        expect(counter.query(1, 'day')).toBe(1)
    })

    it('increments running total and current count part II', () => {
        const counter = new MultiIntervalCounter(
            now,
            configs,
            new SimpleLastTickMap()
        )

        const threshold = 60
        for (let i = 1; i < threshold; i++) {
            counter.increment(1)
            expect(counter.query(1, 'minute', 0)).toBe(
                counter.query(1, 'hour', 0)
            )
            expect(counter.query(1, 'hour', 0)).toBe(counter.query(1, 'day', 0))
            counter.maybeAdvance(now + i * sec)
            expect(counter.checkInvariant()).toBeUndefined()
        }

        for (let i = threshold; i < 60 * 60; i++) {
            counter.increment(1)
            counter.maybeAdvance(now + i * sec)
            expect(counter.checkInvariant()).toBeUndefined()
            // console.log(`i = ${i}, count =`, counter.estimate('minute'))
            // expect(counter.query(1, 'minute', 0)).toBe(60)
            expect(counter.query(1, 'minute', 1)).toBe(60)
        }
    })

    function checkInvariant(now: Instant) {
        const times = createTestTimes(now)
        const counter = new MultiIntervalCounter(
            now,
            configs,
            new SimpleLastTickMap()
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
        const lastTickMap = new SimpleLastTickMap()
        checkInvariant(lastTickMap.getLastTick(now, 'day') - 1 * min)
    })

    it('invariant checks out after midnight', () => {
        const lastTickMap = new SimpleLastTickMap()
        checkInvariant(lastTickMap.getLastTick(now, 'day') + 1 * min)
    })
})
