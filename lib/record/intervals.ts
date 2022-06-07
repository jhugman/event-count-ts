import { IntervalConfig } from './IntervalConfig'

const ms = 1
export const second = 1000 * ms
export const minute = 60 * second
export const hour = 60 * minute
export const day = 24 * hour

const c60seconds: IntervalConfig = {
    id: 'second',
    numBuckets: 60,
    intervalDuration: 1 * second,
}

const c60minutes: IntervalConfig = {
    id: 'minute',
    numBuckets: 60,
    intervalDuration: 1 * minute,
}

const c24hours: IntervalConfig = {
    id: 'hour',
    numBuckets: 24,
    intervalDuration: 1 * hour,
}

const c7days: IntervalConfig = {
    id: 'day',
    numBuckets: 7,
    intervalDuration: 1 * day,
}

const c28days: IntervalConfig = {
    id: 'day',
    numBuckets: 28,
    intervalDuration: 1 * day,
}

const c52weeks: IntervalConfig = {
    id: 'week',
    numBuckets: 24,
    intervalDuration: 52 * 7 * day,
}

const c5years: IntervalConfig = {
    id: 'year',
    numBuckets: 5,
    intervalDuration: 365 * day,
}

export const defaultIntervals: Array<IntervalConfig> = [
    c60minutes,
    c24hours,
    c28days,
    c52weeks,
    c5years,
]

export const testIntervals: Array<IntervalConfig> = [
    c60seconds,
    c60minutes,
    c24hours,
    c7days,
]
