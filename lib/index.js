/**
 * dsh-prompt-brief — Host 半侧。
 *
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 ly14278
 *
 * 职责：注册一个 Typert Remote Service（namespace `promptForge`），把
 * “一句口语需求 → 结构化产品需求” 的改写请求交给当前 profile 的默认模型执行。
 *
 * 本插件是独立实现：改写规则（下面的 SYSTEM_PROMPT）为本项目自行撰写，只使用 DSH
 * 公开的插件契约（schemastery Config、Typert Remote Service、`ctx.llm`），不包含任何
 * 第三方产品的代码、文案或私有接口。
 *
 * 与客户端的契约见 ./typert.js（Host face manifest）与 ./client.js（Client 描述符）。
 */
import s from '@deepseek-ai/schemastery'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'

export const name = 'dsh-prompt-brief'

const SERVICE_KEY = 'PromptForgeService'
const NAMESPACE = 'promptForge'
const MAX_OUTPUT_CHARACTERS = 24000

/** 插件配置：全部可选；留空即自动使用当前 profile 的默认模型。 */
export const Config = s.object({
  provider: s.string().description('模型 provider，留空则用默认模型路由').default(''),
  model: s.string().description('模型 id，留空则用默认模型路由').default(''),
  reasoningEffort: s.string().description('思考强度（off/low/medium/high），留空自动判断').default(''),
  timeoutMs: s.number().description('单次优化超时（毫秒）').default(90000),
  maxInputChars: s.number().description('允许的最长输入字符数').default(12000),
  extraInstructions: s.string().description('追加到系统提示词末尾的自定义要求').default(''),
})

/** 改写风格的核心约束：结构固定、信息不丢、只输出成品正文。规则与示例均为本项目自撰。 */
const SYSTEM_PROMPT = `你是「产品需求结构化助手」，服务中文产品经理和独立开发者。用户会丢来一句或几句口语化想法，你要把它改写成一份能直接交给设计、研发落地的结构化产品需求。

硬性规则：
1. 只输出改写后的需求正文。不要任何前言、解释、道歉、确认语或收尾语；不要用代码块、JSON、表格；不要重复用户原话。
2. 完整保留用户提到的所有事实：主体、目标平台、领域、具体数值、限制条件。不得删改、不得臆造与用户设定冲突的事实。用户没说但这类产品必需的信息，可以补充，但要写成合理建议而不是既定结论。
3. 简体中文，产品经理书面语。去掉“我想/我希望/能不能/帮我做一个”这类口语和第一人称。
4. 结构固定，按顺序输出：
   - 第一行：一句话定位。以名词短语开头，形如「一个（款）+ 场景 + 产品形态 + 核心价值」，不超过 40 字，句末不加句号。
   - 「核心功能：」后列 3–6 条，每条一行，以「- 」开头，格式为「功能名：具体行为」。功能名 2–6 个字；具体行为要写清触发条件、输入、处理过程、输出结果，让研发能据此拆任务。
   - 用户提到参考产品、视觉风格、氛围时，追加「视觉参考：」一段，给 2–3 个可对齐的对象，并说明各自借鉴什么（布局 / 信息密度 / 交互节奏）。
   - 用户提到配色、品牌色、圆角、间距、响应式、端适配等时，追加「设计规范：」一段；用户没提但这些信息对落地明显必要时，也要给出建议值，并在段首注明「（建议）」。
5. 信息密度优先：宁可多写一条功能，也不要把用户的想法写丢。不要写空话、套话、营销词。
6. 篇幅 200–600 字，与输入复杂度匹配。除第一行定位外，其余段落标题用「核心功能：」「视觉参考：」「设计规范：」原样输出。

示例（只示范结构与语气，绝对不要把示例里的领域、专有名词、配色搬到无关需求上）：

用户输入：我住的小区里不少人想处理闲置的儿童玩具和绘本，扔了可惜，送人又找不到人，我想做个东西让大家能在楼里互换

正确输出：
一个小区邻里闲置交换小程序，帮助同一小区的住户发布、查找并换走闲置的儿童玩具与绘本，让闲置在楼内循环起来

核心功能：
- 闲置发布：住户拍照上传玩具或绘本，填写成色、适用年龄和期望换取的物品，发布后进入本小区交换列表。
- 附近筛选：按楼栋与距离排序展示可交换物品，支持按品类、年龄段筛选，默认只看本小区范围内的发布。
- 交换协商：住户对感兴趣的物品发起交换申请，双方在站内确认交换物品与取货时间地点，达成后生成交换记录。
- 到期提醒：发布满 30 天仍未换出的物品自动提醒发布者续期或下架，避免列表长期堆积无效信息。

视觉参考：
二手交易类应用的信息流布局，社区论坛式的简洁列表排版，小程序的轻量化操作节奏。

设计规范：
- 配色：主色 #07C160（确认按钮与交换成功标识），辅助色 #FA5151（未读申请提醒），背景 #F7F7F7，文字 #333333，强调 #FFC300（标注「免费赠送」状态）。
- 风格：卡片式列表布局，卡片圆角 8px，元素间距 12px，信息层级清晰无冗余，优先适配移动端并兼容桌面端。`

