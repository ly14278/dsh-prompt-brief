/**
 * dsh-prompt-forge — Host face Typert manifest。
 *
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 ly14278
 *
 * dsh-typert-loader 会扫描已挂载的 Loader 条目，读取其 package.json 的
 * `exports["./typert"]`，import 本文件并用 validateTypertManifest 校验后注册进
 * Typert registry；Gateway 依此在 `promptForge/optimize` 上做参数边界校验，
 * 并派发到 Cordis 服务 `PromptForgeService` 的同名方法。
 *
 * 手写 manifest，无代码生成器：每个 codec 只需
 * `{ mode: 'strict', typeSymbol, create(): { parse } }`，字段取值完全依照
 * @deepseek-ai/dsh-typert-loader 的公开校验规则。
 */

/** 极简 string schema：满足 codec.create().parse(value) 的边界校验契约。 */
const stringSchema = {
  parse(value) {
    if (typeof value !== 'string') throw new TypeError('expected string')
    return value
  },
}

const stringCodec = {
  mode: 'strict',
  typeSymbol: 'string',
  create: () => stringSchema,
}

const OPTIMIZE_INVOCATION = {
  id: 'dsh-prompt-forge#promptForge/optimize',
  service: 'PromptForgeService',
  namespace: 'promptForge',
  method: 'optimize',
  invocation: { kind: 'direct' },
  parameters: [
    { name: 'text', wire: 'text', source: 'json', codec: stringCodec },
    { name: 'context', wire: 'context', source: 'json', codec: stringCodec },
  ],
  cancellation: { parameter: 'signal' },
  result: { mode: 'strict', typeSymbol: 'string', create: () => stringSchema },
}

export const TYPERT = {
  package: 'dsh-prompt-forge',
  face: 'host',
  schemas: [],
  model: {
    services: [
      {
        key: 'PromptForgeService',
        exportName: 'PromptForgeService',
        tags: [],
        members: [],
        types: [],
      },
    ],
    events: [],
    objects: [],
  },
  invocations: [OPTIMIZE_INVOCATION],
}

export default TYPERT
