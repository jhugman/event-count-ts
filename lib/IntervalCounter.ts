export type Instant = number
export type Duration = number
export type Count = number
export type OptionalErrorMessage = Option<string>
export type Int = number
export type Option<T> = T | undefined

export interface IntervalCounter {
    increment(count: Count): void
    maybeAdvance(now: Instant, newCurrrentBucket: Count): Option<Count>
    checkInvariant(): OptionalErrorMessage
}