/** 把用户输入与（可选的）最近对话上下文拼成一次用户消息正文。 */
function buildUserContent(text, context) {
  const trimmedContext = typeof context === 'string' ? context.trim() : ''
  if (!trimmedContext) return `用户输入：\n${text}`
  return `用户输入：\n${text}\n\n最近对话上下文（仅用于理解指代与背景，不要复述、不要当成需求本身）：\n${trimmedContext}`
}

function buildSystemPrompt(extraInstructions) {
  const extra = typeof extraInstructions === 'string' ? extraInstructions.trim() : ''
  return extra ? `${SYSTEM_PROMPT}\n\n补充要求（优先级高于上面的风格约定，但不得违反硬性规则 1、2）：\n${extra}` : SYSTEM_PROMPT
}

/** 把流式响应拼成纯文本；遇到 finish=error/aborted 直接抛出真实原因。 */
async function collectText(stream, maxCharacters) {
  let buffer = ''
  let fallback = ''
  for await (const chunk of stream) {
    if (chunk !== null && typeof chunk === 'object') {
      if (chunk.type === 'text-delta' && typeof chunk.text === 'string') {
        buffer += chunk.text
        if (buffer.length > maxCharacters) throw new Error('模型输出过长，已被中断')
        continue
      }
      if (chunk.type === 'block-end' && chunk.block && typeof chunk.block.text === 'string') {
        fallback += chunk.block.text
        continue
      }
      if (chunk.type === 'finish') {
        const kind = chunk.reason && chunk.reason.kind
        if (kind === 'error') {
          const reason = chunk.reason
          const detail = reason && reason.error && reason.error.message
          throw new Error(typeof detail === 'string' && detail ? detail : '模型调用失败')
        }
        if (kind === 'aborted') throw new Error('优化已取消')
      }
    }
  }
  const output = (buffer || fallback).trim()
  if (!output) throw new Error('模型没有返回任何内容，请重试')
  return output
}

class PromptForgeService extends TypertRemoteService {
  static inject = ['llm']

  constructor(ctx, config) {
    super(ctx, SERVICE_KEY, { namespace: NAMESPACE })
    this.options = config !== null && typeof config === 'object' ? config : {}
    // Gateway 派发时会把服务从「重新 extend 过的 Context」里取出来再调用方法，
    // 那个 Context 上没有 llm 提供者，因此这里先把依赖引用抓到实例上。
    this.llm = undefined
    this.defaultModel = undefined
    ctx.inject(['llm'], (llmCtx) => {
      this.llm = llmCtx.llm
      llmCtx.effect(() => () => { this.llm = undefined }, 'prompt-forge llm reference')
    })
    ctx.inject(['agentDefaultModel'], (modelCtx) => {
      this.defaultModel = modelCtx.agentDefaultModel
      modelCtx.effect(() => () => { this.defaultModel = undefined }, 'prompt-forge default model reference')
    })
  }

  /** 取 LLM 服务：优先用构造期抓到的引用，退化时再走 Context 查找。 */
  requireLlm() {
    let llm = this.llm
    if (!llm && this.ctx && typeof this.ctx.get === 'function') {
      try {
        llm = this.ctx.get('llm')
      } catch {
        llm = undefined
      }
    }
    if (!llm) throw new Error('LLM 服务还没就绪，请稍后再试')
    return llm
  }

