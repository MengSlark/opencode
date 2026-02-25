/**
 * Instance 模块 - 项目实例管理器
 *
 * 核心功能：
 * 1. 管理项目实例的创建、缓存和销毁
 * 2. 提供项目目录、工作树、项目信息的上下文
 * 3. 使用 AsyncLocalStorage 实现跨异步调用的上下文传递
 *
 * 架构：
 * - 每个项目目录对应一个 Instance
 * - Instance 包含：directory（原始目录）、worktree（沙箱目录）、project（项目信息）
 * - 通过 Instance.provide() 设置上下文，之后通过 Instance.directory/worktree/project 访问
 */

import { Log } from "@/util/log"
import { Context } from "../util/context"
import { Project } from "./project"
import { State } from "./state"
import { iife } from "@/util/iife"
import { GlobalBus } from "@/bus/global"
import { Filesystem } from "@/util/filesystem"

/**
 * Instance 上下文接口
 *
 * 包含项目实例的所有核心信息：
 * - directory: 原始项目目录路径
 * - worktree: 沙箱目录路径（用于 git worktree 或隔离环境）
 * - project: 项目元信息（.git 目录、配置等）
 */
interface Context {
  /** 原始项目目录路径 */
  directory: string
  /** 沙箱/工作树目录路径 */
  worktree: string
  /** 项目元信息 */
  project: Project.Info
}

/**
 * 创建 AsyncLocalStorage 上下文管理器
 *
 * 名称用于错误提示："No context found for instance"
 *
 * @see ../util/context.ts 了解 Context.create() 的实现
 */
const context = Context.create<Context>("instance")

/**
 * 实例缓存
 *
 * 同一个项目目录只创建一个 Instance，避免重复初始化
 * Key: 项目目录路径
 * Value: Promise<Context> - 使用 Promise 支持异步初始化
 */
const cache = new Map<string, Promise<Context>>()

/**
 * 所有实例的销毁状态
 * 用于确保 disposeAll 不会并发执行
 */
const disposal = {
  all: undefined as Promise<void> | undefined,
}

/**
 * Instance 命名空间
 *
 * 提供项目实例的创建、访问和销毁功能
 */
