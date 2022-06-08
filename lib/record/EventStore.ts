import { EventCountReducer, sum } from '../query/reducers'
import { IntervalConfig } from './IntervalConfig'
import { defaultIntervals } from './intervals'
import { MultiIntervalCounter } from './MultiIntervalCounter'
import {
    SimpleStartInstantCalculator,
    StartInstantCalculator,
} from './startInstant'
import { Instant, Int, Option } from './types'

type EventId = string

export class EventStore {
    private intervals: Array<IntervalConfig>
    private events: Map<EventId, MultiIntervalCounter> = new Map()
    private startInstants: StartInstantCalculator

    public get now(): Instant {
        return new Date().getTime()
    }

    constructor(
        intervals: Array<IntervalConfig> = defaultIntervals,
        startInstants: StartInstantCalculator = new SimpleStartInstantCalculator()
    ) {
        this.intervals = intervals
        this.startInstants = startInstants
    }

    recordEvent(id: EventId, now = this.now) {
        const counter =
            this.events.get(id) ??
            new MultiIntervalCounter(now, this.intervals, this.startInstants)
        counter.maybeAdvance(now)
        counter.increment()

        if (!this.events.has(id)) {
            this.events.set(id, counter)
        }
    }

    prepareForQueries(now: Instant = this.now) {
        this.tick(now)
    }

    tick(now: Instant = this.now) {
        for (const counter of this.events.values()) {
            counter.maybeAdvance(now)
        }
    }

    query(
        eventId: EventId,
        numBuckets: Int = 1,
        granularityId: string,
        startingIndex: Int = 0,
        reducer: EventCountReducer = sum,
        initialValue = 0
    ): Option<number> {
        const counter = this.events.get(eventId)
        return counter?.query(
            numBuckets,
            granularityId,
            startingIndex,
            reducer,
            initialValue
        )
    }
}
