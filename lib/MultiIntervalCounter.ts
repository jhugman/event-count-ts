import { IntervalConfig } from './IntervalConfig'
import {
    Count,
    Instant,
    Int,
    IntervalCounter,
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

    maybeAdvance(now: Instant, newCurrrentBucket: Count = 0): Count | null {
        let nextCurrent: Count = 0
        for (let c of this.counters.values()) {
            const didAdvance = c.maybeAdvance(now, nextCurrent)
            const prevCurrent = c.current
            if (didAdvance == null) {
                c.increment(nextCurrent - prevCurrent)
                return null
            }
            nextCurrent = c.total
        }

        return nextCurrent
    }

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

            const expected = c0.total
            const observed = c1.current
            if (observed !== expected) {
                return `Running total count for ${c0.id} isn't current count for ${c1.id} ${expected} !== ${observed} `
            }
        }
    }
}
