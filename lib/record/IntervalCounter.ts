import { Count, Instant, Option, ErrorMessage } from './types'

export interface IntervalCounter {
    increment(count: Count): void
    maybeAdvance(now: Instant): Option<Count>
    checkInvariant(): Option<ErrorMessage>
}
