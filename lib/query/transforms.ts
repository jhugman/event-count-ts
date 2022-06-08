import { EventStore } from '../record/EventStore'
import jexl from 'jexl'
import { Count, Int, Option } from '../record/types'
import { countNonZero, sum } from './reducers'

export function createTransforms(eventStore: EventStore) {
    // @ts-ignore
    jexl.addTransform(
        // count the number of times the event has been seen today
        // 'tab.opened'|recentCount(1, 'day')
        // Count the number of times the event was in the past 24 hours.
        // 'tab.opened'|recentCount(24, 'hour')
        'recentCount',
        (
            eventId: string,
            numBuckets: Count,
            granularityId: string
        ): Option<number> =>
            eventStore.query(eventId, numBuckets, granularityId, 0, sum, 0)
    )
    jexl.addTransform(
        // This is a generalization of `countRecent`.
        // Count the number of times the event was seen:
        // yesterday:
        // 'tab.opened'|count(1, 'day', 1)
        // today:
        // 'tab.opened'|count(1, 'day', 0)
        'count',
        (
            eventId: string,
            numBuckets: Count,
            granularityId: string,
            startIndex: Int
        ): Option<number> =>
            eventStore.query(
                eventId,
                numBuckets,
                granularityId,
                startIndex,
                sum,
                0
            )
    )

    jexl.addTransform(
        // Count how may days in the last 28 that had application launches
        // 'application.launches'|recentActivity(28, 'day')
        // Count how may days in the last 28 that had tabs opened
        // 'open.tab'|recentActivity(28, 'day')
        'activeRecent',
        (
            eventId: string,
            numBuckets: Count,
            granularityId: string
        ): Option<number> =>
            eventStore.query(
                eventId,
                numBuckets,
                granularityId,
                0,
                countNonZero,
                0
            )
    )

    jexl.addTransform(
        // Count how may days in the last 28 that had application launches
        // 'application.launches'|recent(28, 'day', 0)
        // 14 days ago, the week preceeding it had days with at least one launch.
        // 'application.launches'|recent(7, 'day', 14)/7
        'active',
        (
            eventId: string,
            numBuckets: Count,
            granularityId: string,
            startIndex: Int
        ): Option<number> =>
            eventStore.query(
                eventId,
                numBuckets,
                granularityId,
                startIndex,
                countNonZero,
                0
            )
    )
}
