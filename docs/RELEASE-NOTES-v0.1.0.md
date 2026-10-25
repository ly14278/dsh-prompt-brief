<p align="center">
  <img src="https://raw.githubusercontent.com/ly14278/dsh-prompt-forge/main/docs/images/logo.png" width="88" height="88" alt="dsh-prompt-forge">
</p>

<h2 align="center">dsh-prompt-forge v0.1.0</h2>

<p align="center">DeepSeek Harness 输入框里的「优化」按钮：一句口语想法 → 一份能直接落地的结构化产品需求。</p>

---

## 这一版能做什么

写好一句口语需求，点输入框右边的「✦ 优化」，弹窗会把**原文**和**优化结果**并排摆出来：

- **接受**：结果回填输入框，继续改或直接发送（`Ctrl+Enter`）
- **重新生成**：同一句原文再改写一版措辞
- **取消**：什么都不动，保留你自己的原文（`Esc` / 点遮罩）

![原文与优化结果对比](https://raw.githubusercontent.com/ly14278/dsh-prompt-forge/main/docs/images/compare-dialog.png)

优化结果固定四段：**一句话定位 → 核心功能（3–6 条）→ 视觉参考 → 设计规范**。
用户原话里的平台、价格区间、品牌色、圆角这些约束会被保留，不会因为"写得更漂亮"而丢信息。

![四步流程](https://raw.githubusercontent.com/ly14278/dsh-prompt-forge/main/docs/images/flow.png)

## 安装

```bash
# 1. 包放进 profile 的 node_modules（或 npm 发布后用 dsh plugin 安装）
# 2. 在 cordis.patch.yml 末尾追加：
- insert:
    - id: dsh-prompt-forge
      name: dsh-prompt-forge
# 3. 完全退出 DSH Desktop 再打开，刷新页面
```

也可以把 `"dsh-prompt-forge"` 加进 `package.json` 的 `dsh.profile.bundles`，二选一。

## 已知限制

- 改写质量取决于当前 profile 的模型；`reasoningEffort: off` 时更快，长需求建议留给默认思考档位。
- 按钮外观跟随 DSH 主题变量，暗色主题下对比度已验证，但极端自定义主题可能偏色。
- 暂未做设置页，参数走 `cordis.patch.yml` 的 `config:`。

## 完整说明

安装细节、配置项、排错与实现结构见 [README](https://github.com/ly14278/dsh-prompt-forge#readme)，版本记录见 [CHANGELOG](https://github.com/ly14278/dsh-prompt-forge/blob/main/CHANGELOG.md)。

**License**：MIT © 2026 ly14278
