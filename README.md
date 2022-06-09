# event-count-ts

A simple prototype of the queryable compound event-aggregator idea for powering display triggers for Nimbus messaging.

The concept here is to maintain **counts** of events long into the past.

As time flows, the granularity of time gets courser and courser, e.g. you can get minute by minute event counts for the last hour, but a week out you'll only be able to consider the counts for a day. A year out, and the granularity might drop to a four-week span.

## Recording events

### A single event, a single interval

The key data structure is `IntervalData`.

This looks after event counts for a particular interval (e.g. a day). For the following description, we'll consider a granularity of a day.

```typescript
class IntervalData {
    buckets: Array<Int>
    startingInstant: Instant

    increment()
    rotate(numRotations: Int)
}
```

Configuring the interval duration is done in another class, but we don't need to know about that in this description.

This maintains a fixed length array of `Int`s. In the prototype, this is called `buckets`.

When an event is recorded, we increment `buckets[0]`, i.e. adding one to **today**'s count.

The `startingInstant` is the time at which the current day started, e.g. midnight.

When the next midnight ticks by, we "rotate" the `buckets` array. This is unshifting zeroes to the beginning, and popping from the end.

We update `startingInstant` to be the beginning of the current interval.

`buckets[1]` is now **yesterday**'s count, and today's count is back to zero.

N.B. `rotate` can be made to be **O(n)** where **n** is `buckets.length`.

Each `SingleIntervalCounter` handles one granularity of interval, for one event type.

```typescript
class SingleIntervalCounter {
    data: IntervalData
    config: IntervalConfig

    increment() // forwards to data.increment(), which increments `bucket[0]`
    maybeAdvance(now: Instant) // decides whether to rotate, and how many times.
}
```

### Multiple intervals per event type

Each event type might have multiple interval granulity, so has multiple `SingleIntervalCounter`. [intervals.ts](./lib/record/intervals.ts) shows arrangements of intervals.

For example, we might have five `SingleIntervalCounter`s for 60 x 1 `minute`, 24 x 1 `hour`, 28 x `day`, 52 x `week`, 3 x `year`.

When an event of that type is recorded, counters for all interval are incremented.

```typescript
class MultiIntervalCounter {
    intervals: Map<IntervalId, SingleIntervalCounter>

    increment() // forwards to data.increment(), which increments `bucket[0]`
    maybeAdvance(now: Instant) // decides whether to rotate, and how many times.
}
```

When `maybeAdvance()` is called, it forwards to all its constiuent `SingleIntervalCounter`s. After this call, the counter is up-to-date and rotated such that `bucket[0]` is the wallclock **currrent** time interval.

A happy accident of this design is that the more often you call `maybeAdvance`, this becomes cheap to do (e.g. you need to rotate only the minute counter every minute).

### Event store handles all event types

`EventStore` presents a facade to record events as they come in. It's small, so can be kept in memory at all times.

```typescript
class EventStore {
    events: Map<EventId, MultiEventCounter>
    intervals: Array<IntervalConfig>

    recordEvent(eventId: EventId, now: Instant = currentTime())

    tick(now: Instant = currentTime())
}
```

The `recordEvent` method finds the relevant `MultiIntervalCounter`, popping one in to existence when needed, with the `intervals` array— i.e. each event type uses the same interval configs.

Before `recordExposure()` increments the counter, it calls the counter's `maybeAdvace()`.

## Querying

`buckets` is a fixed length array of `Int` counts, which means we can run a `reduce` over the array.

In [`reducers.ts`](./lib/query/reducers.ts), we implement:

-   `sum`, add counts for all buckets together
-   `countNonZero`, add one for each bucket that is greater than zero
-   `sumOfSquares`, add the sum of squares of the buckets together

`IntervalData` (and thence `SingleIntervalCounter`) implements a `query` method as a slice then reduce operation.

Successive query methods in `MultiIntervalCounter` adds selecting the interval and then in `EventStore` selecting the event type id.

We end up with a a few samples method calls:

```ts
// Of the previous 7 days, how many had at least one application launch?
eventStore.query(
    (eventId = 'application.launch'),
    7,
    'day',
    1, // start from bucket[1]
    countNonZero
)
```

```ts
// How many private tabs have been opened in the past hour?
eventStore.query(
    (eventId = 'open.tab(private)'),
    60,
    'minute',
    0, // start from bucket[0]
    sum
)
```

### Adding JEXL

[`transforms.ts`](./lib/query/transforms.ts) adds some transforms based upon one or more queries.

Sample trigger expressions might be expressed:

-   `IS_CORE_ACTIVE` as `'app_cycle.foreground'|countNonZero(28, 'day') > 21`.
-   `IS_DEFAULT_BROWSER` as `'app.opened_as_default_browser.increment'|countNonZero(7, 'day') > 0`
-   `HAS_RECENTLY_LOGGED_IN` as `'sync.login_completed_view'|countNonZero(60, 'minute') > 0`

I haven't implemented many, but I can imagine a handful of interesting ones:

-   variance,
-   mean
-   variance and mean of non-zero intervals.
-   computing the delta from one interval to the next

## Serialization, deserialization and merging

In some circumstance (e.g. on early startup, in an iOS extension), we may end up with two in memory Event stores.

Since the `IntervalData` only has fixed length arrays, this should be relatively easy to add a merge or addition method.

## Limitations

-   we might not have enough events and or counters in Glean dictionary, to express everything that is interesting.
-   new Glean events may be needed just for this purpose, and not relevant for off-device analysis.
-   support for Glean counters (incrementing and decrementing) may be needed, in lieu of instrumenting with more events.
