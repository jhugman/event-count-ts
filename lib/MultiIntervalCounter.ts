import { IntervalConfig } from './IntervalConfig'
import {
    Count,
    Instant,
    Int,
    IntervalCounter,
    Option,
    OptionalErrorMessage,
} from './IntervalCounter'
import { SingleIntervalCounter } from './SingleIntervalCounter'

import { sum, EventCountReducer } from './reducers'
import { LastTickMap } from './LastTickTimer'

export class MultiIntervalCounter implements IntervalCounter {
    private counters: Map<string, SingleIntervalCounter>
    constructor(
        now: Instant,
        configs: Array<IntervalConfig>,
        lastTicks: LastTickMap
    ) {
        this.counters = new Map(
            configs
                .filter((c) => lastTicks.has(c.id))
                .map((c) => [
                    c.id,
                    new SingleIntervalCounter(
                        c,
                        lastTicks.getLastTick(now, c.id)
                    ),
                ])
        )
    }

    increment(count: Count = 1): void {
        this.counters.forEach((v, _k, _map) => v.increment(count))
    }

    maybeAdvance(now: Instant, _: Count = 0): Option<Count> {
        this.counters.forEach((v, _k, _map) => v.maybeAdvance(now))
        return
    }

    /**
     *
     * @param numBuckets
     * @param id the counter id, e.g. `minute`, `hour`, `day`.
     * @param fromIndex the starting bucket. The default is 0, i.e. the most recent bucket.
     * @param reducer
     * @returns
     */
    query(
        numBuckets: Int = 1,
        id: string,
        fromIndex: Int = 0,
        reducer: EventCountReducer = sum,
        initialValue = 0
    ): number | undefined {
        const counter = this.counters.get(id)

        if (!counter) {
            throw new Error(`Problem with ${id} counter`)
        }
        return counter.query(fromIndex, numBuckets, reducer, initialValue)
    }

    checkInvariant(): OptionalErrorMessage {
        for (let c of this.counters.values()) {
            const err = c.checkInvariant()
            if (err) {
                return err
            }
        }
    }
}
