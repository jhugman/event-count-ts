import { IntervalConfig } from './IntervalConfig'
import {
    Count,
    Instant,
    Int,
    IntervalCounter,
    OptionalErrorMessage,
} from './IntervalCounter'
import { EventCountReducer, sum } from './reducers'

class IntervalData {
    runningTotal: Count = 0
    buckets: Array<Count> = []
    lastTick: Instant = 0

    static empty(numberBuckets: Int, lastTick: Instant): IntervalData {
        return new IntervalData(lastTick, new Array(numberBuckets).fill(0))
    }

    constructor(lastTick: Instant, buckets: Array<Count>) {
        this.lastTick = lastTick
        this.buckets = buckets
        this.runningTotal = buckets.reduce((a, b) => a + b)
    }

    increment(count: Count) {
        this.buckets[0] += count
        this.runningTotal += count
    }

    query(
        index: Int = 0,
        numBuckets: Int = 1,
        reducer: EventCountReducer = sum
    ): number {
        if (index < 0) {
            index = this.buckets.length + index
        }
        if (numBuckets < 0) {
            index += numBuckets
            numBuckets *= -1
        }
        return this.buckets.slice(index, index + numBuckets).reduce(reducer, 0)
    }

    rotate(numRotations: Int, newCurrent: Count): Count {
        let overflow = 0
        for (let i = 0; i < numRotations; i++) {
            overflow += this.buckets.pop() ?? 0
            this.buckets.unshift(0)
        }

        this.runningTotal += newCurrent - overflow
        this.buckets[0] = newCurrent

        return overflow
    }

    checkInvariant(): OptionalErrorMessage {
        const expected = this.buckets.reduceRight((a, b) => a + b)
        const observed = this.runningTotal

        if (expected !== observed) {
            return `Expected the bucket total and runningTotal to be equal. ${expected} !== ${observed}`
        }
    }
}

export class SingleIntervalCounter implements IntervalCounter {
    private data: IntervalData
    private config: IntervalConfig

    public get current(): Count {
        return this.data.buckets[0]
    }

    public get total(): Count {
        return this.data.runningTotal
    }

    public get id(): string {
        return this.config.id
    }

    constructor(config: IntervalConfig, lastTick: Instant) {
        this.data = IntervalData.empty(config.numBuckets, lastTick)
        this.config = config
    }

    increment(count: Count = 1): void {
        this.data.increment(count)
    }

    maybeAdvance(now: Instant, newCurrrentBucket: Count = 0): Count | null {
        const numRollovers = this.numRollovers(now)

        if (numRollovers <= 0) {
            return null
        }

        this.data.lastTick += numRollovers * this.config.interval

        return this.data.rotate(numRollovers, newCurrrentBucket)
    }

    query(
        index: Int = 0,
        numBuckets: Int = 1,
        reducer: EventCountReducer = sum
    ): number {
        return this.data.query(index, numBuckets, reducer)
    }

    private numRollovers(now: Instant): Int {
        return Math.floor((now - this.data.lastTick) / this.config.interval)
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
