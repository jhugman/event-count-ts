export type Instant = number
export type Duration = number
export type Count = number
export type OptionalErrorMessage = string | undefined
export type Int = number

export interface IntervalCounter {
    increment(count: Count): void
    maybeAdvance(now: Instant, newCurrrentBucket: Count): Count | null
    checkInvariant(): OptionalErrorMessage
}
