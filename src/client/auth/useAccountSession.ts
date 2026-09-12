import { useSyncExternalStore } from 'react'
import { getAccountSession, subscribeAccountSession } from './accountSession'

export const useAccountSession = () => useSyncExternalStore(subscribeAccountSession, getAccountSession, () => null)
