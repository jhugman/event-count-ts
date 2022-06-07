import { Count, Duration, Instant, Int, ErrorMessage, Option } from './types'
import { EventCountReducer, sum } from '../query/reducers'

/**
 * Contains the raw data to store, manipulate and query event counts for a single event and a single interval.
 *
 * `startInstant` is the beginning of the current interval. e.g. if the interval is a day, `startInstant` would be the immediately
 * previous midnight.
 *
 * The `buckets` array contain the event counts for successive intervals, with `bucket[0]` being the current
 * interval, and `bucket[i]` being the `i` interval durations in the past. e.g. if the interval is a day, `bucket[0]` would be the
 * event count of just today, from midnight until now. `bucket[1]` would be the events of the whole of yesterday.
 */
export class IntervalData {
    /**
     * This is the counts from the previous intervals. If the interval is `day`, the this might be the
     * counts from the previous full days e.g. 7 days.
     *
     * Everytime we an interval ticks by, we rotate the `buckets` array.
     *
     * `bucket[0]` does not represent a full day, but the current interval, from the beginning of the interval, i.e.
     * from `startInstant` to the current moment.
     */
    buckets: Array<Count> = []

    startInstant: Instant = 0

    static empty(numberBuckets: Int, startInstant: Instant): IntervalData {
        return new IntervalData(startInstant, new Array(numberBuckets).fill(0))
    }

    constructor(startInstant: Instant, buckets: Array<Count>) {
        this.startInstant = startInstant
        this.buckets = buckets
    }

    /**
     * Record an event
     * @param count
     */
    increment(count: Count) {
        this.buckets[0] += count
    }

    query(
        index: Int = 0,
        numBuckets: Int = 1,
        reducer: EventCountReducer = sum,
        initialValue = 0
    ): number {
        // If the index is -ve, treat it as the number from the end.
        if (index < 0) {
            index = this.buckets.length + index
        }
        // If the length is -ve, then work backwards from the index.
        if (numBuckets < 0) {
            index += numBuckets
            numBuckets *= -1
        }
        return this.buckets
            .slice(index, index + numBuckets)
            .reduce(reducer, initialValue)
    }

    /**
     * Rotate the buckets `n` times.
     *
     * This isn't true rotation, since we're zeroing out the newest buckets instead of overwriting
     * with the oldest ones.
     *
     * We'd almost certainly want to use something more efficient than successive pop/unshift in real life,
     * e.g. [reversal algorithm](https://dev.to/soorya54/array-rotation-by-reversal-algorithm-41b1); other optimizations:
     *  - do we really need to know the overflow?
     *  - zero out the whole array if `n > array.length`
     *
     * @param n
     * @returns
     */
    rotate(n: Int): Count {
        let overflow = 0

        for (let i = 0; i < n; i++) {
            overflow += this.buckets.pop() ?? 0
            this.buckets.unshift(0)
        }

        return overflow
    }

    /**
     * Move the starting instant of the current interval by `duration`.
     *
     * This, in conjunction with `rotate` is the heart of advancing to the
     * next interval.
     *
     * @param duration
     */
    incrementStartInstant(duration: Duration) {
        this.startInstant += duration
    }

    checkInvariant(): Option<ErrorMessage> {
        const negative = this.buckets.filter((x) => x < 0)
        if (negative.length > 0) {
            return `At least one bucket contained a negative count`
        }
    }
}
