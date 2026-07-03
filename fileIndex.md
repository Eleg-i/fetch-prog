# fetch-prog 文件索引

## 树形快速索引

```
fetch-prog/
├── src/                          # 源码目录
│   ├── index.ts                  # 主入口：Fetch类、拦截器、请求/响应处理核心逻辑
│   ├── types/
│   │   ├── index.ts              # 全局类型声明：可序列化值、对象、数组类型
│   │   └── serializable.ts       # 序列化约束类型：泛型映射式/宽松式两种模式
│   └── utils/
│       ├── bytes.ts              # 进度流处理：ProgressProcessor类、管道流转换
│       ├── formate.ts            # 格式化工具：速度单位转换函数
│       ├── object.ts             # 对象工具：递归删除undefined字段
│       └── url.ts                # URL工具：同源判断、路径拼接、域名检测
├── README.md                     # 英文文档：功能介绍、API用法、TS类型、最佳实践
├── readme/README-zh-cn.md        # 中文文档
├── API.md                        # API文档（待补充）
├── CHANGELOG.md                  # 变更日志
├── Claude.md                     # Claude规则：开发流程、三层索引使用说明
├── package.json                  # 项目配置：依赖、脚本、导出入口
├── tsconfig.json                 # TS配置：编译选项、类型生成
├── vite.config.ts                # 构建配置：Vite/Rolldown打包设置
└── .eslintrc.cjs                 # ESLint配置
```

---

## 文件详细索引

### src/index.ts

**文件类型**: TypeScript
**推荐详细阅读**: 高

**文件摘要**
Fetch 请求库核心实现，包含 Fetch 类、拦截器机制、请求分发（GET/POST）、序列化处理、进度监控集成、错误处理流程。

**关键段落**

| 段落名称 | 行号 | 重要度 | 描述 |
|---------|------|--------|------|
| FetchError 类 | L117-L137 | 中 | 请求错误类，含 status、config、message |
| Interceptors 类 | L143-L184 | 中 | 拦截器管理：use/eject/clear，含错误处理器 |
| Fetch 类构造 | L189-L233 | 高 | 初始化默认配置、拦截器实例 |
| fetch 方法重载 | L248-L271 | 高 | 两种泛型模式：仅校验可序列化 vs 严格契约匹配 |
| fetch 方法实现 | L277-L295 | 高 | 请求分发入口，参数清洗，方法判断 |
| #get 私有方法 | L302-L346 | 中 | GET 请求处理：URL 参数拼接、params 路径注入 |
| #post 私有方法 | L353-L355 | 低 | POST 请求处理，直接调用 #fetch |
| #fetch 核心实现 | L362-L499 | 高 | 请求发送全流程：拦截器链、流进度处理、超时控制、响应处理 |
| handleUploadProgress | L706-L753 | 中 | 流进度包装函数，含中断信号处理 |
| genSerializedData | L656-L668 | 低 | 数据序列化：对象转 JSON，其他类型原样返回 |
| genContentType | L676-L693 | 低 | 根据 data 类型推断 Content-Type |

**详细阅读建议**
优先阅读 Fetch 类定义（L189-L233）、fetch 方法实现（L277-L295）、#fetch 核心流程（L362-L499）。拦截器机制（L143-L184）和错误处理（L509-L595）可延后。

---

### src/types/index.ts

**文件类型**: TypeScript
**推荐详细阅读**: 低（全局声明已隐式生效）

**文件摘要**
全局类型声明文件，扩展了全局类型命名空间，定义可序列化值、对象、数组类型，并扩展 RequestInit 的 duplex 字段。

**关键段落**

| 段落名称 | 行号 | 重要度 | 描述 |
|---------|------|--------|------|
| SerializableValue | L7-L14 | 高 | 基础可序列化值：string/number/boolean/null/undefined/Date/包装类型 |
| SerializableObject | L16-L18 | 高 | 可序列化对象：键为 string|number，值为 Serializable |
| Serializable | L22 | 高 | 联合类型：值 + 数组 + 对象 |
| RequestInit 扩展 | L24-L26 | 中 | 添加 duplex 字段支持流式请求 |

