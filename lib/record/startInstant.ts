import { Instant } from './types'
import * as dateMath from 'date-arithmetic'
import { StartOfWeek, Unit } from 'date-arithmetic'

/**
 * Gets the first moment of the current interval.
 * e.g. the top of this hour, or midnight last night.
 */
type CalculateStartInstant = (now: Instant) => Instant

/**
 * A map of `CalculateStartInstant`s.
 */
export interface StartInstantCalculator {
    supports(intervalId: string): boolean
    calculateStartInstantBefore(now: Instant, intervalId: string): Instant
}

export class SimpleStartInstantCalculator implements StartInstantCalculator {
    private map = new Map<string, CalculateStartInstant>()

    constructor() {
        this.map.set('second', (now) => startingInstant(now, 'seconds'))
        this.map.set('minute', (now) => startingInstant(now, 'minutes'))
        this.map.set('hour', (now) => startingInstant(now, 'hours'))
        this.map.set('day', (now) => startingInstant(now, 'day'))
        this.map.set('week', (now) => startingInstantOfWeek(now, 0))
        this.map.set('year', (now) => startingInstant(now, 'day'))
    }

    supports(id: string): boolean {
        return this.map.has(id)
    }

    calculateStartInstantBefore(now: Instant, id: string): Instant {
        const fn = this.map.get(id) ?? ((now) => 0)
        return fn(now)
    }
}

function startingInstant(now: Instant, unit: Exclude<Unit, 'week'>): Instant {
    return dateMath.startOf(new Date(now), unit).getTime()
}

function startingInstantOfWeek(now: Instant, sunday: StartOfWeek): Instant {
    return dateMath.startOf(new Date(now), 'week', sunday).getTime()
}
