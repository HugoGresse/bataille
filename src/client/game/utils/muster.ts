import { UnitsType } from '../../../common/UNITS'

export type MusterOption = {
    key: string
    label: string
    /** Units to request; `all` spends whatever the treasury holds */
    amount: number | 'all'
}

export const MUSTER_OPTIONS: MusterOption[] = [
    { key: 'R', label: '+1', amount: 1 },
    { key: 'T', label: '+10', amount: 10 },
    { key: 'Y', label: '+all', amount: 'all' },
]

/**
 * How many units an option raises right now. A pack shrinks to what the treasury covers rather than
 * switching off: with 4 in the bank, `+10` musters 4. The server clamps the same way.
 */
export const musterCount = (option: MusterOption, money: number): number => {
    const affordable = Math.floor(Math.max(0, money) / UnitsType.Stick)
    return option.amount === 'all' ? affordable : Math.min(option.amount, affordable)
}
