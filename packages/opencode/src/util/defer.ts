/**
 * 生成一个可被 `using` / `await using` 消费的“延迟清理对象”。
 *
 * 典型用法：
 * - `using _ = defer(() => cleanup())`
 * - `await using _ = defer(async () => cleanupAsync())`
 *
 * 设计目标：
 * - 让调用方以统一写法注册“作用域退出时执行”的清理逻辑；
 * - 同时兼容同步与异步清理函数；
 * - 用条件类型在类型层面约束返回对象的主要 dispose 形态。
 */
export function defer<T extends () => void | Promise<void>>(
  fn: T,
): T extends () => Promise<void> ? { [Symbol.asyncDispose]: () => Promise<void> } : { [Symbol.dispose]: () => void } {
  // 这里同时提供 `Symbol.dispose` 与 `Symbol.asyncDispose`：
  // - `using` 会优先走同步释放语义（`Symbol.dispose`）；
  // - `await using` 会走异步释放语义（`Symbol.asyncDispose`）。
  // 这样一个实现即可覆盖两种调用场景。
  return {
    [Symbol.dispose]() {
      // 同步释放：直接调用清理函数。
      fn()
    },
    [Symbol.asyncDispose]() {
      // 异步释放：把返回值统一包装成 Promise，兼容 fn 同步/异步两种实现。
      return Promise.resolve(fn())
    },
    // 运行时对象比函数签名更“宽”（同时含两种 symbol 方法），
    // 通过断言收敛到上面的条件返回类型，以匹配调用方的类型预期。
  } as any
}
