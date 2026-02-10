# 错误码大全

> 📖 参考手册 | 完整的错误码列表

本页提供 OpenCode 中所有错误码的详细说明。

---

## 工具错误

### TOOL_NOT_FOUND

- **状态码**: 404
- **说明**: 请求的工具不存在
- **解决方案**: 检查工具名称拼写，使用 `/tools` 列出可用工具

```json
{
  "error": "TOOL_NOT_FOUND",
  "message": "Tool 'unknown_tool' not found",
  "code": "TOOL_NOT_FOUND"
}
```

### TOOL_EXECUTION_FAILED

- **状态码**: 500
- **说明**: 工具执行过程中发生错误
- **解决方案**: 检查工具参数，查看错误详情

```json
{
  "error": "TOOL_EXECUTION_FAILED",
  "message": "Failed to execute tool: file not found",
  "code": "TOOL_EXECUTION_FAILED",
  "details": {
    "tool": "read",
    "path": "/nonexistent/file.txt"
  }
}
```

### TOOL_TIMEOUT

- **状态码**: 504
- **说明**: 工具执行超时
- **解决方案**: 增加超时时间，或优化工具性能

---

## 提供商错误

### PROVIDER_NOT_FOUND

- **状态码**: 404
- **说明**: 请求的 AI 提供商不存在
- **解决方案**: 检查提供商名称，确认已正确配置

### PROVIDER_ERROR

- **状态码**: 502
- **说明**: 提供商 API 调用失败
- **解决方案**:
  - 检查 API Key 是否有效
  - 检查网络连接
  - 查看提供商状态页面

### PROVIDER_RATE_LIMITED

- **状态码**: 429
- **说明**: 提供商请求频率限制
- **解决方案**:
  - 降低请求频率
  - 使用不同的提供商
  - 升级账户

### PROVIDER_QUOTA_EXCEEDED

- **状态码**: 429
- **说明**: 提供商配额已用完
- **解决方案**:
  - 检查配额使用情况
  - 充值或升级账户

---

## 会话错误

### SESSION_NOT_FOUND

- **状态码**: 404
- **说明**: 会话不存在
- **解决方案**:
  - 检查会话 ID
  - 创建新会话

### SESSION_EXPIRED

- **状态码**: 410
- **说明**: 会话已过期
- **解决方案**: 创建新会话

### SESSION_COMPACTION_FAILED

- **状态码**: 500
- **说明**: 会话压缩失败
- **解决方案**: 稍后重试，或手动删除部分历史

---

## 权限错误

### PERMISSION_DENIED

- **状态码**: 403
- **说明**: 没有执行该操作的权限
- **解决方案**:
  - 请求用户授权
  - 检查权限配置

### AUTHENTICATION_REQUIRED

- **状态码**: 401
- **说明**: 需要认证
- **解决方案**:
  - 提供有效的认证信息
  - 重新登录

### TOKEN_EXPIRED

- **状态码**: 401
- **说明**: 认证令牌已过期
- **解决方案**: 刷新令牌或重新登录

### TOKEN_INVALID

- **状态码**: 401
- **说明**: 认证令牌无效
- **解决方案**: 检查令牌格式，重新获取

---

## 验证错误

### VALIDATION_ERROR

