# sm-context-piano

DeepSeek Harness Web GUI 的 Codex 式对话琴键导航插件。

插件在聊天内容左侧显示一条紧凑的横线轨道。每根横线对应当前已经加载并渲染的一个对话节点；鼠标在整条轨道内上下移动时，最近的横线和相邻横线会连续伸缩，同时显示该节点的内容预览。点击轨道即可平滑跳转到对应消息。

本插件只负责导航和预览：不修改会话、不裁剪模型上下文、不注入系统提示，也不开放额外 HTTP 接口。

## 当前功能

- **真实位置投影**：根据消息行在完整聊天内容中的实际纵坐标排列琴键，不按节点序号平均分布。
- **连续悬停波形**：整条轨道都是命中区域，鼠标位于横线间隙时仍可连续选择最近节点。
- **Codex 式预览**：白色/深色浮层显示节点标题和正文摘要，自动避开窗口边界。
- **快速定位**：点击轨道或按 Enter，滚动到目标消息起始位置。
- **阅读位置同步**：滚动聊天时，当前段落琴键立即加深并加长。
- **增量更新**：流式回复和历史加载不会清空重建全部琴键，已有 DOM 节点和悬停状态会保留。
- **键盘操作**：方向键、Home、End、Enter、Space 和 Escape 可完成选择与跳转。
- **主题与动效**：跟随 DSH 明暗主题，并遵守 `prefers-reduced-motion`。
- **完整卸载**：插件卸载后移除 DOM、样式、监听器、Observer、定时器和动画帧。

## 安装

```powershell
dsh plugin --profile web add @linxin666/dsh-sm-context-piano
```

本地开发链接：

```powershell
dsh plugin --profile web add link:D:/android-project/dsh-sm-context-piano-2026.08.16
```

构建后刷新或重新打开 DSH Web GUI。

## 开发与验证

环境要求：Node.js `^22.19.0 || >=24.0.0`、pnpm。

```powershell
pnpm install
pnpm verify
```

`pnpm verify` 依次执行：

1. TypeScript 项目引用检查；
2. 宿主端和客户端打包；
3. 客户端模块包装；
4. 构建产物冒烟测试；
5. jsdom 行为集成测试。

## 实现边界

- 当前实现依赖 DeepSeek Harness ChatView 的 `[data-chat-flow]`、`[data-chat-anchor-key]` 和 `[data-conversation-scroll]` DOM 锚点。
- 琴键只覆盖当前已加载的历史；尚未通过“加载更早消息”进入 ChatView 的记录不会提前生成琴键。
- 一个琴键对应一个 Harness 业务节点。没有独立行锚点的工具子调用不会拆成额外琴键。
- 预览始终通过 `textContent` 写入，保留纯文本换行，不执行会话内容中的 HTML。

详细设计见 [docs/DESIGN.md](docs/DESIGN.md)，验收记录见 [docs/PLAN.md](docs/PLAN.md)。

## 许可

Apache-2.0
