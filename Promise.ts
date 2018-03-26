const APromise = (function () {
    const FULFILED: string = 'FULFILED';
    const REJECTED: string = 'REJECTED';
    const PENDING: string = 'PENDING';

    function isFunction(fn: any): boolean {
        return 'function' === typeof fn;
    }
    interface Resolve {
        (value: any): any
    }
    interface Reject {
        (reason: any): any
    }
    interface Executer {
        (resolve: Resolve, reject: Reject): any
    }
    interface Defer {
        promise?: Promise,
        resolve?: Resolve,
        reject?: Reject
    }
    class Promise {
        private status: string = PENDING;
        private value: any;
        private reason: any;
        private resolvedCallbacks: any[] = [];
        private rejectedCallbacks: any[] = [];
        constructor(executer: Executer) {
            let self = this;
            // self.status = PENDING;
            function resolve(value: any) {
                // 如果这里不使用timeout, 则在往 resolvedCallbacks 里 push 的时候, 要 push 有 timeout 的函数
                // 这样的话, 如果push多个, 就出现了多个 timeout 延迟, 没有在这里使用 timeout 划算
                setTimeout(() => {
                    if (self.status === PENDING) {
                        self.value = value;
                        self.status = FULFILED;
                        self.resolvedCallbacks.forEach(fn => fn())
                    }
                })

            }
            function reject(reason: any) {
                // 如果这里不使用timeout, 则在往 rejectedCallbacks 里 push 的时候, 要 push 有 timeout 的函数
                // 理由同上
                setTimeout(() => {
                    if (self.status === PENDING) {
                        self.reason = reason;
                        self.status = REJECTED;
                        self.rejectedCallbacks.forEach(fn => fn())
                    }
                })

            }
            try {
                executer(resolve, reject);
            } catch (e) {
                reject(e);
            }
        }
        then(onResolved: Resolve, onRejected?: Reject) {
            let self = this;
            let promise2: Promise;
            onResolved = isFunction(onResolved) ? onResolved : ((value: any) => value);
            onRejected = isFunction(onRejected) ? onRejected : ((reason: any) => {
                throw reason
            });
            if (self.status === PENDING) {
                return promise2 = new Promise(function (resolve, reject) {
                    self.resolvedCallbacks.push(function () {
                        try {
                            let x = onResolved(self.value);
                            resolvePromise(promise2, x, resolve, reject);
                        } catch (e) {
                            reject(e);
                        }

                    });
                    self.rejectedCallbacks.push(function () {
                        try {
                            let x = onRejected(self.reason);
                            resolvePromise(promise2, x, resolve, reject);
                        } catch (e) {
                            reject(e);
                        }

                    })
                })

            }
            if (self.status === FULFILED) {
                return promise2 = new Promise(function (resolve, reject) {
                    setTimeout(function () {
                        try {
                            let x = onResolved(self.value);
                            resolvePromise(promise2, x, resolve, reject);
                        } catch (e) {
                            reject(e);
                        }
                    })
                })
            }
            if (self.status === REJECTED) {
                return promise2 = new Promise(function (resolve, reject) {
                    setTimeout(function () {
                        try {
                            let x = onRejected(self.reason);
                            resolvePromise(promise2, x, resolve, reject);
                        } catch (e) {
                            reject(e);
                        }
                    })
                });
            }
        }
        done(onResolved: Resolve) {
            return this.then(onResolved);
        }
        catch(onRejected: Reject) {
            return this.then(null, onRejected);
        };
        fail(onRejected: Reject) {
            return this.then(null, onRejected);
        };
        static deferred() {
            let obj: Defer = {};
            obj.promise = new Promise(function (resolve, reject) {
                obj.resolve = resolve;
                obj.reject = reject;
            })
            return obj;
        }
        static resolve(val: any) {
            return new Promise(function (resolve: Resolve, reject: Reject) {
                resolve(val);
            })
        }
        static reject(reason: any) {
            return new Promise(function (resolve: Resolve, reject: Reject) {
                reject(reason);
            })
        }
        static all(promises: Promise[]) {

            return new Promise((resolve, reject) => {
                let values: any[] = [];
                let len: number = promises.length;
                function operate(val: any, i: number) {
                    values[i] = val;
                    len--;
                    if (len <= 0) {
                        resolve(values);
                    }
                }
                promises.forEach((pro: Promise, i: number) => {
                    // 如果是纯值, 直接解决
                    if (!pro.then || !(pro instanceof Promise)) {
                        operate(pro, i);
                    } else {
                        pro.then((val) => {
                            operate(val, i);
                        }, reject)
                    }

                })
            })
        }

        static race(promises: Promise[]) {
            return new Promise((resolve, reject) => {
                promises.forEach((pro: Promise, i: number) => {
                    // 直接解决纯值
                    if (!(pro instanceof Promise) || !pro.then) {
                        try {
                            resolve(pro);
                        } catch (e) {
                            reject(e);
                        }
                        return;
                    }
                    pro.then(resolve, reject)
                })
            })
        }
    }
    // promise2 是 then 中生成的 promise, x 是 then的参数(onFulfiled或者onRejected) 执行后的结果, resolve与reject是 promise2 接收到的
    // x 可能是普通值, 也可能是 另一个 promise. 当是另一个 promise 的时候, 需要解决它, 才能继续走
    function resolvePromise(promise2: Promise, x: any, resolve: Resolve, reject: Reject) {
        if (promise2 === x) {
            return reject(new TypeError('循环引用!'));
        }
        let called: boolean;
        function toResolve() {
            if (called) return;
            called = true;
            return resolve(x);
        }
        function toReject(err: any) {
            if (called) return;
            called = true;
            // rejected
            reject(err);
        }
        if (x && (isFunction(x) || 'object' === typeof x)) {
            // 尽量保持 try...catch 中语句尽量少
            try {
                let then = x.then;
                if (isFunction(then)) {
                    then.call(x, function (y: any) {
                        // fulfiled
                        if (called) return;
                        called = true;
                        resolvePromise(promise2, y, resolve, reject);
                    }, toReject)
                } else {
                    toResolve();
                }
            } catch (e) {
                toReject(e);
            }
        } else {
            toResolve();
        }
    }
    return Promise;
})();

// export default APromise;