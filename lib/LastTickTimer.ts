import { Instant } from './IntervalCounter'
import * as dateMath from 'date-arithmetic'

type LastTickTimer = (now: Instant) => Instant
export interface LastTickMap {
    has(id: string): boolean
    getLastTick(now: Instant, id: string): Instant
}

export class SimpleLastTickMap implements LastTickMap {
    private map = new Map<string, LastTickTimer>()

    constructor() {
        this.map.set('minute', (now) =>
            dateMath.startOf(new Date(now), 'minutes').getTime()
        )
        this.map.set('hour', (now) =>
            dateMath.startOf(new Date(now), 'hours').getTime()
        )
        this.map.set('day', (now) =>
            dateMath.startOf(new Date(now), 'day').getTime()
        )
        this.map.set('week', (now) =>
            dateMath.startOf(new Date(now), 'day').getTime()
        )
        this.map.set('year', (now) =>
            dateMath.startOf(new Date(now), 'day').getTime()
        )
    }

    has(id: string): boolean {
        return this.map.has(id)
    }

    getLastTick(now: Instant, id: string): Instant {
        const fn = this.map.get(id) ?? ((now) => 0)
        return fn(now)
    }
}
