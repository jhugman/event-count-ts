import { IntervalConfig } from './IntervalConfig'
import { IntervalCounter } from './IntervalCounter'
import { Count, Instant, Int, ErrorMessage, Option } from './types'
import { IntervalData } from './IntervalData'
import { EventCountReducer, sum } from '../query/reducers'

/**
 * Accumulate event counts of a single event type for a single granularity of interval— e.g. a minute—
 * and the previous _n_ intervals into the past— e.g. 60 minutes.
 *
 * It's parameterized by an `IntervalConfig` object, and the data is stored in an
 * `IntervalData`. This allows for re-use of the config, and serialization of the data.
 *
 *  A tiny query interface is given, which is no more than a slice and reduce.
 */
export class SingleIntervalCounter implements IntervalCounter {
    private data: IntervalData
    private config: IntervalConfig

    constructor(config: IntervalConfig, startInstant: Instant) {
        this.data = IntervalData.empty(config.numBuckets, startInstant)
        this.config = config
    }

    increment(count: number): void {
        this.data.increment(count)
    }

    /**
     * Check if the interval is finished. If it has, then we should rotate the buckets.
     *
     * The oldest buckets drop off at the end, and the newest buckets are zeroes.
     *
     * @param now
     * @returns if a rotation happens, return the overflow.
     */
    maybeAdvance(now: Instant): Option<Count> {
        const numRollovers = this.numRollovers(now)

        if (numRollovers <= 0) {
            return
        }

        this.data.incrementStartInstant(
            numRollovers * this.config.intervalDuration
        )

        return this.data.rotate(numRollovers)
    }

    private numRollovers(now: Instant): Int {
        return Math.floor(
            (now - this.data.startInstant) / this.config.intervalDuration
        )
    }

    query(
        index: Int = 0,
        numBuckets: Int = 1,
        reducer: EventCountReducer = sum,
        initialValue = 0
    ): number {
        return this.data.query(index, numBuckets, reducer, initialValue)
    }

    checkInvariant(): Option<ErrorMessage> {
        const observed = this.data.buckets.length
        const expected = this.config.numBuckets
        if (observed !== expected) {
            return `Expected number of buckets to be ${expected}, but found ${observed}`
        }
        return this.data.checkInvariant()
    }
}
