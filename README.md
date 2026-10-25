<p align="center">
  <img src="https://raw.githubusercontent.com/ly14278/dsh-prompt-forge/main/docs/images/logo.png" width="104" height="104" alt="dsh-prompt-forge logo">
</p>

<h1 align="center">dsh-prompt-forge</h1>

<p align="center">
  <a href="https://github.com/ly14278/dsh-prompt-forge/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-4F8CFF.svg" alt="MIT"></a>
  <img src="https://img.shields.io/badge/DeepSeek%20Harness-plugin-4F8CFF.svg" alt="DeepSeek Harness plugin">
  <img src="https://img.shields.io/badge/runtime-zero%20dependency-52C41A.svg" alt="zero runtime dependency">
</p>

<p align="center">给 DeepSeek Harness 输入框加一个「优化」按钮：把一句口语化的想法，改写成能直接交给设计、研发落地的<strong>结构化产品需求</strong>。</p>

点一下按钮 → 弹出「原文 / 优化结果」左右对比 → **接受**（回填输入框）/ **重新生成** / **取消**。

> 独立实现：按钮、对比弹窗、改写规则与示例提示词都在本仓库内从零编写，只使用 DSH 公开的插件契约（`dsh.bundle.patch`、`dsh.client`、`exports["./typert"]`、Typert Remote 描述符、`ctx.llm`），不包含任何第三方产品的代码或私有接口。产品形态上「一键把需求写清楚」是通用交互范式，本项目的取舍与输出结构见下文「设计思路」。

## 效果

