import { Duration, Int } from './types'

export type IntervalConfig = {
    id: string
    intervalDuration: Duration
    numBuckets: Int
}
