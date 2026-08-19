# sm-context-piano 最终设计

## 1. 产品标准

产品以 Codex 的可观察琴键导航行为为准：

1. 左侧是一组固定窗口、集中排列的短横线；
2. 只显示用户消息和模型可见文本输出；
3. 工具、编辑、命令、推理和内部状态永远不生成琴键；
4. 连续模型输出合并，非输出内容会截断连续性；
5. 默认最多显示活动节点前后的 20 根琴键，数量、粗细与间距允许用户配置；
6. 悬停产生水平波形和内容预览，点击跳转；
7. 滚动时窗口重新以当前阅读节点为中心。

## 2. DSH 接入边界

宿主入口只注册 `sm-context-piano` 设置命名空间；导航、预览和设置 UI 均在浏览器端完成。客户端使用：

- [data-chat-flow]：有序 ChatView 内容；
- [data-chat-anchor-key]：行级定位锚点；
- [data-conversation-scroll]：滚动容器；
- ConversationSnapshot.chat.order/nodes：业务节点顺序和内容。

插件通过官方 `settings.section` 注册一级设置页，排序值为 21，紧随排序值 20 的 Agent Presets。设置由 `ctx.settingsScope` 读取和写入宿主；插件不注册 HTTP 路由、不访问 token meter、不写 systemPrompt，也不修改 Session。

## 3. 可见节点生成

    snapshot.chat.order
            │ 逐项读取 ChatConversationViewNode
            ▼
    buildNavigationNodes()
            │
            ├─ user / steering → 用户琴键
            ├─ assistant / assistant-step 的 text block → 模型输出琴键
            └─ 其他 kind → 只作为连续性边界，不创建琴键

### 用户节点

- 读取用户 ContentBlock 中的纯文本和图片占位；
- title 使用第一条有效文本行并去除常见 Markdown 前缀；
- preview 最长 520 字符。

### 模型输出节点

- 只读取 kind 等于 text 的 block；
- reasoning、tool-call 和其他 block 会结束当前输出段；
- 相邻 assistant 行若 turn 相同且前后都是 text，则合并为同一琴键；
- tool/edit/read 等独立业务行会结束连续输出，后续模型文本建立新琴键；
- 模型琴键稳定使用“行 key::output:序号”，避免流式内容从一段变多段时更换 DOM key。

同一 ChatView 行内的多段输出可以生成多个琴键，但当前 Harness 只提供行级锚点，因此这些琴键点击后都定位到该行起点。

## 4. 固定琴键窗口

默认值：

- 最大可见数量：20；
- 琴键中心间距：12px；
- 琴键高度：2px；
- 自动轨道高度：(最大可见数量 - 1) × 中心间距 + 琴键高度，默认 230px；
- 默认宽度：10px；
- 当前节点宽度：24px；
- 悬停最大宽度：48px。

当总节点数小于最大可见数量时，全部节点在计算后的轨道内垂直居中；数量超过上限时，只显示一个固定窗口，不压缩间距。

    windowStart = clamp(
      activeIndex - floor(visibleCount / 2),
      0,
      totalCount - visibleCount
    )

默认 20 为偶数，因此普通位置下当前节点前方最多 10 个、后方最多 9 个；接近首尾时窗口自动贴边。用户修改上限后使用同一算法。

### 浏览更早或更晚节点

点击当前窗口顶部琴键后：

1. 立即把它设置为 current；
2. 立即重算固定窗口；
3. 平滑滚动到该节点；
4. 新窗口显示它前面的更早节点。

底部琴键同理。窗口重算不依赖浏览器一定触发 scroll 事件。

## 5. 交互

### 悬停

轨道整体接收 Pointer Events。最近琴键获得预览，其相邻琴键按当前设置的中心间距计算高斯宽度衰减；纵向位置不会展开或重新分布。

### 点击

跳转位置为目标行内容坐标减 16px。减少动画模式下即时滚动，否则平滑滚动。

### 当前阅读节点

阅读线为视口顶部以下 min(120px, 18%视口高度)。滚动跨越节点后更新 current，并按当前上限重新计算琴键窗口。

### 键盘

- ArrowUp/ArrowDown：当前窗口内相邻琴键；
- Home/End：当前窗口首尾；
- Enter/Space：跳转；
- Escape：关闭预览。

## 6. 设置契约

- namespace：`sm-context-piano`；
- `enabled`：布尔值，默认开启；
- `keyHeight`：1–4 的整数，默认 2；
- `keyGap`：6–18 的整数，默认 12；
- `maxVisible`：5–30 的整数，默认 20；
- 所有字段由宿主 schema 与自定义校验共同约束，客户端解码时仍做边界保护；
- 写入采用 DSH live settings，变更后无需刷新页面；
- 关闭时完整卸载琴键 DOM 和监听，重新开启时重新绑定当前 ChatView；
- 设置页中的黑色透明 PNG 只作页内品牌图，不改变左侧导航的官方齿轮回退；
- “恢复默认值”通过逐字段 unset 返回宿主默认值。

## 7. 生命周期和性能

- document MutationObserver 只发现 ChatView 挂载/卸载；
- flow MutationObserver 只观察直接子行增删；
- ResizeObserver 监听根、滚动容器和消息列；
- pointer、scroll 和 layout 分别通过 rAF 合并；
- DOM 以稳定 key 增量复用；
- 卸载时清理 DOM、样式、Observer、监听器、timer 和 rAF。

## 8. 安全

- 不使用 innerHTML；
- 无网络请求或宿主接口；
- 预览只通过 textContent 写入；
- tool/edit/reasoning 内容不进入 KeyDescriptor；
- 错误日志不包含会话正文。

## 9. 文件职责

    src/index.ts             宿主设置 schema 与 namespace 注册
    src/core/config.ts       跨宿主/客户端的设置默认值、边界与高度公式
    src/client/index.ts      客户端设置页注册与导航 apply/effect
    src/client/settings-page.tsx  一级设置页和关于信息
    src/client/keys.ts       用户和可见模型输出分段
    src/client/strip.ts      固定窗口、琴键交互与生命周期
    src/client/tooltip.ts    安全预览 DOM
    src/client/styles.ts     Codex 式琴键与浮层样式
    src/client/locales.ts    导航可访问名称
    images/sm-context-piano-icon.png  设置页黑色透明 PNG 图标
    scripts/grouping.mjs     输出分段和窗口纯逻辑测试
    scripts/smoke.mjs        构建产物测试
    scripts/integration.mjs  jsdom 交互集成测试
