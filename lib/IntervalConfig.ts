import { Duration, Int } from './IntervalCounter'

export type IntervalConfig {
    id: string = 'unknown',
    interval: Duration,
    numBuckets: Int
}