**详细阅读建议**
仅在调试序列化类型或 duplex 配置时参考，日常开发无需深入。

---

### src/types/serializable.ts

**文件类型**: TypeScript
**推荐详细阅读**: 高（类型校验核心）

**文件摘要**
定义两种可序列化请求体类型约束：模式一（LooseFetchData）用于对象字面量宽松校验；模式二（SerializableParam<T>）用于泛型契约式严格校验；ExtendableResponse 用于扩展响应类型。

**关键段落**

| 段落名称 | 行号 | 重要度 | 描述 |
|---------|------|--------|------|
| SerializableValueOf | L10-L21 | 高 | 递归类型映射，排除 any/函数/不可序列化结构 |
| SerializableParam<T> | L48-L49 | 高 | 模式二泛型约束，配合 fetch<ResT, DataT> 使用 |
| LooseSerializableRoot | L62-L63 | 中 | 模式一宽松类型，用于 fetch<ResT> 的 data 参数 |
| LooseFetchData | L66-L72 | 高 | 模式一完整类型，含流/FormData/Blob 等非 JSON 载荷 |
| ExtendableResponse<E> | L85 | 高 | 响应扩展类型占位，支持拦截器注入自定义字段 |

**详细阅读建议**
理解类型校验机制必须阅读。重点关注 SerializableParam（L48-L49）、LooseFetchData（L66-L72）、ExtendableResponse（L85）。泛型映射逻辑（L10-L46）可延后深入。

---

### src/utils/bytes.ts

**文件类型**: TypeScript
**推荐详细阅读**: 中（进度监控功能）

**文件摘要**
进度流处理模块，提供 pipeThroughProgress 和 pipeThroughWithError 两种管道转换函数，ProgressProcessor 类计算进度百分比和传输速度。

**关键段落**

| 段落名称 | 行号 | 重要度 | 描述 |
|---------|------|--------|------|
| Progress 接口 | L3-L9 | 高 | 进度对象结构：progress/speed/speedText/transferred/total |
| pipeThroughProgress | L21-L53 | 中 | 简单管道转换，含中断回调 |
| pipeThroughWithError | L66-L125 | 高 | 带错误处理的管道转换，用于实际请求流 |
| ProgressProcessor 类 | L130-L222 | 高 | 进度计算核心：累计字节、滑动窗口测速、百分比计算 |

**详细阅读建议**
进度监控功能依赖此文件。优先阅读 Progress 接口（L3-L9）、pipeThroughWithError（L66-L125）、ProgressProcessor.process（L178-L221）。

---

### src/utils/formate.ts

**文件类型**: TypeScript
**推荐详细阅读**: 低

**文件摘要**
单一格式化函数 convertSpeed，将字节每秒转换为易读单位（B/s → TB/s），用于进度显示。

**关键段落**

| 段落名称 | 行号 | 重要度 | 描述 |
|---------|------|--------|------|
| convertSpeed | L6-L13 | 高 | 速度单位转换，1000 进位，保留两位小数 |

**详细阅读建议**
仅在需要自定义进度显示格式时参考。

---

### src/utils/object.ts

**文件类型**: TypeScript
**推荐详细阅读**: 低

**文件摘要**
单一工具函数 treeShake，递归删除对象中值为 undefined 的字段，用于请求参数清洗。

**关键段落**

| 段落名称 | 行号 | 重要度 | 描述 |
|---------|------|--------|------|
| treeShake | L6-L17 | 高 | 递归删除 undefined 字段，原地修改对象 |

**详细阅读建议**
仅在调试参数清洗行为时参考。

---

### src/utils/url.ts

**文件类型**: TypeScript
**推荐详细阅读**: 中

**文件摘要**
URL 处理工具集，包含同源判断（isSameOrigin）、路径拼接（joinPath）、域名检测（withOrigin），用于请求 URL 构建和跨域判断。

**关键段落**

| 段落名称 | 行号 | 重要度 | 描述 |
|---------|------|--------|------|
| isSameOrigin | L9-L14 | 高 | 判断请求 URL 是否与当前页面同源 |
| joinPath | L22-L44 | 高 | 安全拼接路径，处理编码和斜杠 |
| withOrigin | L51-L54 | 中 | 判断 URL 是否包含完整域名 |

