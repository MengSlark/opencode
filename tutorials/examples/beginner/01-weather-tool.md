# 初级项目：天气查询工具

> 🎯 难度：初级 | ⏱️ 预计时间：2-3 天 | 📦 目标：完成第一个工具开发

本项目将带你从零开始创建一个完整的天气查询工具，适合初学者练手。

---

## 1. 项目目标

### 1.1 功能需求

- 查询指定城市的天气
- 显示温度、湿度、风速等信息
- 支持未来 3 天预报
- 友好的输出格式

### 1.2 技术要点

- 工具定义（Tool.define）
- API 调用（fetch）
- 数据格式化
- 错误处理

---

## 2. 准备工作

### 2.1 注册天气 API

1. 前往 [OpenWeatherMap](https://openweathermap.org/)
2. 注册免费账户
3. 获取 API Key
4. 记录 API Key（格式类似：`a1b2c3d4e5f6...`）

### 2.2 环境配置

```bash
# 添加到环境变量
export OPENWEATHER_API_KEY="your-api-key"

# 或者添加到 .env 文件
echo "OPENWEATHER_API_KEY=your-api-key" >> .env
```

---

## 3. 开发步骤

### 步骤 1: 创建工具文件

```bash
touch packages/opencode/src/tool/weather.ts
touch packages/opencode/test/tool/weather.test.ts
```

### 步骤 2: 编写工具代码

```typescript
// packages/opencode/src/tool/weather.ts

import z from "zod"
import { Tool } from "./tool"

const API_KEY = process.env.OPENWEATHER_API_KEY
const BASE_URL = "https://api.openweathermap.org/data/2.5"

export const WeatherTool = Tool.define("weather", {
  description: `
    查询指定城市的天气信息。
    
    功能：
    - 查询当前天气（温度、湿度、风速等）
    - 查询未来 3 天预报
    
    使用示例：
    - 查询北京天气: { "city": "Beijing" }
    - 查询上海当前天气: { "city": "Shanghai", "type": "current" }
    - 查询广州预报: { "city": "Guangzhou", "type": "forecast" }
    
    注意：
    - 城市名使用英文（如 Beijing, Shanghai）
    - 支持全球主要城市
  `,

  parameters: z.object({
    city: z.string().describe("城市名称（英文，如 Beijing, Shanghai, Tokyo）"),

    type: z.enum(["current", "forecast"]).default("current").describe("查询类型：current-当前天气, forecast-未来预报"),
  }),

  async execute(params, ctx) {
    // 检查 API Key
    if (!API_KEY) {
      return {
        title: "Weather Error",
        output: "错误：未配置 OPENWEATHER_API_KEY 环境变量",
        metadata: { error: "missing_api_key" },
      }
    }

    try {
      let data: any

      if (params.type === "current") {
        // 查询当前天气
        const response = await fetch(`${BASE_URL}/weather?q=${params.city}&appid=${API_KEY}&units=metric&lang=zh_cn`)

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.message || "API request failed")
        }

        data = await response.json()

        // 格式化当前天气
        const output = formatCurrentWeather(data)

        return {
          title: `Weather: ${data.name}`,
          output,
          metadata: {
            city: data.name,
            country: data.sys.country,
            temperature: data.main.temp,
            humidity: data.main.humidity,
            windSpeed: data.wind.speed,
          },
        }
      } else {
        // 查询预报
        const response = await fetch(
          `${BASE_URL}/forecast?q=${params.city}&appid=${API_KEY}&units=metric&lang=zh_cn&cnt=24`,
        )

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.message || "API request failed")
        }

        data = await response.json()

        // 格式化预报
        const output = formatForecast(data)

        return {
          title: `Forecast: ${data.city.name}`,
          output,
          metadata: {
            city: data.city.name,
            country: data.city.country,
            forecastCount: data.list.length,
          },
        }
      }
    } catch (err) {
      return {
        title: "Weather Error",
        output: `查询失败: ${err.message}\n\n请检查:\n1. 城市名称是否正确（使用英文）\n2. API Key 是否有效\n3. 网络连接是否正常`,
        metadata: { error: err.message },
      }
    }
  },
})

// 格式化当前天气
function formatCurrentWeather(data: any): string {
  const weather = data.weather[0]
  const main = data.main
  const wind = data.wind

  return `
🌍 ${data.name}, ${data.sys.country}

🌡️ 温度: ${main.temp}°C (体感 ${main.feels_like}°C)
🌤️ 天气: ${weather.description}
💧 湿度: ${main.humidity}%
💨 风速: ${wind.speed} m/s
👁️ 能见度: ${data.visibility / 1000} km
🌅 日出: ${formatTime(data.sys.sunrise)}
🌇 日落: ${formatTime(data.sys.sunset)}

更新时间: ${formatTime(data.dt)}
  `.trim()
}

// 格式化预报
function formatForecast(data: any): string {
  const city = data.city
  const forecasts = data.list

  // 按天分组
  const dailyForecasts = groupByDay(forecasts)

  let output = `🌍 ${city.name}, ${city.country}\n\n未来 3 天预报:\n`

  for (const [date, items] of Object.entries(dailyForecasts).slice(0, 3)) {
    const dayData = items as any[]
    const avgTemp = dayData.reduce((sum, i) => sum + i.main.temp, 0) / dayData.length
    const weather = dayData[0].weather[0]

    output += `
📅 ${date}
   平均温度: ${avgTemp.toFixed(1)}°C
   天气: ${weather.description}
   降水概率: ${(dayData[0].pop * 100).toFixed(0)}%
    `
  }

  return output.trim()
}

// 按天分组
function groupByDay(forecasts: any[]): Record<string, any[]> {
  const groups: Record<string, any[]> = {}

  for (const item of forecasts) {
    const date = new Date(item.dt * 1000).toLocaleDateString("zh-CN")
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(item)
  }

  return groups
}

// 格式化时间
function formatTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  })
}
```

### 步骤 3: 编写测试

```typescript
// packages/opencode/test/tool/weather.test.ts

import { describe, expect, test } from "bun:test"
import { WeatherTool } from "../../src/tool/weather"

const mockCtx = {
  sessionID: "test",
  messageID: "",
  callID: "",
  agent: "test",
  abort: AbortSignal.any([]),
  ask: async () => {},
  metadata: () => {},
}

describe("tool.weather", () => {
  test(
    "should format current weather",
    async () => {
      // 需要真实的 API Key 才能测试
      if (!process.env.OPENWEATHER_API_KEY) {
        console.log("跳过测试：未配置 OPENWEATHER_API_KEY")
        return
      }

      const tool = await WeatherTool.init()
      const result = await tool.execute(
        {
          city: "Beijing",
          type: "current",
        },
        mockCtx,
      )

      expect(result.metadata.city).toBe("Beijing")
      expect(result.metadata.temperature).toBeDefined()
      expect(result.output).toContain("温度")
    },
    { timeout: 30000 },
  )

  test(
    "should format forecast",
    async () => {
      if (!process.env.OPENWEATHER_API_KEY) {
        console.log("跳过测试：未配置 OPENWEATHER_API_KEY")
        return
      }

      const tool = await WeatherTool.init()
      const result = await tool.execute(
        {
          city: "Shanghai",
          type: "forecast",
        },
        mockCtx,
      )

      expect(result.metadata.city).toBe("Shanghai")
      expect(result.output).toContain("预报")
    },
    { timeout: 30000 },
  )

  test("should handle missing api key", async () => {
    const originalKey = process.env.OPENWEATHER_API_KEY
    delete process.env.OPENWEATHER_API_KEY

    const tool = await WeatherTool.init()
    const result = await tool.execute(
      {
        city: "Beijing",
      },
      mockCtx,
    )

    expect(result.metadata.error).toBe("missing_api_key")

    // 恢复
    process.env.OPENWEATHER_API_KEY = originalKey
  })

  test(
    "should handle invalid city",
    async () => {
      if (!process.env.OPENWEATHER_API_KEY) {
        console.log("跳过测试：未配置 OPENWEATHER_API_KEY")
        return
      }

      const tool = await WeatherTool.init()
      const result = await tool.execute(
        {
          city: "InvalidCityName12345",
        },
        mockCtx,
      )

      expect(result.metadata.error).toBeDefined()
    },
    { timeout: 30000 },
  )
})
```

### 步骤 4: 运行和验证

```bash
# 1. 运行测试
cd packages/opencode
OPENWEATHER_API_KEY=your-key bun test test/tool/weather.test.ts

# 2. 类型检查
bun typecheck

# 3. 运行 opencode 并测试
bun run src/index.ts

# 在会话中输入：
# "查询北京天气"
# "查看上海未来天气"
```

---

## 4. 扩展功能（可选）

### 4.1 添加更多天气指标

```typescript
// 空气质量指数
const airQualityResponse = await fetch(
  `http://api.openweathermap.org/data/2.5/air_pollution?lat=${data.coord.lat}&lon=${data.coord.lon}&appid=${API_KEY}`,
)
```

### 4.2 支持坐标查询

```typescript
// 支持经纬度查询
parameters: z.object({
  city: z.string().optional(),
  lat: z.number().optional(),
  lon: z.number().optional(),
}).refine((data) => data.city || (data.lat && data.lon), {
  message: "必须提供城市名或经纬度",
})
```

### 4.3 添加缓存

```typescript
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 10 * 60 * 1000  // 10 分钟

