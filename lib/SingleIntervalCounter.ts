export type Instant = number
export type Duration = number
export type Count = number
export type OptionalErrorMessage = string | undefined
export type Int = number

export interface IntervalCounter {
    increment(count: Count): void
    maybeAdvance(now: Instant, newCurrrentBucket: Count): Count | null
    // query(index: Int, numBuckets: Int): Count
    checkInvariant(): OptionalErrorMessage
}

class IntervalData {
    currentBucket: Count = 0
    runningTotal: Count = 0
    previousBuckets: Array<Count> = []
    lastTick: Instant = 0

    static empty(numberBuckets: Int, lastTick: Instant): IntervalData {
        const data = new IntervalData()
        data.previousBuckets = new Array(numberBuckets - 1).fill(0)
        data.lastTick = lastTick
        return data
    }

    increment(count: Count) {
        this.currentBucket += count
        this.runningTotal += count
    }

    rotate(numRotations: Int, newCurrent: Count): Count {
        let bucket = this.currentBucket
        let overflow = 0
        for (let i = 0; i < numRotations; i++) {
            overflow += this.previousBuckets.pop() ?? 0
            this.previousBuckets.unshift(bucket)
            bucket = 0
        }

        this.runningTotal += newCurrent - overflow
        this.currentBucket = newCurrent

        return overflow
    }

    checkInvariant(): OptionalErrorMessage {
        const expected = this.previousBuckets.reduceRight(
            (a, b) => a + b,
            this.currentBucket
        )
        const observed = this.runningTotal

        if (expected !== observed) {
            return `Expected the bucket total and runningTotal to be equal. ${expected} !== ${observed}`
        }
    }
}

export class IntervalConfig {
    interval: Duration
    numBuckets: Int

    constructor(interval: Duration, numBuckets: Int) {
        this.interval = interval
        this.numBuckets = numBuckets
    }
}

export class SingleIntervalCounter implements IntervalCounter {
    private data: IntervalData
    private config: IntervalConfig

    public get current(): Count {
        return this.data.currentBucket
    }

    public get total(): Count {
        return this.data.runningTotal
    }

    constructor(config: IntervalConfig, lastTick: Instant) {
        this.data = IntervalData.empty(config.numBuckets, lastTick)
        this.config = config
    }

    increment(count: Count = 1): void {
        this.data.increment(count)
    }

    maybeAdvance(
        now: Instant,
        newCurrrentBucket: Count = this.current
    ): Count | null {
        const numRollovers = this.numRollovers(now)

        if (numRollovers <= 0) {
            // this.increment(newCurrrentBucket - this.current)
            return null
        }

        this.data.lastTick += numRollovers * this.config.interval

        return this.data.rotate(numRollovers, newCurrrentBucket)
    }

    private numRollovers(now: Instant): Int {
        return Math.floor((now - this.data.lastTick) / this.config.interval)
    }

    checkInvariant(): OptionalErrorMessage {
        const observed = this.data.previousBuckets.length
        const expected = this.config.numBuckets - 1
        if (observed !== expected) {
            return `Expected number of buckets to be ${expected}, but found ${observed}`
        }
        return this.data.checkInvariant()
    }
}
