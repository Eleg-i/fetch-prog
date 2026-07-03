<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
# Changelog

- [v1.1.1](#v111)
- [v1.1.0](#v110)
- [v1.0.2](#v102)
- [v1.0.1](#v101)
- [v0.1.0](#v010)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

### v1.1.1

- 新增 `PATCH` 请求的运行时支持。
- 实现 `paramsSerializer`，用于 GET 类请求的查询参数序列化。
- `guard()` 现在会返回拦截器 id，`unGuard()` 移除拦截器时不再移动后续 id。
- 清理对象 `data` 中的 `undefined` 字段时，不再修改调用方传入的原始对象。
- `FormData` 请求不再自动设置 `content-type`，由浏览器生成 multipart boundary。
- 在英文和中文 README 中新增 API 参考文档入口。
- 新增基于 Vitest 的 API 行为测试，以及由 `tsc` 驱动的 TypeScript 类型用例测试。

### v1.1.0

- **Breaking (types)：** 移除内置 `ModResponse` / `FetchResponse<T>`，新增 `ExtendableResponse<E>` 作为中性的 `Response` 扩展占位类型。
- `fetch` 现在返回 `Promise<TRes>`，其中 `TRes` 表示拦截器链最终返回结果，默认类型为 `ExtendableResponse`。
- 为请求 `data` 新增双模式泛型：宽松可序列化校验（`fetch<TRes>`）和严格请求体契约匹配（`fetch<TRes, DataT>`）。
- 导出 `SerializableParam`、`LooseFetchData`、`LooseSerializableRoot`。
- 更新英文和中文 README，补充 TypeScript 与类型说明文档。

### v1.0.2

- 修改 README.md 中的示例代码

### v1.0.1

- 正式发布

### v0.1.0

- 创建
