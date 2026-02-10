# SolidJS 路由与导航

> 📚 难度：中级 | ⏱️ 预计时间：2-3 天 | 🎯 目标：掌握路由系统

本教程讲解 SolidJS Router 的使用，帮助你构建单页应用。

---

## 1. 基础路由

### 1.1 安装与配置

```bash
bun add @solidjs/router
```

```tsx
// App.tsx
import { Router, Route, Routes } from "@solidjs/router"

import Home from "./pages/Home"
import About from "./pages/About"
import NotFound from "./pages/NotFound"

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" component={Home} />
        <Route path="/about" component={About} />
        <Route path="*" component={NotFound} />
      </Routes>
    </Router>
  )
}
```

### 1.2 路由导航

```tsx
import { A, useNavigate } from "@solidjs/router"

function Navigation() {
  const navigate = useNavigate()

  return (
    <nav>
      {/* 声明式导航 */}
      <A href="/" end>
        Home
      </A>
      <A href="/about">About</A>

      {/* 编程式导航 */}
      <button onClick={() => navigate("/about")}>Go to About</button>

      {/* 带历史记录的导航 */}
      <button onClick={() => navigate("/about", { replace: true })}>Replace</button>
    </nav>
  )
}
```

### 1.3 链接组件 A

```tsx
;<A href="/users" activeClass="active">
  Users
</A>

{
  /* 带查询参数 */
}
;<A href="/search?q=hello">Search</A>

{
  /* 禁止预加载 */
}
;<A href="/heavy" noPreload>
  Heavy Page
</A>
```

---

## 2. 动态路由

### 2.1 路由参数

```tsx
// 定义路由
;<Route path="/users/:id" component={UserDetail} />

// 使用参数
import { useParams } from "@solidjs/router"

function UserDetail() {
  const params = useParams()

  return (
    <div>
      <h1>User {params.id}</h1>
    </div>
  )
}
```

### 2.2 多个参数

```tsx
;<Route path="/projects/:projectId/tasks/:taskId" component={TaskDetail} />

function TaskDetail() {
  const params = useParams()

  return (
    <div>
      <p>Project: {params.projectId}</p>
      <p>Task: {params.taskId}</p>
    </div>
  )
}
```

### 2.3 可选参数

```tsx
;<Route path="/products/:id?" component={ProductPage} />

function ProductPage() {
  const params = useParams()

  return (
    <div>
      <Show when={params.id} fallback={<ProductList />}>
        {(id) => <ProductDetail id={id} />}
      </Show>
    </div>
  )
}
```

---

## 3. 嵌套路由

### 3.1 基础嵌套

```tsx
// App.tsx
;<Routes>
  <Route path="/users" component={UsersLayout}>
    <Route path="/" component={UserList} />
    <Route path="/:id" component={UserDetail} />
    <Route path="/:id/edit" component={UserEdit} />
  </Route>
</Routes>

// UsersLayout.tsx
import { Outlet } from "@solidjs/router"

function UsersLayout() {
  return (
    <div class="users-layout">
      <aside>
        <UserSidebar />
      </aside>
      <main>
        {/* 子路由渲染在这里 */}
        <Outlet />
      </main>
    </div>
  )
}
```

### 3.2 默认子路由

```tsx
<Route path="/dashboard" component={Dashboard}>
  <Route path="/" component={DashboardHome} />
  <Route path="/stats" component={Stats} />
  <Route path="/settings" component={Settings} />
</Route>
```

---

## 4. 查询参数

### 4.1 获取查询参数

```tsx
import { useSearchParams } from "@solidjs/router"

function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  return (
    <div>
      <p>Query: {searchParams.q}</p>
      <p>Page: {searchParams.page || 1}</p>

      <button onClick={() => setSearchParams({ page: 2 })}>Next Page</button>

      <button onClick={() => setSearchParams({ q: "solidjs" })}>Search</button>
    </div>
  )
}
```

### 4.2 类型安全的查询参数

```tsx
import { useSearchParams } from "@solidjs/router"
import { z } from "zod"

const SearchParamsSchema = z.object({
  q: z.string().default(""),
  page: z.coerce.number().default(1),
  category: z.string().optional(),
})

type SearchParams = z.infer<typeof SearchParamsSchema>

function TypedSearchPage() {
  const [params] = useSearchParams<SearchParams>()

  // 现在 params 有类型提示
  return <div>Page: {params.page}</div>
}
```

---

