import { IntervalConfig } from './IntervalConfig'
import { IntervalCounter } from './IntervalCounter'
import { Count, Instant, Int, Option, ErrorMessage } from './types'
import { SingleIntervalCounter } from './SingleIntervalCounter'

import { sum, EventCountReducer } from '../query/reducers'
import {
    SimpleStartInstantCalculator,
    StartInstantCalculator,
} from './startInstant'

/**
 * Single event, multiple interval granularity event counter.
 */
export class MultiIntervalCounter {
    private counters: Map<string, SingleIntervalCounter>
    constructor(
        now: Instant,
        configs: Array<IntervalConfig>,
        timer: StartInstantCalculator = new SimpleStartInstantCalculator()
    ) {
        this.counters = new Map(
            configs
                .filter((c) => timer.supports(c.id))
                .map((c) => [
                    c.id,
                    new SingleIntervalCounter(
                        c,
                        timer.calculateStartInstantBefore(now, c.id)
                    ),
                ])
        )
    }

    increment(count: Count = 1): void {
        this.counters.forEach((v, _k, _map) => v.increment(count))
    }

    maybeAdvance(now: Instant) {
        this.counters.forEach((v, _k, _map) => v.maybeAdvance(now))
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

    checkInvariant(): Option<ErrorMessage> {
        for (let c of this.counters.values()) {
            const err = c.checkInvariant()
            if (err) {
                return err
            }
        }
    }
}
