import { DeferredPromise } from '../../utils/Deferred'

export type TextRequestListener = () => DeferredPromise<string | null>
