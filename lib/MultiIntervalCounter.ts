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
        let p: Option<SingleIntervalCounter> = undefined
        for (let c of this.counters.values()) {
            if (p == undefined) {
                c.maybeAdvance(now, 0)
            } else {
                const latestEstimate = p.total
                if (c.maybeAdvance(now, latestEstimate) === undefined) {
                    c.updateEstimate(latestEstimate)
                }
            }
            p = c
        }

        return p?.total
    }

    estimate(id: string): Count {
        return this.counters.get(id)?.estimate ?? 0
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
        reducer: EventCountReducer = sum
    ): number | undefined {
        const counter = this.counters.get(id)
        return counter?.query(fromIndex, numBuckets, reducer)
    }

    checkInvariant(): OptionalErrorMessage {
        for (let c of this.counters.values()) {
            const err = c.checkInvariant()
            if (err) {
                return err
            }
        }
        const counters = [...this.counters.values()]
        for (let i = 0; i < counters.length - 1; i++) {
            const c0 = counters[i]
            const c1 = counters[i + 1]

            // This invariant might not be desirable, as it needs quite a lot of machinery
            // which may not turn out to be useful.
            const expected = c0.total
            const observed = c1.estimate
            if (observed !== expected) {
                return `Running total count for ${c0.id} isn't current count for ${c1.id} ${expected} !== ${observed} `
            }
        }
    }
}
