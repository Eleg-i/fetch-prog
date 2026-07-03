<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
# Changelog

- [v1.0.3](#v103)
- [v1.0.2](#v102)
- [v1.0.1](#v101)
- [v0.1.0](#v010)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

### v1.0.3

- **Breaking (types):** Remove built-in `ModResponse` / `FetchResponse<T>`. Add `ExtendableResponse<E>` as a neutral `Response` extension placeholder.
- `fetch` now returns `Promise<TRes>` where `TRes` is the interceptor chain result (default `ExtendableResponse`).
- Add dual-mode generics for request `data`: loose serializable check (`fetch<TRes>`) and strict schema match (`fetch<TRes, DataT>`).
- Export `SerializableParam`, `LooseFetchData`, `LooseSerializableRoot`.
- Update README (EN/ZH) with TypeScript and typing documentation.

### v1.0.2

- 修改 README.md 中的示例代码

### v1.0.1

- 正式发布

### v0.1.0

- 创建
