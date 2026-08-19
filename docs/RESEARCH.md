# DeepSeek Harness 接入依据

## 1. 官方架构

DeepSeek Harness 采用插件化架构。Web profile 通过 bundle row 加载包的宿主入口，并根据 `package.json` 中的 `dsh.client` 声明加载浏览器入口。

本插件的宿主入口只注册设置命名空间；导航、预览和设置界面在浏览器端执行。

## 2. ChatView 契约

当前 DeepSeek Harness ChatView 提供：

- `[data-chat-flow]`：有序业务节点列表；
- `[data-chat-anchor-key]`：稳定节点 key，同时被 ChatView 自身用于滚动锚点；
- `[data-conversation-scroll]`：活动会话的滚动容器；
- `ConversationSnapshot.chat.order`：节点渲染顺序；
- `ConversationSnapshot.chat.nodes`：按 key 读取当前节点。

插件使用 snapshot 生成安全文本描述，再与实际 DOM 行按 key 对齐。这样数据不依赖抓取页面正文，定位也不依赖易变化的 CSS module 类名。

## 3. 为什么不使用 conversation.view

`conversation.view` 是完整会话视图入口。注册新 view 会形成另一个视图，而不是在默认 ChatView 左侧增加导航轨道；替换默认视图还会复制 Harness 自身的分页、滚动、工具行和消息渲染逻辑。

因此当前选择是哨兵式 DOM 增强：只添加导航层，不接管聊天视图。

## 4. 官方设置契约

DeepSeek Harness 通过 `settings.section` 允许插件注册一级设置页，通过 `ctx.settingsScope` 将浏览器设置表单绑定到宿主 settings namespace。本插件使用排序值 21，因此位于排序值 20 的官方 Agent Presets 后方；未被官方导航图标表识别的插件 id 由设置外壳统一显示齿轮图标。

宿主注册 `sm-context-piano` namespace 和强校验 schema，客户端只通过该 scope 读取、set 或 unset，不建立第二套 localStorage 配置。页内 PNG 图标以 data URL 内嵌客户端 bundle，避免 DSH CJS 模块加载器下相对资源地址错误解析到应用根目录。

## 5. 为什么宿主端只注册设置

琴键导航只需要浏览器已有的 ConversationSnapshot 和 DOM 行。增加 token 测量路由、会话读取接口或 systemPrompt 会带来额外依赖、攻击面和模型上下文污染，却不能改善 Codex 式导航体验。

除设置 namespace 外，最终实现明确保证：

- 不注册 HTTP 路由；
- 不访问 token meter；
- 不写 systemPrompt；
- 不修改 Session；
- 不改变模型可见上下文。

## 6. 兼容策略

- 依赖锁定到本项目当前使用的 DeepSeek Harness `0.1.0-rc.6` 系列。
- DOM 锚点不存在时插件保持静默，不影响 Web shell 启动。
- session binding 延迟出现时最多重试 20 次，每次 300ms。
- 上游若更改三个 `data-*` 锚点，需要同步更新选择器和集成测试。

## 7. 验证边界

构建产物测试和 jsdom 测试验证了当前契约，但不会替代真实 DSH Web GUI 的视觉目检。项目文档只陈述已经由代码和自动化验证支持的行为，不把旧版本记录或计划当作当前事实。
