import { IntervalConfig } from './IntervalConfig'
import {
    Count,
    Instant,
    Int,
    IntervalCounter,
    OptionalErrorMessage,
    Option,
} from './IntervalCounter'
import { IntervalData } from './IntervalData'
import { EventCountReducer, sum } from './reducers'

export class SingleIntervalCounter implements IntervalCounter {
    private data: IntervalData
    private config: IntervalConfig

    constructor(config: IntervalConfig, lastTick: Instant) {
        this.data = IntervalData.empty(config.numBuckets, lastTick)
        this.config = config
    }

    increment(count: number): void {
        this.data.increment(count)
    }
    maybeAdvance(now: Instant, rolledOverEstimate: Count = 0): Option<Count> {
        const numRollovers = this.numRollovers(now)

        if (numRollovers <= 0) {
            return
        }

        this.data.lastTick += numRollovers * this.config.interval

        return this.data.rotate(numRollovers, rolledOverEstimate)
    }

    private numRollovers(now: Instant): Int {
        return Math.floor((now - this.data.lastTick) / this.config.interval)
    }

    query(
        index: Int = 0,
        numBuckets: Int = 1,
        reducer: EventCountReducer = sum,
        initialValue = 0
    ): number {
        return this.data.query(index, numBuckets, reducer)
    }

    checkInvariant(): OptionalErrorMessage {
        const observed = this.data.buckets.length
        const expected = this.config.numBuckets
        if (observed !== expected) {
            return `Expected number of buckets to be ${expected}, but found ${observed}`
        }
        return this.data.checkInvariant()
    }
}
