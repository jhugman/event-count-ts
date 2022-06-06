import { Count, Instant, Int, OptionalErrorMessage } from './IntervalCounter'
import { EventCountReducer, sum } from './reducers'

export class IntervalData {
    /**
     * This is the counts from the previous intervals. If the interval is `day`, the this might be the
     * counts from the previous full days e.g. 7 days.
     *
     * Everytime we an interval ticks by, we rotate the `buckets` array.
     *
     * `bucket[0]` does not represent a full day, but the current interval, from the beginning of the interval, i.e.
     * from `lastTick` to the current moment.
     */
    buckets: Array<Count> = []

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
    }

    increment(count: Count) {
        this.buckets[0] += count
    }

    query(
        index: Int = 0,
        numBuckets: Int = 1,
        reducer: EventCountReducer = sum,
        initialValue = 0
    ): number {
        if (index < 0) {
            index = this.buckets.length + index
        }
        if (numBuckets < 0) {
            index += numBuckets
            numBuckets *= -1
        }
        // console.log(
        //     `slice ${index} to ${index + numBuckets}`,
        //     this.buckets.slice(index, index + numBuckets)
        // )
        return this.buckets
            .slice(index, index + numBuckets)
            .reduce(reducer, initialValue)
    }

    rotate(numRotations: Int, postRolloverEstimate: Count): Count {
        let overflow = 0

        for (let i = 0; i < numRotations; i++) {
            overflow += this.buckets.pop() ?? 0
            this.buckets.unshift(0)
        }
        this.buckets[0] = postRolloverEstimate

        return overflow
    }

    checkInvariant(): OptionalErrorMessage {
        const negative = this.buckets.filter((x) => x < 0)
        if (negative.length > 0) {
            return `At least one bucket contained a negative count`
        }
    }
}