**详细阅读建议**
URL 构建逻辑依赖此文件。优先阅读 joinPath（L22-L44）。

---

### README.md

**文件类型**: Markdown
**推荐详细阅读**: 高（功能参考）

**文件摘要**
英文功能文档，介绍 fetch-prog 的特性、安装、基本用法、TypeScript 类型系统、进度监控、拦截器机制、错误处理、请求配置选项、最佳实践。

**关键段落**

| 段落名称 | 行号 | 重要度 | 描述 |
|---------|------|--------|------|
| Description | L5-L8 | 高 | 库定位：基于 Fetch API 的增强请求库 |
| TypeScript Support | L66-L187 | 高 | 类型系统详解：ExtendableResponse、SerializableParam、泛型用法 |
| Progress Monitoring | L189-L244 | 高 | 文件上传进度示例，含 throttle 优化 |
| Interceptors | L247-L314 | 高 | 拦截器添加/错误处理/移除示例 |
| Request Options | L317-L333 | 中 | 配置参数表：url/method/headers/timeout/withCredentials 等 |
| Progress Interface | L336-L347 | 中 | Progress 对象字段定义 |
| Best Practices | L453-L467 | 中 | 单例实例、拦截器认证、超时设置、节流优化建议 |

**详细阅读建议**
完整阅读 TypeScript 类型部分（L66-L187）和拦截器部分（L247-L314）。进度监控示例（L189-L244）可按需参考。

---

### Claude.md

**文件类型**: Markdown
**推荐详细阅读**: 高（开发流程）

**文件摘要**
Claude AI 开发规则文档，定义项目开发流程、三层索引使用方法、TDD 规范、测试框架配置、代码注释要求、verify 问题处理规则。

**关键段落**

| 段落名称 | 行号 | 重要度 | 描述 |
|---------|------|--------|------|
| 配套文档 | L6-L10 | 高 | 索引文件列表：filesIndex.md、codegraph、开发计划.md、测试用例.md |
| 规则 | L12-L21 | 高 | TDD 规范、三层索引调用顺序、类型注释要求 |
| 三层索引说明 | L17-L19 | 高 | codegraph → codebase-memory-mcp → filesIndex.md |
| 工作流 | L24-L26 | 中 | 开发计划制定流程 |

**详细阅读建议**
开发前必读。重点理解三层索引使用顺序（L17-L19）和 TDD 规范（L13-L16）。

---

### package.json

**文件类型**: JSON
**推荐详细阅读**: 中

**文件摘要**
项目配置文件，定义包名、版本、导出入口、依赖、脚本命令（构建/校验/发布流程）。

**关键段落**

| 段落名称 | 行号 | 重要度 | 描述 |
|---------|------|--------|------|
| exports | L15-L20 | 高 | ESM/CJS 双入口配置 |
| scripts.verify | L51 | 高 | 类型检查 + Prettier + ESLint 组合命令 |
| scripts.build | L47 | 中 | Vite 构建命令 |
| dependencies | L90-L92 | 低 | 仅依赖 es-toolkit |

**详细阅读建议**
快速浏览导出配置（L15-L20）和脚本命令（L44-L60）即可。

---

## 建议阅读优先级

| 优先级 | 文件 | 理由 |
|--------|------|------|
| 1 | src/index.ts | 核心请求逻辑，理解库行为必读 |
| 2 | src/types/serializable.ts | 类型校验核心，泛型模式理解必读 |
| 3 | README.md | 功能文档，API 用法参考 |
| 4 | Claude.md | 开发规则，流程和规范必读 |
| 5 | src/utils/bytes.ts | 进度监控功能，按需阅读 |
| 6 | src/utils/url.ts | URL 构建逻辑，调试时参考 |
| 7 | package.json | 配置入口，发布/构建时参考 |

---

> Token 节省建议：若主 Agent 计划大规模读取文件内容，应先利用本索引定位高价值文件与关键行段，再定向阅读，避免无差别全文展开。