async execute(params, ctx) {
  const cacheKey = `${params.city}-${params.type}`
  const cached = cache.get(cacheKey)

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }

  // ... 获取数据

  cache.set(cacheKey, { data: result, timestamp: Date.now() })
  return result
}
```

---

## 5. 项目总结

### 学到的技能

✅ **工具开发**: Tool.define 的使用
✅ **API 调用**: fetch 和错误处理
✅ **数据格式化**: 将 JSON 转换为可读文本
✅ **环境配置**: 使用环境变量
✅ **测试编写**: 单元测试和集成测试

### 项目结构

```
packages/opencode/
├── src/
│   └── tool/
│       ├── weather.ts        # 主文件 ✅
│       └── ...
└── test/
    └── tool/
        ├── weather.test.ts   # 测试文件 ✅
        └── ...
```

### 检查清单

- [ ] 成功创建 weather.ts
- [ ] 工具可以正常调用 API
- [ ] 格式化输出美观
- [ ] 错误处理完善
- [ ] 测试通过

---

## 6. 常见问题

### Q: API 调用失败？

**A:**

- 检查 API Key 是否正确
- 检查网络连接
- 查看错误信息中的具体原因

### Q: 城市名称不认识？

**A:**

- 使用英文城市名（如 Beijing, Shanghai）
- 可以在 OpenWeatherMap 网站上搜索确认

### Q: 数据格式不对？

**A:**

- 打印原始响应检查结构
- 查看 API 文档了解字段含义

---

**恭喜！你完成了第一个完整的工具开发！** 🎉
