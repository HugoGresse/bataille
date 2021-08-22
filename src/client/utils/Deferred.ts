/**
 * From https://stackoverflow.com/a/47112177/1377145
 * @constructor
 */
export class DeferredPromise<T> {
    private promise: Promise<T>
    public resolve!: (value: T) => void
    public reject!: (reason?: any) => void
    public then: any
    public catch: any
    constructor() {
        this.promise = new Promise((resolve: (params: T) => void, reject) => {
            // assign the resolve and reject functions to `this`
            // making them usable on the class instance
            this.resolve = resolve
            this.reject = reject
        })
        // bind `then` and `catch` to implement the same interface as Promise
        this.then = this.promise.then.bind(this.promise)
        this.catch = this.promise.catch.bind(this.promise)
        // @ts-ignore
        this[Symbol.toStringTag] = 'Promise'
    }
}
