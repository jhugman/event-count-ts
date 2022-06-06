import { IntervalConfig } from './IntervalConfig'
import {
    Count,
    Instant,
    Int,
    IntervalCounter,
    OptionalErrorMessage,
    Option,
} from './IntervalCounter'
import { EventCountReducer, sum } from './reducers'

class IntervalData {

    /**
     * This is the counts from the previous intervals. If the interval is `day`, the this might be the
     * counts from the previous full days e.g. 7 days.
     *
     * Everytime we an interval ticks by, we rotate the `buckets` array.
     *
     * `bucket[0]` is an _estimate_ on this current interval, based upon the smaller interval counters e.g. 24 hours. i.e. it should be
     * the count of events that happened in the **last 24 hours**. Contrast this with `actualCount`.
     *
     * It's unclear if this difference between the **last 24 hours** and **today** is actually helpful, and adds lots of unnecessary machinery
     * when the difference is expressable in a query interface.
     */
    buckets: Array<Count> = []

    /**
     * This is the running total of `buckets`.
     */
    runningTotal: Count = 0
    lastTick: Instant = 0

    /**
     * This is a counter of the number of events that happened in this current interval.
     * If the interval is `day`, then this would be number of events that happened **today**.
     */
    actualCount: Count = 0

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
        this.actualCount += count
    }

    updateEstimate(estimate: Count) {
        const prev = this.buckets[0]
        this.buckets[0] = estimate
        this.runningTotal += estimate - prev
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

    rotate(numRotations: Int, postRolloverEstimate: Count): Count {
        let overflow = 0
        const preRolloverEstimate = this.buckets[0]
        const prevRunningTotal = this.runningTotal
        const actualBucketCount = this.actualCount
        this.buckets[0] = actualBucketCount

        for (let i = 0; i < numRotations; i++) {
            overflow += this.buckets.pop() ?? 0
            this.buckets.unshift(0)
        }

        // Before the rotations, we remove the estimate, and replace it with the actual.
        this.runningTotal +=
            actualBucketCount -
            preRolloverEstimate +
            // then after the rotations, we remove the oldest actual measurements (i.e. the overflow),
            // and add the newest rolling total from a more granular estimate.
            postRolloverEstimate -
            overflow

        // console.table({
        //     actualBucketCount,
        //     preRolloverEstimate,
        //     postRolloverEstimate,
        //     overflow,
        //     prevRunningTotal,
        //     newRunningTotal: this.runningTotal,
        // })
        this.buckets[0] = postRolloverEstimate
        this.actualCount = 0

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

    /**
     * This property is the count of events that occurred in the previous interval up until this moment.
     */
    public get estimate(): Count {
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

    updateEstimate(estimate: Count) {
        this.data.updateEstimate(estimate)
    }

    maybeAdvance(now: Instant, rolledOverEstimate: Count = 0): Option<Count> {
        const numRollovers = this.numRollovers(now)

        if (numRollovers <= 0) {
            return
        }

        this.data.lastTick += numRollovers * this.config.interval

        return this.data.rotate(numRollovers, rolledOverEstimate)
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