export const Instance = {
  /**
   * 提供项目实例上下文
   *
   * 这是使用 Instance 的入口方法，会：
   * 1. 如果缓存中没有，则创建新实例（解析项目目录、创建沙箱）
   * 2. 设置 AsyncLocalStorage 上下文
   * 3. 执行传入的函数
   *
   * @example
   * ```typescript
   * await Instance.provide({
   *   directory: "/path/to/project",
   *   init: async () => { /* 额外的初始化逻辑 *\/ },
   *   fn: async () => {
   *     // 在这里可以访问 Instance.directory, Instance.worktree, Instance.project
   *     const files = await listFiles(Instance.directory)
   *   }
   * })
   * ```
   *
   * @param input.directory - 项目目录路径
   * @param input.init - 可选的初始化回调（在上下文设置后、执行 fn 前调用）
   * @param input.fn - 要执行的函数（会在 Instance 上下文中运行）
   * @returns fn 的返回值
   */
  async provide<R>(input: { directory: string; init?: () => Promise<any>; fn: () => R }): Promise<R> {
    // 1. 检查缓存
    // 如果同一个目录已经被处理过，直接使用缓存的结果
    let existing = cache.get(input.directory)

    if (!existing) {
      // 2. 创建新实例
      Log.Default.info("creating instance", { directory: input.directory })

      // 使用 iife 立即开始异步初始化并缓存 Promise
      // 这样并发的相同目录请求会共享同一个 Promise
      existing = iife(async () => {
        // 2.1 解析项目信息（读取 .git 目录、分析项目结构）
        const { project, sandbox } = await Project.fromDirectory(input.directory)

        // 2.2 构建上下文对象
        const ctx = {
          directory: input.directory,
          worktree: sandbox,
          project,
        }

        // 2.3 设置上下文并执行 init 回调
        await context.provide(ctx, async () => {
          // 这是关键：在 context.provide 内部才能访问到 ctx
          await input.init?.()
        })

        return ctx
      })

      // 3. 缓存新实例
      cache.set(input.directory, existing)
    }

    // 4. 等待实例就绪（如果还在初始化中，这里会等待）
    const ctx = await existing

    // 5. 在上下文中执行用户函数
    return context.provide(ctx, async () => {
      return input.fn()
    })
  },

  /**
   * 获取当前项目目录
   *
   * 必须在 Instance.provide() 的回调函数内部调用
   * 否则会抛出 "No context found for instance" 错误
   *
   * @returns 项目目录路径
   * @throws Error 如果不在 provide 上下文中
   */
  get directory() {
    return context.use().directory
  },

  /**
   * 获取当前沙箱/工作树目录
   *
   * 用于隔离可能危险的写操作
   *
   * @returns 沙箱目录路径
   * @throws Error 如果不在 provide 上下文中
   */
  get worktree() {
    return context.use().worktree
  },

  /**
   * 获取当前项目元信息
   *
   * 包含项目的 git 配置、文件结构等信息
   *
   * @returns 项目信息对象
   * @throws Error 如果不在 provide 上下文中
   */
  get project() {
    return context.use().project
  },

  /**
   * 检查路径是否在项目边界内
   *
   * 用于判断操作是否需要请求 external_directory 权限
   *
   * @param filepath - 要检查的文件路径
   * @returns true 如果路径在 directory 或 worktree 内
   *
   * 注意：
   * - 如果 worktree 是 "/"（非 git 项目），跳过 worktree 检查
   *   因为这会匹配任何绝对路径，导致失去 external_directory 保护
   */
  containsPath(filepath: string) {
    // 检查是否在原始目录内
    if (Filesystem.contains(Instance.directory, filepath)) return true

    // 检查是否在沙箱目录内
    // 非 git 项目的 worktree 设为 "/"，会匹配任何路径，需要跳过
    if (Instance.worktree === "/") return false
    return Filesystem.contains(Instance.worktree, filepath)
  },

  /**
   * 创建实例级别的状态存储
   *
   * 创建的状态与实例绑定，实例销毁时自动清理
   *
   * @example
   * ```typescript
   * // 创建状态（只在首次调用时初始化）
   * const cache = Instance.state(() => new Map())
   *
   * // 之后调用返回相同的状态引用
   * const cache2 = Instance.state(() => new Map())
   * // cache === cache2
   * ```
   *
   * @param init - 状态初始化函数
   * @param dispose - 可选的销毁函数
   * @returns 状态访问函数
   */
  state<S>(init: () => S, dispose?: (state: Awaited<S>) => Promise<void>): () => S {
    // 使用 directory 作为状态键，同一项目目录共享状态
    return State.create(() => Instance.directory, init, dispose)
  },

  /**
   * 销毁当前实例
   *
   * 清理：
   * 1. 清理状态存储
   * 2. 从缓存中移除
   * 3. 发送 "instance.disposed" 事件
   *
   * 注意：必须在 provide 上下文中调用
   */
  async dispose() {
    Log.Default.info("disposing instance", { directory: Instance.directory })

    // 清理状态存储
    await State.dispose(Instance.directory)

    // 从缓存中移除
    cache.delete(Instance.directory)

    // 发送全局事件通知其他组件
    GlobalBus.emit("event", {
      directory: Instance.directory,
      payload: {
        type: "server.instance.disposed",
        properties: {
          directory: Instance.directory,
        },
      },
    })
  },

  /**
   * 销毁所有实例
   *
   * 清理所有缓存的项目实例
   * 如果正在销毁中，返回现有的 Promise（避免并发销毁）
   */
  async disposeAll() {
    // 防止并发调用
    if (disposal.all) return disposal.all

    disposal.all = iife(async () => {
      Log.Default.info("disposing all instances")

      // 遍历所有缓存的实例
      const entries = [...cache.entries()]
      for (const [key, value] of entries) {
        // 跳过已被其他操作修改的条目
        if (cache.get(key) !== value) continue

        // 等待实例初始化完成（可能还在创建中）
        const ctx = await value.catch((error) => {
          Log.Default.warn("instance dispose failed", { key, error })
          return undefined
        })

        if (!ctx) {
          if (cache.get(key) === value) cache.delete(key)
          continue
        }

        // 再次检查（可能已被修改）
        if (cache.get(key) !== value) continue

        // 在实例上下文中调用 dispose
        await context.provide(ctx, async () => {
          await Instance.dispose()
        })
      }
    }).finally(() => {
      // 清理状态，允许下次调用
      disposal.all = undefined
    })

    return disposal.all
  },
}
