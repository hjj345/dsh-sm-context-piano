# sm-context-piano 最终设计

## 1. 产品标准

最终产品是 Codex 式对话快速导航，而不是上下文统计或编辑面板。

核心交互：

1. 左侧显示紧凑横线轨道；
2. 横线默认对应用户可感知的语义主组；
3. 同回合助手步骤和工具链默认折叠，靠近主组时动态展开；
4. 鼠标沿整条轨道连续移动，最近节点与相邻节点形成平滑伸缩波形；
5. 悬停显示内容预览；
6. 点击跳转；
7. 滚动时高亮当前阅读节点。

## 2. DSH 接入边界

插件保持双入口包结构，但宿主入口是惰性的：

```text
src/index.ts          空宿主入口，只用于让 profile bundle 加载客户端
src/client/index.ts   注册语言、样式和琴键控制器
```

客户端使用：

- `[data-chat-flow]`：ChatView 消息列；
- `[data-chat-anchor-key]`：业务节点行；
- `[data-conversation-scroll]`：官方滚动容器；
- `ctx.sessions`：当前会话和 ConversationSnapshot。

插件不使用宿主路由、token meter 或 systemPrompt。

## 3. 数据流

```text
ctx.sessions 当前会话
        │
        ▼
snapshot.chat.order + snapshot.chat.nodes
        │ describeNode（纯文本、安全截断）
        ▼
KeyDescriptor[] → buildNavigationGroups()
        │ 过滤瞬时状态、合并同回合助手步骤、归并工具链
        ▼
NavigationGroup[]
        │ 与 data-chat-anchor-key 行进行 key 对齐
        ▼
真实 contentY → railY 投影 → 增量琴键 DOM
```

快照更新时以原始节点 key 复用现有 `<button>`，不会清空整条轨道。默认只显示每组主琴键，组内子琴键保留在 DOM 中但处于折叠状态。

## 4. 几何与视觉参数

- 轨道宽度：58px；
- 轨道高度：聊天根高度的 44%，下限 220px，上限 520px；
- 轨道位置：垂直居中，优先位于消息列左侧 108px；
- 窗口下限：根宽度小于 520px 或左侧空间不足时隐藏；
- 琴键基础宽度：10px；
- 当前阅读节点：24px；
- 悬停节点：48px，当前节点悬停时上限 52px；
- 琴键高度：2–4px；
- 相邻主组最小投影间距：最多 10px，主组极密时自动缩小；
- 子节点展开间距：最多 12px，单组展开范围优先限制在 168px 和轨道内部；
- 浮层最大宽度：560px，圆角 16px。

节点纵坐标来自消息行相对于滚动内容的真实位置。第一和最后节点映射到轨道边界，中间节点保持实际内容间距；碰撞处理只保证顺序和可辨识度，不改节点顺序。

## 5. 交互状态

### 悬停

轨道本身接收 Pointer Events，琴键不单独抢占鼠标。每帧先选出距离光标最近的语义主组：多节点组展开后保持其交互区域，避免相邻主组抢走外侧子节点；再选出最近子节点，并以高斯衰减计算周边琴键宽度。

### 点击

点击使用当前悬停节点；若没有悬停状态，则根据点击纵坐标选择最近节点。目标位置是消息内容坐标减 16px。减少动画模式下使用即时滚动，否则使用平滑滚动。

### 当前阅读节点

滚动事件通过 rAF 合并。阅读线为视口顶部以下 `min(120px, 18%视口高度)`，用节点内容坐标确定当前项，并立即刷新颜色和宽度。

### 键盘

- `ArrowUp` / `ArrowDown`：相邻节点；
- `ArrowRight`：展开当前语义组；
- `ArrowLeft`：收拢当前语义组；
- `Home` / `End`：首尾节点；
- `Enter` / `Space`：跳转；
- `Escape`：关闭预览。

## 6. 生命周期与性能

- document MutationObserver 只负责发现 ChatView 的挂载和卸载；已挂载时不扫描流式 DOM。
- flow MutationObserver 只观察直接子行增删。
- ResizeObserver 监听根、滚动容器和消息列尺寸。
- scroll、pointer 和 layout 分别通过 rAF 合并。
- 会话切换时解绑旧 session、清空旧 markers，并为延迟 materialize 的 binding 做有限重试。
- 卸载时回收全部 DOM、Observer、监听器、timer 和 rAF。

## 7. 安全

- 无 HTTP 接口；
- 无模型提示注入；
- 无会话写操作；
- 无 `innerHTML`；
- 内容预览限长 520 字符，只通过 `textContent` 输出；
- 错误仅在插件装配边界记录，不携带会话正文。

## 8. 文件职责

```text
src/index.ts             惰性宿主入口
src/client/index.ts      客户端 apply/effect
src/client/strip.ts      轨道控制器、几何、交互和生命周期
src/client/keys.ts       ChatNode → 安全预览文本和语义分组
src/client/tooltip.ts    预览 DOM
src/client/styles.ts     Codex 式琴键与浮层样式
src/client/locales.ts    导航可访问名称
scripts/smoke.mjs        构建产物契约测试
scripts/grouping.mjs     纯语义分组回归测试
scripts/integration.mjs  jsdom 行为集成测试
```
