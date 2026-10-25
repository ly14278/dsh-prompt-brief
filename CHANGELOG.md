# 更新日志

本项目的版本记录格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [0.1.0] - 2026-10-25

首个可用版本。

### 新增

- 输入框右侧「✦ 优化」按钮，挂在 `conversation.input.right` 槽位，位于发送按钮左侧。
- 「原文 / 优化结果」左右对比弹窗：三层结构与白名单过滤，长文本各自滚动。
- 三段式确认：**接受**（回填输入框，`Ctrl+Enter`）/ **重新生成**（保持弹窗重新请求）/ **取消**（`Esc` 或点遮罩，完全不改原文）。
- 结果可单独「复制」，不覆盖输入框内容。
- 结构化输出规范：一句话定位 → 核心功能（3–6 条）→ 视觉参考 → 设计规范；系统提示词硬性要求不删改用户事实、不臆造冲突信息、不输出代码块或 JSON。
- Host 半侧 `PromptForgeService`（Typert Remote，namespace `promptForge`）通过 `ctx.llm` 调用当前模型流式生成，带超时与取消。
- 可选配置：`provider` / `model` / `reasoningEffort` / `timeoutMs` / `maxInputChars` / `extraInstructions`；不配置时依次回退到 profile 默认模型、第一个可用 provider 的首个模型。
- 两种加载方式：`dsh.profile.bundles` 追加包名，或在 `cordis.patch.yml` 里 `insert` 一个 entry。

### 说明

- 纯手写 JS，无构建步骤、无运行时依赖；`react` / `react-dom` 由 DSH 基座提供。
- `PromptForgeService` 在构造期捕获 `llm` 引用，避免 Gateway 重新 extend Context 后取不到服务。
- 与 `dsh-better-input` 的 ✨ 按钮相互独立，可共存。
