import { Count } from '../record/types'

export type EventCountReducer = (a: number, b: Count) => number

export const sum: EventCountReducer = (a, b) => a + b
export const countNonZero: EventCountReducer = (a, b) => a + (b > 0 ? 1 : 0)
export const sumSquares: EventCountReducer = (a, b) => a + b * b
