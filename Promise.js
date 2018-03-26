var APromise = (function () {
    var FULFILED = 'FULFILED';
    var REJECTED = 'REJECTED';
    var PENDING = 'PENDING';
    function isFunction(fn) {
        return 'function' === typeof fn;
    }
    var Promise = /** @class */ (function () {
        function Promise(executer) {
            this.status = PENDING;
            this.resolvedCallbacks = [];
            this.rejectedCallbacks = [];
            var self = this;
            // self.status = PENDING;
            function resolve(value) {
                // 如果这里不使用timeout, 则在往 resolvedCallbacks 里 push 的时候, 要 push 有 timeout 的函数
                // 这样的话, 如果push多个, 就出现了多个 timeout 延迟, 没有在这里使用 timeout 划算
                setTimeout(function () {
                    if (self.status === PENDING) {
                        self.value = value;
                        self.status = FULFILED;
                        self.resolvedCallbacks.forEach(function (fn) { return fn(); });
                    }
                });
            }
            function reject(reason) {
                // 如果这里不使用timeout, 则在往 rejectedCallbacks 里 push 的时候, 要 push 有 timeout 的函数
                // 理由同上
                setTimeout(function () {
                    if (self.status === PENDING) {
                        self.reason = reason;
                        self.status = REJECTED;
                        self.rejectedCallbacks.forEach(function (fn) { return fn(); });
                    }
                });
            }
            try {
                executer(resolve, reject);
            }
            catch (e) {
                reject(e);
            }
        }
        Promise.prototype.then = function (onResolved, onRejected) {
            var self = this;
            var promise2;
            onResolved = isFunction(onResolved) ? onResolved : (function (value) { return value; });
            onRejected = isFunction(onRejected) ? onRejected : (function (reason) {
                throw reason;
            });
            if (self.status === PENDING) {
                return promise2 = new Promise(function (resolve, reject) {
                    self.resolvedCallbacks.push(function () {
                        try {
                            var x = onResolved(self.value);
                            resolvePromise(promise2, x, resolve, reject);
                        }
                        catch (e) {
                            reject(e);
                        }
                    });
                    self.rejectedCallbacks.push(function () {
                        try {
                            var x = onRejected(self.reason);
                            resolvePromise(promise2, x, resolve, reject);
                        }
                        catch (e) {
                            reject(e);
                        }
                    });
                });
            }
            if (self.status === FULFILED) {
                return promise2 = new Promise(function (resolve, reject) {
                    setTimeout(function () {
                        try {
                            var x = onResolved(self.value);
                            resolvePromise(promise2, x, resolve, reject);
                        }
                        catch (e) {
                            reject(e);
                        }
                    });
                });
            }
            if (self.status === REJECTED) {
                return promise2 = new Promise(function (resolve, reject) {
                    setTimeout(function () {
                        try {
                            var x = onRejected(self.reason);
                            resolvePromise(promise2, x, resolve, reject);
                        }
                        catch (e) {
                            reject(e);
                        }
                    });
                });
            }
        };
        Promise.prototype.done = function (onResolved) {
            return this.then(onResolved);
        };
        Promise.prototype["catch"] = function (onRejected) {
            return this.then(null, onRejected);
        };
        Promise.prototype.fail = function (onRejected) {
            return this.then(null, onRejected);
        };
        Promise.deferred = function () {
            var obj = {};
            obj.promise = new Promise(function (resolve, reject) {
                obj.resolve = resolve;
                obj.reject = reject;
            });
            return obj;
        };
        Promise.resolve = function (val) {
            return new Promise(function (resolve, reject) {
                resolve(val);
            });
        };
        Promise.reject = function (reason) {
            return new Promise(function (resolve, reject) {
                reject(reason);
            });
        };
        Promise.all = function (promises) {
            return new Promise(function (resolve, reject) {
                var values = [];
                var len = promises.length;
                function operate(val, i) {
                    values[i] = val;
                    len--;
                    if (len <= 0) {
                        resolve(values);
                    }
                }
                promises.forEach(function (pro, i) {
                    // 如果是纯值, 直接解决
                    if (!pro.then || !(pro instanceof Promise)) {
                        operate(pro, i);
                    }
                    else {
                        pro.then(function (val) {
                            operate(val, i);
                        }, reject);
                    }
                });
            });
        };
        Promise.race = function (promises) {
            return new Promise(function (resolve, reject) {
                promises.forEach(function (pro, i) {
                    // 直接解决纯值
                    if (!(pro instanceof Promise) || !pro.then) {
                        try {
                            resolve(pro);
                        }
                        catch (e) {
                            reject(e);
                        }
                        return;
                    }
                    pro.then(resolve, reject);
                });
            });
        };
        return Promise;
    }());
    // promise2 是 then 中生成的 promise, x 是 then的参数(onFulfiled或者onRejected) 执行后的结果, resolve与reject是 promise2 接收到的
    // x 可能是普通值, 也可能是 另一个 promise. 当是另一个 promise 的时候, 需要解决它, 才能继续走
    function resolvePromise(promise2, x, resolve, reject) {
        if (promise2 === x) {
            return reject(new TypeError('循环引用!'));
        }
        var called;
        function toResolve() {
            if (called)
                return;
            called = true;
            return resolve(x);
        }
        function toReject(err) {
            if (called)
                return;
            called = true;
            // rejected
            reject(err);
        }
        if (x && (isFunction(x) || 'object' === typeof x)) {
            // 尽量保持 try...catch 中语句尽量少
            try {
                var then = x.then;
                if (isFunction(then)) {
                    then.call(x, function (y) {
                        // fulfiled
                        if (called)
                            return;
                        called = true;
                        resolvePromise(promise2, y, resolve, reject);
                    }, toReject);
                }
                else {
                    toResolve();
                }
            }
            catch (e) {
                toReject(e);
            }
        }
        else {
            toResolve();
        }
    }
    return Promise;
})();
// export default APromise; 