![原文与优化结果的左右对比弹窗](https://raw.githubusercontent.com/ly14278/dsh-prompt-forge/main/docs/images/compare-dialog.png)

输入（口语）：

> 我想买一个东西，这个东西在京东、拼多多等商城都有卖，但我不知道这会儿是不是历史最低价格，我希望有一种工具，在历史低价或者价格在某个区间时就主动提醒我去购买

点「优化」后得到（结构化，可直接发送）：

> 一个多平台商品价格监控工具，帮助用户自动追踪京东、拼多多等商城商品价格，在达到历史低价或预设区间时主动推送购买提醒
>
> **核心功能：**
> - 商品添加：用户粘贴京东、拼多多等平台的商品链接，设置期望价格区间或勾选历史低价触发规则，完成监控任务创建。
> - 价格自动追踪：工具定时拉取已监控商品的实时价格，自动对比历史价格数据判断是否达成触发条件，留存全周期价格波动曲线。
> - 降价提醒推送：当商品价格命中用户预设的区间阈值或刷新历史最低价时，通过浏览器弹窗 + 站内消息主动向用户推送购买提醒通知。
> - 价格趋势查看：用户可点击已监控商品卡片，查看该商品最长 90 天的历史价格走势图表，直观判断当前价格的性价比。
>
> **视觉参考：** 什么值得买的商品优惠信息展示逻辑，小米商城的简洁卡片式布局，Chrome 插件类工具的轻量化操作交互风格。
>
> **设计规范：**
> - **配色**：主色 #FF6700（京东品牌关联橙，用于确认按钮、核心提醒标识），辅助色 #E02020（拼多多品牌关联红，用于降价提醒高亮），背景 #F5F7FA，文字 #333333，强调 #52C41A（绿色用于标注历史最低价格状态）
> - **风格**：轻量化卡片式流式布局，卡片圆角 12px，元素间距 16px，信息层级清晰无冗余，响应式适配桌面端与移动端

输出结构固定为：一句话定位 → 核心功能（3–6 条） → 视觉参考（用户提到时） → 设计规范（用户提到或明显必要时）。

示例里的品牌、配色、圆角都来自用户原话——插件不内置任何品牌预设，也不会把示例内容套到无关需求上。

## 工作流程

![四步：写一句口令 → 点优化 → 左右对照 → 接受或重来](https://raw.githubusercontent.com/ly14278/dsh-prompt-forge/main/docs/images/flow.png)

## 按钮在哪

![输入框右侧的优化按钮](https://raw.githubusercontent.com/ly14278/dsh-prompt-forge/main/docs/images/optimize-button.png)

按钮挂在 `conversation.input.right` 槽位，位于发送按钮左侧，和 `dsh-better-input` 的 ✨ 图标是两套独立按钮，可以共存。

## 设计思路

- **为什么是这四段**：定位回答「做给谁、做什么」，功能回答「研发怎么拆任务」，视觉参考与设计规范回答「做出来长什么样」。四段之外的客套话一律删掉，所以结果可以直接粘进输入框发送。
- **为什么要三选项**：改写是建议而不是替换。接受才写回输入框，重新生成用于换一版措辞，取消则完全不动用户原文。
- **为什么信息密度优先**：改写最大的风险是把用户的约束写丢（平台、数值、限制条件）。系统提示词里把「不得删改用户事实」放在硬性规则第 2 条，宁可多写一条功能也不压缩信息。

## 安装

插件是纯 JS 包，无构建、无运行时依赖（`react` / `react-dom` 由 DSH 基座提供），安装 = 放进 profile 的 `node_modules` 并让 profile 加载它。

### 方式 A：作为 bundle 挂载（推荐）

1. 把本目录复制/链接到 profile 的 `node_modules`：

   ```powershell
   # 例：desktop profile
   $profile = "$env:USERPROFILE\.dsh\profiles\desktop"
   Copy-Item -Recurse -Force .\* "$profile\node_modules\dsh-prompt-forge"
   ```

2. 在 `$profile\package.json` 的 `dsh.profile.bundles` 末尾加一行 `"dsh-prompt-forge"`：

   ```jsonc
   "dsh": { "profile": { "bundles": [
     "@deepseek-ai/dsh-base",
     "@deepseek-ai/dsh-web-app",
     "…其他插件…",
     "dsh-prompt-forge"
   ] } }
   ```

   包内自带的 `cordis.patch.yml` 会把插件作为一个 root entry 插入，无需手改别处。

3. 重启 DSH Desktop（或重启你启动的 `dsh web`），刷新页面。

### 方式 B：只改 patch 层（不动 package.json）

把包复制进 `node_modules\dsh-prompt-forge`，然后在 `$profile\cordis.patch.yml` 末尾追加：

```yaml
- insert:
    - id: dsh-prompt-forge
      name: dsh-prompt-forge
```

重启后生效。本机 desktop profile 目前用的就是这种方式。

> 注意：两种方式**只选其一**。同时存在会重复插入同一个 entry。

## 使用

1. 在输入框里写一句话或几句话（不用讲究措辞）。
2. 点输入框右侧的「✦ 优化」按钮（在「发送」按钮前面，和 `dsh-better-input` 的 ✨ 图标是两套独立按钮）。
3. 弹窗左右对比原文与优化结果：
   - **接受**：结果写回输入框，你可以继续编辑后发送；快捷键 `Ctrl+Enter`。
   - **重新生成**：重新请求一次，弹窗保持打开。
   - **取消**：不做任何改动，保留你自己的输入；快捷键 `Esc`，或点遮罩空白处。
   - 优化后内容可直接「复制」，不覆盖输入框。
4. 出错时弹窗显示真实原因，并可「重试」。

## 配置（可选，全部可省略）

在 profile 的 `cordis.patch.yml` 里给 `dsh-prompt-forge` 加 `config:` 即可覆盖：

```yaml
- id: dsh-prompt-forge
  name: dsh-prompt-forge
  config:
    provider: deepseek-account     # 留空 = 用当前 profile 的默认模型
    model: deepseek-flash
    reasoningEffort: off           # 改写任务不需要长思考；留空自动判断
    timeoutMs: 90000
    maxInputChars: 12000
    extraInstructions: ""          # 追加到系统提示词末尾的自定义要求
```

默认行为：不填 `provider`/`model` 时依次尝试 profile 的默认模型（`agent-default-model`）→ 第一个可用 provider 的首个模型。

## 卸载

1. 从 `dsh.profile.bundles` 删掉 `"dsh-prompt-forge"`，或删掉 `cordis.patch.yml` 里那条 `insert`。
2. 删除 `$profile\node_modules\dsh-prompt-forge`。
3. 重启 DSH、刷新页面。

## 改完代码怎么生效

Host 半侧（`lib/index.js`、`lib/typert.js`）是**进程启动时**加载的，改完必须：

1. 把改动的文件重新同步到 profile 的安装目录（`$profile/node_modules/dsh-prompt-forge/lib/`）——Desktop 的 profile 里是一份真实拷贝，不是软链；
2. 完全退出 DSH Desktop 再打开（只刷新页面不够），然后点按钮验证。

浏览器半侧（`lib/client.js`）由 Web 服务按 rev 现取，刷新页面即可看到按钮外观变化，但同样建议整机重启一次，避免新旧代码混用。

## 排错

- **点按钮报 `cannot get property "llm" without inject`**：`PromptForgeService` 没有声明 `static inject = ['llm']`，或方法里在「被 Gateway 重新 extend 过的 Context」上直接取 `this.ctx.llm`。本插件已用两重保护：类上声明 `static inject = ['llm']`，并在构造期用 `ctx.inject(['llm'], …)` 把 `llm` 引用抓到实例上（`requireLlm()`），方法内不再依赖 `this.ctx` 的提供者链。
- **报 `LLM 服务还没就绪`**：profile 里没有可用的 `llm` 服务（缺 `@deepseek-ai/dsh-llm` 或尚未登录账号）。
- **报 `找不到可用的模型`**：在插件 `config` 里显式填 `provider` 与 `model`。
- **按钮不出现**：确认 `package.json` 的 `dsh.client.inject` 三个包名正确、`lib/client.js` 存在且是 `window.__ModuleLoader__.load(...)` 形态，然后刷新页面（必要时重启）。

## 实现结构

| 文件 | 作用 |
| --- | --- |
| `lib/index.js` | Host 半侧：`export const name`、可选 `Config`、`apply(ctx)`；注册 Typert Remote Service `PromptForgeService`（namespace `promptForge`），用 `ctx.llm` 调当前模型流式生成。 |
| `lib/typert.js` | Host face manifest：`{ package, face: 'host', schemas, model, invocations }`，被 `@deepseek-ai/dsh-typert-loader` 通过 `exports["./typert"]` 自动发现并注册，Gateway 据此做参数边界校验与派发。 |
| `lib/client.js` | 浏览器 bundle：`window.__ModuleLoader__.load({ id, factory })` 形式，向 `conversation.input.right` 槽位注册按钮，弹窗用 `createPortal` 挂到 `document.body`。 |
| `cordis.patch.yml` | 包自身的 loader patch：把插件插成 root entry。 |
| `docs/images/` | README 用的示意图（由 `scripts` 之外的本地脚本绘制，不参与运行时）。 |

调用链：按钮 → `remote.promptForge.optimize(text, context, signal)`（客户端 Typert 描述符）→ Gateway 校验 → `PromptForgeService.optimize()` → `ctx.llm.prepareCall()` + `prepared.stream()` → 文本返回弹窗。

## 设计取舍

- **纯手写、零构建**：`lib/*.js` 就是最终产物，不依赖 tsdown/esbuild/网络，改动直接生效。
- **不改动 DSH 本体**：只用公开的插件契约（`dsh.bundle.patch`、`dsh.client`、`exports["./typert"]`、Typert Remote 描述符）。
- **与 `dsh-better-input` 的区别**：那个插件的 ✨ 是「润色/改写一句话」，没有「重新生成」和双栏对比；本插件的输出是固定结构的完整产品需求（定位 + 核心功能 + 视觉参考 + 设计规范），并且提供 接受 / 重新生成 / 取消 三段式确认。两者可以共存，按钮文案与图标不同。
- **模型侧约束**：系统提示词强制「只输出成品正文、不丢用户信息、不臆造冲突事实、不输出代码块/JSON」，因此结果可以直接粘进输入框发送。

## 更新日志

见 [CHANGELOG.md](./CHANGELOG.md)。

## 发布到 npm / 插件市场

包已经按 npm 包习惯准备好（`files` 白名单只发 `lib/`、`cordis.patch.yml`、`README.md`、`LICENSE`）：

```bash
cd packages/dsh-prompt-forge
npm login
npm publish --access public
```

发布后，别人装插件只需要一条命令：

```bash
dsh plugin --profile desktop add dsh-prompt-forge
```

（`dsh plugin` 会把 pnpm 追加参数转发到 profile，等价于在 profile 目录里 `pnpm add dsh-prompt-forge`。）

## 仓库

- GitHub：<https://github.com/ly14278/dsh-prompt-forge>
- 问题反馈：<https://github.com/ly14278/dsh-prompt-forge/issues>

## 许可

MIT © 2026 ly14278，见 [LICENSE](./LICENSE)。
