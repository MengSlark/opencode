# API 端点详解

> 📚 难度：中级 | ⏱️ 预计时间：2-3 天 | 🎯 目标：掌握所有 API 端点

本教程详细列出 OpenCode 的所有 API 端点及其使用方法。

---

## 1. 会话管理 API

### 1.1 列出现有会话

```
GET /sessions
```

**Query 参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| limit | number | 否 | 返回数量，默认 10 |
| offset | number | 否 | 偏移量，默认 0 |
| projectId | string | 否 | 按项目筛选 |

**响应**:

```json
{
  "data": [
    {
      "id": "sess_xxx",
      "title": "会话标题",
      "projectId": "proj_xxx",
      "createdAt": "2024-01-15T10:00:00Z",
      "messageCount": 10
    }
  ],
  "total": 42
}
```

### 1.2 创建新会话

```
POST /sessions
```

**请求体**:

```json
{
  "projectId": "proj_xxx",
  "model": "gpt-4",
  "title": "新会话"
}
```

**响应**:

```json
{
  "id": "sess_yyy",
  "title": "新会话",
  "projectId": "proj_xxx",
  "status": "active",
  "createdAt": "2024-01-15T10:00:00Z"
}
```

### 1.3 获取会话详情

```
GET /sessions/:id
```

**响应**:

```json
{
  "id": "sess_xxx",
  "title": "会话标题",
  "projectId": "proj_xxx",
  "status": "active",
  "messages": [
    {
      "role": "user",
      "content": "你好"
    },
    {
      "role": "assistant",
      "content": "你好！有什么可以帮你的？"
    }
  ],
  "metadata": {
    "model": "gpt-4",
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:05:00Z"
  }
}
```

### 1.4 删除会话

```
DELETE /sessions/:id
```

**响应**:

```json
{
  "success": true
}
```

### 1.5 发送消息

```
POST /sessions/:id/messages
```

**请求体**:

```json
{
  "content": "帮我查找 TODO",
  "attachments": []
}
```

**响应**:

```json
{
  "success": true,
  "messageId": "msg_xxx"
}
```

---

## 2. 工具调用 API

### 2.1 列出可用工具

```
GET /tools
```

**响应**:

```json
{
  "data": [
    {
      "name": "grep",
      "description": "搜索代码",
      "parameters": {
        "type": "object",
        "properties": {
          "pattern": { "type": "string" },
          "path": { "type": "string" }
        },
        "required": ["pattern"]
      }
    },
    {
      "name": "read",
      "description": "读取文件",
      "parameters": {
        "type": "object",
        "properties": {
          "path": { "type": "string" }
        },
        "required": ["path"]
      }
    }
  ]
}
```

### 2.2 执行工具

```
POST /tools/:name/execute
```

**Header**:

```
X-Session-ID: sess_xxx
```

**请求体**:

```json
{
  "pattern": "TODO",
  "path": "./src"
}
```

**响应**:

```json
{
  "title": "TODO",
  "output": "找到 5 个结果...",
  "metadata": {
    "matches": 5,
    "truncated": false
  }
}
```

---

## 3. 文件操作 API

### 3.1 读取文件

```
GET /files/read
```

**Query 参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| path | string | 是 | 文件路径 |
| offset | number | 否 | 起始行号 |
| limit | number | 否 | 读取行数 |

**响应**:

```json
{
  "content": "文件内容...",
  "path": "/path/to/file",
  "size": 1024,
  "lines": 50
}
```

### 3.2 列出目录

```
GET /files/list
```

**Query 参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| path | string | 是 | 目录路径 |
| recursive | boolean | 否 | 是否递归 |

**响应**:

```json
{
  "path": "/project",
  "files": [
    { "name": "src", "type": "directory" },
    { "name": "package.json", "type": "file", "size": 1024 }
  ]
}
```

---

## 4. 项目 API

### 4.1 列出项目

```
GET /projects
```

**响应**:

```json
{
  "data": [
    {
      "id": "proj_xxx",
      "name": "My Project",
      "path": "/path/to/project",
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

### 4.2 创建项目

```
POST /projects
```

**请求体**:

```json
{
  "name": "New Project",
  "path": "/path/to/new/project"
}
```

---

## 5. 系统 API

### 5.1 健康检查

```
GET /health
```

**响应**:

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:00:00Z",
  "version": "1.0.0"
}
```

### 5.2 获取配置

```
GET /config
```

**响应**:

```json
{
  "providers": ["openai", "anthropic"],
  "defaultModel": "gpt-4",
  "features": {
    "tools": true,
    "streaming": true
  }
}
```

---

## 6. 错误处理

### 6.1 错误格式

```json
{
  "error": "错误类型",
  "message": "详细错误信息",
  "code": "ERROR_CODE"
}
```

### 6.2 常见错误码

| 状态码 | 错误码          | 说明           |
| ------ | --------------- | -------------- |
| 400    | INVALID_REQUEST | 请求参数错误   |
| 401    | UNAUTHORIZED    | 未授权         |
| 404    | NOT_FOUND       | 资源不存在     |
| 429    | RATE_LIMITED    | 请求过于频繁   |
| 500    | INTERNAL_ERROR  | 服务器内部错误 |

---

## 7. 本章总结

### API 分类

1. **会话管理**: CRUD 操作 + 消息发送
2. **工具调用**: 列出和执行
3. **文件操作**: 读取和列表
4. **项目管理**: 基本的 CRUD
5. **系统接口**: 健康和配置

### 检查清单

- [ ] 掌握所有 API 端点
- [ ] 理解请求/响应格式
- [ ] 会处理错误
- [ ] 能在实际项目中调用

---

**熟悉这些 API，你可以开发自己的客户端！**