  /**
   * 把一段口语化提示词改写为结构化产品需求。
   * @param text - 用户在输入框里写的原始内容。
   * @param context - 最近对话上下文（可为空字符串）。
   * @param signal - 取消信号（由 Gateway 依据 cancellation 声明注入）。
   * @returns 改写后的纯文本。
   */
  async optimize(text, context, signal) {
    const input = typeof text === 'string' ? text.trim() : ''
    if (!input) throw new Error('输入框是空的，先写一句你的想法')

    const maxInputChars = Number(this.options.maxInputChars) || 12000
    if (input.length > maxInputChars) {
      throw new Error(`输入内容过长（${input.length} 字符，上限 ${maxInputChars} 字符）`)
    }

    const route = await this.resolveRoute()
    const timeoutMs = Number(this.options.timeoutMs) || 90000

    const controller = new AbortController()
    const onOuterAbort = () => controller.abort()
    if (signal && typeof signal.addEventListener === 'function') {
      if (signal.aborted) controller.abort()
      else signal.addEventListener('abort', onOuterAbort, { once: true })
    }
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const effort = await this.resolveEffort(route, controller.signal)
      const callConfig = { provider: route.provider, model: route.model }
      if (effort) callConfig.reasoningEffort = effort

      const prepared = await this.requireLlm().prepareCall(callConfig, controller.signal)
      const message = createUserMessage({
        content: [{ type: 'text', text: buildUserContent(input, context) }],
        source: { kind: 'user' },
      })
      const stream = prepared.stream({
        ...prepared.config,
        messages: [message],
        system: buildSystemPrompt(this.options.extraInstructions),
        signal: controller.signal,
      })
      return await collectText(stream, MAX_OUTPUT_CHARACTERS)
    } finally {
      clearTimeout(timer)
      if (signal && typeof signal.removeEventListener === 'function') {
        signal.removeEventListener('abort', onOuterAbort)
      }
    }
  }

  /** 配置优先，其次 profile 默认模型，最后退回第一个可用 provider 的首个模型。 */
  async resolveRoute() {
    const provider = String(this.options.provider ?? '').trim()
    const model = String(this.options.model ?? '').trim()
    if (provider && model) return { provider, model }

    const selection = this.readDefaultSelection()
    if (selection) return selection

    const llm = this.requireLlm()
    const providers = typeof llm.listProviders === 'function' ? llm.listProviders() : []
    for (const candidate of providers) {
      const id = candidate && candidate.id
      if (typeof id !== 'string' || !id) continue
      try {
        const models = await llm.listModels(id)
        if (Array.isArray(models) && models.length > 0 && models[0] && typeof models[0].id === 'string') {
          return { provider: id, model: models[0].id }
        }
      } catch {
        /* 该 provider 不可用时继续找下一个 */
      }
    }
    throw new Error('找不到可用的模型：请在插件配置中填写 provider 与 model')
  }

  readDefaultSelection() {
    try {
      let service = this.defaultModel
      if (!service && typeof this.ctx.get === 'function') service = this.ctx.get('agentDefaultModel')
      if (!service || typeof service.currentSelection !== 'function') return undefined
      const selection = service.currentSelection()
      if (!selection) return undefined
      const provider = typeof selection.provider === 'string' ? selection.provider.trim() : ''
      const model = typeof selection.model === 'string' ? selection.model.trim() : ''
      if (!provider || !model) return undefined
      return { provider, model }
    } catch {
      return undefined
    }
  }

  /** 提示词改写不需要长思考：显式配置优先，否则在模型支持时选 off。 */
  async resolveEffort(route, signal) {
    const explicit = String(this.options.reasoningEffort ?? '').trim()
    if (explicit) return explicit
    try {
      const info = await this.requireLlm().resolveModelInfo(route.provider, route.model, signal)
      const efforts = (info && info.reasoning && Array.isArray(info.reasoning.efforts)) ? info.reasoning.efforts : []
      if (efforts.some((effort) => String(effort && effort.id) === 'off')) return 'off'
    } catch {
      /* 拿不到模型信息就不带 reasoningEffort */
    }
    return undefined
  }
}

export { PromptForgeService }

export function apply(ctx, config) {
  ctx.plugin(PromptForgeService, config)
}