- **状态码**: 400
- **说明**: 请求参数验证失败
- **解决方案**: 检查参数格式和类型

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid request parameters",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "path",
      "message": "Path is required"
    }
  ]
}
```

### MISSING_REQUIRED_FIELD

- **状态码**: 400
- **说明**: 缺少必填字段
- **解决方案**: 提供所有必填字段

### INVALID_FIELD_TYPE

- **状态码**: 400
- **说明**: 字段类型不正确
- **解决方案**: 检查字段类型

### INVALID_FIELD_VALUE

- **状态码**: 400
- **说明**: 字段值不合法
- **解决方案**: 检查字段值范围

---

## 文件错误

### FILE_NOT_FOUND

- **状态码**: 404
- **说明**: 文件不存在
- **解决方案**: 检查文件路径

### FILE_ACCESS_DENIED

- **状态码**: 403
- **说明**: 无权访问文件
- **解决方案**: 检查文件权限

### FILE_TOO_LARGE

- **状态码**: 413
- **说明**: 文件过大
- **解决方案**: 使用更小的文件，或增加限制

### FILE_READ_ERROR

- **状态码**: 500
- **说明**: 读取文件失败
- **解决方案**: 检查文件是否损坏

### FILE_WRITE_ERROR

- **状态码**: 500
- **说明**: 写入文件失败
- **解决方案**: 检查磁盘空间，文件权限

---

## 网络错误

### NETWORK_ERROR

- **状态码**: 503
- **说明**: 网络连接失败
- **解决方案**:
  - 检查网络连接
  - 检查代理设置
  - 重试

### CONNECTION_TIMEOUT

- **状态码**: 504
- **说明**: 连接超时
- **解决方案**:
  - 检查网络状况
  - 增加超时时间

### DNS_ERROR

- **状态码**: 503
- **说明**: DNS 解析失败
- **解决方案**:
  - 检查域名
  - 检查 DNS 配置

---

## 系统错误

### INTERNAL_ERROR

- **状态码**: 500
- **说明**: 服务器内部错误
- **解决方案**: 查看日志，联系支持

### NOT_IMPLEMENTED

- **状态码**: 501
- **说明**: 功能未实现
- **解决方案**: 等待更新，或使用替代方案

### SERVICE_UNAVAILABLE

- **状态码**: 503
- **说明**: 服务暂时不可用
- **解决方案**: 稍后重试

### RESOURCE_EXHAUSTED

- **状态码**: 503
- **说明**: 资源耗尽
- **解决方案**:
  - 减少并发
  - 增加资源

---

## 插件错误

### PLUGIN_NOT_FOUND

- **状态码**: 404
- **说明**: 插件不存在
- **解决方案**: 检查插件名称，确认已安装

### PLUGIN_LOAD_FAILED

- **状态码**: 500
- **说明**: 插件加载失败
- **解决方案**:
  - 检查插件兼容性
  - 查看插件日志

### PLUGIN_ACTIVATION_FAILED

- **状态码**: 500
- **说明**: 插件激活失败
- **解决方案**: 检查插件配置

### PLUGIN_DEPENDENCY_MISSING

- **状态码**: 424
- **说明**: 缺少依赖
- **解决方案**: 安装缺失的依赖

---

## 按状态码分类

### 2xx - 成功

- 200 OK - 请求成功
- 201 Created - 创建成功
- 204 No Content - 无返回内容

### 4xx - 客户端错误

- 400 Bad Request - 请求格式错误
- 401 Unauthorized - 未认证
- 403 Forbidden - 无权限
- 404 Not Found - 资源不存在
- 408 Request Timeout - 请求超时
- 409 Conflict - 资源冲突
- 410 Gone - 资源已删除
- 413 Payload Too Large - 请求体过大
- 422 Unprocessable Entity - 无法处理
- 429 Too Many Requests - 请求过于频繁

### 5xx - 服务器错误

- 500 Internal Server Error - 内部错误
- 501 Not Implemented - 未实现
- 502 Bad Gateway - 网关错误
- 503 Service Unavailable - 服务不可用
- 504 Gateway Timeout - 网关超时

---

## 错误处理示例

```typescript
try {
  const result = await tool.execute(params, ctx)
} catch (err) {
  if (err.code === "PERMISSION_DENIED") {
    // 请求权限
    await ctx.ask({ permission: err.permission })
  } else if (err.code === "TOOL_NOT_FOUND") {
    // 提示工具不存在
    return {
      title: "Error",
      output: `工具 ${err.tool} 不存在`,
    }
  } else if (err.code === "PROVIDER_RATE_LIMITED") {
    // 等待后重试
    await sleep(1000)
    return tool.execute(params, ctx)
  } else {
    // 未知错误
    console.error("Unexpected error:", err)
    throw err
  }
}
```

---

**遇到错误时，先查看错误码和详情，再采取对应的解决方案！**