## 5. 路由守卫

### 5.1 认证守卫

```tsx
import { useNavigate, useLocation } from "@solidjs/router"

function ProtectedRoute(props: { component: Component }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [isAuthenticated] = createResource(checkAuth)

  createEffect(() => {
    if (isAuthenticated() === false) {
      navigate(`/login?redirect=${location.pathname}`, { replace: true })
    }
  })

  return (
    <Show when={isAuthenticated()} fallback={<div>Checking...</div>}>
      <props.component />
    </Show>
  )
}

// 使用
;<Route path="/admin" component={() => <ProtectedRoute component={AdminPage} />} />
```

### 5.2 权限守卫

```tsx
function PermissionGuard(props: { component: Component; permission: string }) {
  const [user] = createResource(getCurrentUser)

  const hasPermission = () => {
    return user()?.permissions.includes(props.permission)
  }

  return (
    <Show when={hasPermission()} fallback={<div>Access Denied</div>}>
      <props.component />
    </Show>
  )
}
```

---

## 6. 数据加载

### 6.1 Route 加载数据

```tsx
import { RouteDataFunc } from "@solidjs/router"

const UserData: RouteDataFunc = ({ params }) => {
  const [user] = createResource(
    () => params.id,
    async (id) => {
      const res = await fetch(`/api/users/${id}`)
      return res.json()
    },
  )

  return { user }
}

// 在路由中使用
;<Route path="/users/:id" component={UserPage} data={UserData} />

// 在组件中使用
function UserPage() {
  const { user } = useRouteData<typeof UserData>()

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div>
        <h1>{user()?.name}</h1>
      </div>
    </Suspense>
  )
}
```

### 6.2 预加载数据

```tsx
;<A href="/users/1" preload={loadUserData}>
  User 1
</A>

async function loadUserData({ params }) {
  const res = await fetch(`/api/users/${params.id}`)
  return res.json()
}
```

---

## 7. 编程式路由

### 7.1 使用 useNavigate

```tsx
import { useNavigate } from "@solidjs/router"

function LoginForm() {
  const navigate = useNavigate()

  const handleSubmit = async (data) => {
    await login(data)
    navigate("/dashboard")
  }

  return <form onSubmit={handleSubmit}>...</form>
}
```

### 7.2 使用 useLocation

```tsx
import { useLocation } from "@solidjs/router"

function Breadcrumb() {
  const location = useLocation()

  // 当前路径
  console.log(location.pathname)

  // 查询字符串
  console.log(location.search)

  // hash
  console.log(location.hash)

  return <div>Current: {location.pathname}</div>
}
```

### 7.3 使用 useMatch

```tsx
import { useMatch } from "@solidjs/router"

function NavLink(props: { href: string; children: JSX.Element }) {
  const match = useMatch(() => props.href)

  return (
    <a href={props.href} class={match() ? "active" : ""}>
      {props.children}
    </a>
  )
}
```

---

## 8. 最佳实践

### 8.1 路由配置分离

```tsx
// routes.ts
export const routes = [
  { path: "/", component: Home },
  { path: "/about", component: About },
  {
    path: "/users",
    component: UsersLayout,
    children: [
      { path: "/", component: UserList },
      { path: "/:id", component: UserDetail },
    ],
  },
]

// App.tsx
import { routes } from "./routes"

function App() {
  return (
    <Router>
      <Routes>
        {routes.map((route) => (
          <Route {...route} />
        ))}
      </Routes>
    </Router>
  )
}
```

### 8.2 懒加载路由

```tsx
import { lazy } from "solid-js"

const routes = [
  { path: "/", component: Home },
  {
    path: "/admin",
    component: lazy(() => import("./pages/Admin")),
  },
]
```

---

## 9. 本章总结

### 核心概念

1. **Router**: 路由容器
2. **Route**: 路由定义
3. **A**: 链接组件
4. **Outlet**: 嵌套路由出口
5. **useParams**: 路由参数
6. **useSearchParams**: 查询参数
7. **useNavigate**: 编程式导航

### 路由模式

```
静态: /about
动态: /users/:id
嵌套: /users/:id/profile
可选: /products/:id?
```

### 检查清单

- [ ] 掌握基础路由配置
- [ ] 理解动态路由
- [ ] 会使用嵌套路由
- [ ] 掌握路由守卫
- [ ] 理解数据加载

---

**路由是构建复杂应用的基础，掌握它你就能构建任何规模的 SPA！**
