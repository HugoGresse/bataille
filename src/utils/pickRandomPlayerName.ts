import { LOTR_NAMES } from '../client/utils/LOTR_NAMES'

export const pickRandomPlayerName = () => LOTR_NAMES[Math.floor(Math.random() * LOTR_NAMES.length)]
