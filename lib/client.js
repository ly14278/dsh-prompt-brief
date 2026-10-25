/**
 * dsh-prompt-brief — Client 半侧（浏览器 bundle）。
 *
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 ly14278
 *
 * 形态与 DSH 官方插件一致：调用 window.__ModuleLoader__.load 注册一个 factory，
 * 由宿主通过 require() 提供 react / react-dom 等基座模块。整个文件是一个自足模块，
 * 不依赖任何构建产物，界面与交互均为本项目自行实现。
 *
 * 行为：在输入框右侧（发送按钮左边）放一个「优化」按钮，点击后把当前草稿发给
 * Host 侧 PromptForgeService 改写，弹窗同时展示原文与改写结果，并提供
 * 取消 / 重新生成 / 接受 三个操作。
 */
window.__ModuleLoader__.load({
	id: 'dsh-prompt-brief',
	factory: (require) => {
		var module = { exports: {} }
		var exports = module.exports

		let react = require('react')
		let react_dom = require('react-dom')

		var useState = react.useState
		var useEffect = react.useEffect
		var useRef = react.useRef
		var h = react.createElement
		var Fragment = react.Fragment

		// ------------------------------------------------------------------
		// Remote 契约（与 Host 侧 lib/typert.js 完全对齐）
		// ------------------------------------------------------------------
		var stringSchema = {
			parse(value) {
				if (typeof value !== 'string') throw new TypeError('expected string')
				return value
			},
		}
		var stringCodec = { mode: 'strict', typeSymbol: 'string', create: () => stringSchema }

		var TYPERT_REMOTE = {
			package: 'dsh-prompt-brief',
			descriptors: [
				{
					id: 'dsh-prompt-brief#promptForge/optimize',
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
				},
			],
		}

		// ------------------------------------------------------------------
		// 视觉 token（跟随 DSH 主题变量，缺省回落到中性色）
		// ------------------------------------------------------------------
		var C = {
			accent: 'var(--dsw-alias-state-business-primary, #4d6bfe)',
			text: 'var(--dsw-alias-label-primary, #1f2328)',
			muted: 'var(--dsw-alias-label-secondary, #6b7280)',
			weak: 'var(--dsw-alias-label-tertiary, #9aa1ab)',
			line: 'var(--dsw-alias-border-l2, #e5e7eb)',
			lineSoft: 'var(--dsw-alias-border-l1, #eef0f3)',
			layer1: 'var(--dsw-alias-bg-layer-1, #f6f7f9)',
			layer2: 'var(--dsw-alias-bg-layer-2, #ffffff)',
			danger: 'var(--dsw-alias-state-error-primary, #d92d20)',
		}

		var KEYFRAMES = '@keyframes pf-spin{to{transform:rotate(360deg)}}@keyframes pf-fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}'

		// ------------------------------------------------------------------
		// 小组件
		// ------------------------------------------------------------------
		function WandIcon() {
			return h(
				'svg',
				{
					width: 14,
					height: 14,
					viewBox: '0 0 24 24',
					fill: 'none',
					stroke: 'currentColor',
					strokeWidth: 1.9,
					strokeLinecap: 'round',
					strokeLinejoin: 'round',
					'aria-hidden': 'true',
				},
				h('path', { key: 'a', d: 'M3 21 12.5 11.5' }),
				h('path', { key: 'b', d: 'm16.5 7.5 3.9-3.9a1.1 1.1 0 0 1 1.6 1.6L18 9.1' }),
				h('path', { key: 'c', d: 'm14 10 1.4 1.4' }),
				h('path', { key: 'd', d: 'M5 5v3' }),
				h('path', { key: 'e', d: 'M19 16v3' }),
				h('path', { key: 'f', d: 'M3.5 9.5h3' }),
				h('path', { key: 'g', d: 'M17.5 19.5h3' }),
			)
		}

		function Spinner() {
			return h('span', {
				style: {
					display: 'inline-block',
					width: 13,
					height: 13,
					borderRadius: 999,
					border: '2px solid currentColor',
					borderTopColor: 'transparent',
					opacity: 0.75,
					animation: 'pf-spin 700ms linear infinite',
				},
			})
		}

		function PaneLabel(props) {
			return h(
				'div',
				{
					style: {
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						gap: 8,
						marginBottom: 7,
						fontSize: 11,
						letterSpacing: '0.04em',
						color: C.weak,
						fontWeight: 600,
					},
				},
				h('span', null, props.label),
				props.right || null,
			)
		}

		function paneStyle() {
			return {
				display: 'flex',
				flexDirection: 'column',
				minWidth: 0,
				minHeight: 0,
				padding: '10px 12px',
				borderRadius: 10,
				border: '1px solid ' + C.lineSoft,
				background: C.layer1,
			}
		}

		function contentStyle() {
			return {
				flex: 1,
				minHeight: 0,
				maxHeight: '46vh',
				overflow: 'auto',
				whiteSpace: 'pre-wrap',
				wordBreak: 'break-word',
				fontSize: 13,
				lineHeight: 1.75,
				color: C.text,
				fontFamily: 'inherit',
			}
		}

		function actionStyle(kind) {
			var base = {
				display: 'inline-flex',
				alignItems: 'center',
				gap: 6,
				height: 32,
				padding: '0 14px',
				borderRadius: 8,
				fontSize: 12.5,
				fontWeight: 500,
				cursor: 'pointer',
				transition: 'background 120ms ease, border-color 120ms ease, opacity 120ms ease',
				whiteSpace: 'nowrap',
			}
			if (kind === 'primary') {
				return Object.assign(base, {
					border: '1px solid transparent',
					background: C.accent,
					color: '#fff',
				})
			}
			if (kind === 'secondary') {
				return Object.assign(base, {
					border: '1px solid ' + C.line,
					background: C.layer2,
					color: C.text,
				})
			}
			return Object.assign(base, {
				border: '1px solid transparent',
				background: 'transparent',
				color: C.muted,
			})
		}

		// ------------------------------------------------------------------
		// 弹窗
		// ------------------------------------------------------------------
		function Panel(props) {
			var panel = props.panel
			var busy = panel.kind === 'busy'
			var ready = panel.kind === 'ready'
			var failed = panel.kind === 'error'
			var copiedStore = useState(false)
			var copied = copiedStore[0]
			var setCopied = copiedStore[1]

			useEffect(
				function () {
					if (!copied) return undefined
					var timer = setTimeout(function () {
						setCopied(false)
					}, 1600)
					return function () {
						clearTimeout(timer)
					}
				},
				[copied],
			)

			useEffect(
				function () {
					function onKeyDown(event) {
						if (event.key === 'Escape') {
							event.stopPropagation()
							props.onClose()
							return
						}
						if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && ready) {
							event.preventDefault()
							props.onAccept(panel.optimized)
						}
					}
					document.addEventListener('keydown', onKeyDown, true)
					return function () {
						document.removeEventListener('keydown', onKeyDown, true)
					}
				},
				[panel, ready, props],
			)

			function onOverlayClick(event) {
				if (event.target !== event.currentTarget) return
				var selection = window.getSelection ? window.getSelection() : null
				if (selection && selection.isCollapsed === false && String(selection).length > 0) return
				props.onClose()
			}

			function copy() {
				try {
					var result = navigator.clipboard && navigator.clipboard.writeText(panel.optimized)
					if (result && typeof result.then === 'function') {
						result.then(function () {
							setCopied(true)
						}, function () {})
					} else {
						setCopied(true)
					}
				} catch (error) {
					/* 忽略剪贴板失败 */
				}
			}

			return react_dom.createPortal(
				h(
					'div',
					{
						role: 'dialog',
						'aria-modal': 'true',
						'aria-label': '提示词优化',
						onMouseDown: onOverlayClick,
						style: {
							position: 'fixed',
							inset: 0,
							zIndex: 99998,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							padding: 16,
							background: 'rgba(15, 18, 24, 0.45)',
							backdropFilter: 'blur(2px)',
						},
					},
					h('style', null, KEYFRAMES),
					h(
						'div',
						{
							style: {
								display: 'flex',
								flexDirection: 'column',
								width: 'min(880px, 96vw)',
								maxHeight: 'min(86vh, 780px)',
								borderRadius: 14,
								border: '1px solid ' + C.line,
								background: C.layer2,
								boxShadow: '0 24px 64px rgba(0, 0, 0, 0.28)',
								overflow: 'hidden',
								animation: 'pf-fade 140ms ease-out',
							},
						},
						h(
							'div',
							{
								style: {
									display: 'flex',
									alignItems: 'flex-start',
									justifyContent: 'space-between',
									gap: 12,
									padding: '15px 18px 13px',
									borderBottom: '1px solid ' + C.lineSoft,
								},
							},
							h(
								'div',
								null,
								h('div', { style: { fontSize: 14.5, fontWeight: 600, color: C.text } }, '提示词优化'),
								h(
									'div',
									{ style: { marginTop: 3, fontSize: 12, color: C.muted } },
									busy ? '正在改写为结构化产品需求…' : 'AI 把口语需求改写为可直接落地的结构化需求',
								),
							),
							h(
								'button',
								{
									type: 'button',
									onClick: props.onClose,
									title: '关闭（Esc）',
									style: {
										flex: 'none',
										width: 26,
										height: 26,
										display: 'inline-flex',
										alignItems: 'center',
										justifyContent: 'center',
										border: 'none',
										borderRadius: 6,
										background: 'transparent',
										color: C.weak,
										fontSize: 17,
										lineHeight: 1,
										cursor: 'pointer',
									},
								},
								'×',
							),
						),
						h(
							'div',
							{
								style: {
									display: 'grid',
									gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
									gap: 12,
									padding: '14px 18px',
									overflow: 'auto',
								},
							},
							h(
								'div',
								{ style: paneStyle() },
								h(PaneLabel, { label: '原文' }),
								h('div', { style: contentStyle() }, panel.original),
							),
							h(
								'div',
								{
									style: Object.assign(paneStyle(), {
										borderColor: ready ? 'color-mix(in srgb, ' + C.accent + ' 45%, transparent)' : C.lineSoft,
									}),
								},
								h(PaneLabel, {
									label: '优化后',
									right: ready
										? h(
												'button',
												{
													type: 'button',
													onClick: copy,
													style: {
														border: 'none',
														background: 'transparent',
														color: C.accent,
														fontSize: 11,
														cursor: 'pointer',
														padding: 0,
													},
												},
												copied ? '已复制' : '复制',
											)
										: null,
								}),
								busy
									? h(
											'div',
											{
												style: {
													flex: 1,
													minHeight: 120,
													display: 'flex',
													alignItems: 'center',
													justifyContent: 'center',
													gap: 8,
													color: C.muted,
													fontSize: 12.5,
												},
											},
											h(Spinner),
											'正在优化…',
										)
									: failed
										? h(
												'div',
												{ style: Object.assign(contentStyle(), { color: C.danger }) },
												panel.message,
											)
										: h('div', { style: contentStyle() }, panel.optimized),
							),
						),
						h(
							'div',
							{
								style: {
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'space-between',
									gap: 10,
									flexWrap: 'wrap',
									padding: '11px 18px',
									borderTop: '1px solid ' + C.lineSoft,
									background: C.layer2,
								},
							},
							h(
								'span',
								{ style: { fontSize: 11.5, color: C.weak } },
								'Esc 关闭 · Ctrl+Enter 接受',
							),
							h(
								'div',
								{ style: { display: 'flex', alignItems: 'center', gap: 8 } },
								h(
									'button',
									{ type: 'button', onClick: props.onClose, style: actionStyle('ghost') },
									'取消',
								),
								h(
									'button',
									{
										type: 'button',
										onClick: failed ? props.onRetry : props.onRegenerate,
										disabled: busy,
										style: Object.assign(actionStyle('secondary'), { opacity: busy ? 0.55 : 1, cursor: busy ? 'default' : 'pointer' }),
									},
									failed ? '重试' : '重新生成',
								),
								h(
									'button',
									{
										type: 'button',
										onClick: function () {
											props.onAccept(panel.optimized)
										},
										disabled: !ready,
										style: Object.assign(actionStyle('primary'), { opacity: ready ? 1 : 0.45, cursor: ready ? 'pointer' : 'default' }),
									},
									'接受',
								),
							),
						),
					),
				),
				document.body,
			)
		}

		// ------------------------------------------------------------------
		// 输入框右侧按钮
		// ------------------------------------------------------------------
		function messageOf(error) {
			if (error && typeof error.message === 'string' && error.message.trim()) return error.message
			return '优化失败，请重试'
		}

		function PromptForgeButton(props) {
			var useInput = props.useInput
			var inputActions = props.inputActions
			var remote = props.remote

			var inputState = useInput(function (state) {
				return state
			})
			var draft = inputState && typeof inputState.draft === 'string' ? inputState.draft : ''

			var panelStore = useState({ kind: 'closed' })
			var panel = panelStore[0]
			var setPanel = panelStore[1]

			var hoverStore = useState(false)
			var hovered = hoverStore[0]
			var setHovered = hoverStore[1]

			var abortRef = useRef(null)
			var aliveRef = useRef(true)

			useEffect(function () {
				aliveRef.current = true
				return function () {
					aliveRef.current = false
					var controller = abortRef.current
					abortRef.current = null
					if (controller) {
						try {
							controller.abort()
						} catch (error) {
							/* 忽略 */
						}
					}
				}
			}, [])

			function start(original, previousOptimized) {
				var controller = typeof AbortController === 'function' ? new AbortController() : null
				var previous = abortRef.current
				abortRef.current = controller
				if (previous) {
					try {
						previous.abort()
					} catch (error) {
						/* 忽略 */
					}
				}
				setPanel({ kind: 'busy', original: original, optimized: previousOptimized })
				var pending
				try {
					pending = remote.optimize(original, '', controller ? controller.signal : undefined)
				} catch (error) {
					abortRef.current = null
					setPanel({ kind: 'error', original: original, message: messageOf(error) })
					return
				}
				Promise.resolve(pending).then(
					function (result) {
						if (!aliveRef.current || abortRef.current !== controller) return
						abortRef.current = null
						if (result && result.ok === true && typeof result.value === 'string' && result.value.trim()) {
							setPanel({ kind: 'ready', original: original, optimized: result.value })
							return
						}
						var message =
							result && result.error && typeof result.error.message === 'string' && result.error.message
								? result.error.message
								: '优化失败，请重试'
						setPanel({ kind: 'error', original: original, message: message })
					},
					function (error) {
						if (!aliveRef.current || abortRef.current !== controller) return
						abortRef.current = null
						setPanel({ kind: 'error', original: original, message: messageOf(error) })
					},
				)
			}

			function openPanel() {
				var original = draft
				if (!original.trim()) return
				start(original, undefined)
			}

			function closePanel() {
				var controller = abortRef.current
				abortRef.current = null
				if (controller) {
					try {
						controller.abort()
					} catch (error) {
						/* 忽略 */
					}
				}
				setPanel({ kind: 'closed' })
			}

			function accept(optimized) {
				var next = typeof optimized === 'string' ? optimized : ''
				if (!next) return
				try {
					inputActions.setDraft(next)
				} catch (error) {
					/* 忽略 */
				}
				closePanel()
			}

			var disabled = !draft.trim()

			return h(
				Fragment,
				null,
				h(
					'button',
					{
						type: 'button',
						title: disabled ? '先在输入框写一句你的想法' : '用 AI 把这段话改写成结构化需求',
						'aria-label': '优化提示词',
						disabled: disabled,
						onClick: openPanel,
						onMouseEnter: function () {
							setHovered(true)
						},
						onMouseLeave: function () {
							setHovered(false)
						},
						style: {
							display: 'inline-flex',
							alignItems: 'center',
							gap: 4,
							height: 28,
							padding: '0 9px',
							borderRadius: 999,
							border: '1px solid ' + (hovered && !disabled ? C.accent : C.line),
							background: hovered && !disabled ? 'color-mix(in srgb, ' + C.accent + ' 10%, transparent)' : 'transparent',
							color: hovered && !disabled ? C.accent : C.muted,
							fontSize: 12,
							lineHeight: 1,
							fontFamily: 'inherit',
							cursor: disabled ? 'not-allowed' : 'pointer',
							opacity: disabled ? 0.5 : 1,
							whiteSpace: 'nowrap',
							transition: 'color 120ms ease, border-color 120ms ease, background 120ms ease',
						},
					},
					h(WandIcon),
					h('span', null, '优化'),
				),
				panel.kind === 'closed'
					? null
					: h(Panel, {
							panel: panel,
							onClose: closePanel,
							onAccept: accept,
							onRegenerate: function () {
								start(panel.original, panel.optimized)
							},
							onRetry: function () {
								start(panel.original, panel.optimized)
							},
						}),
			)
		}

		// ------------------------------------------------------------------
		// 插件注册
		// ------------------------------------------------------------------
		var inject = ['slots', 'remote', 'conversation']

		async function apply(ctx) {
			var disposeRemote = await ctx.remote.$mount(TYPERT_REMOTE)
			await ctx.inject(['slots', 'remote', 'remote.promptForge', 'conversation'], async function (remoteCtx) {
				var remote = remoteCtx.remote.promptForge
				remoteCtx.slots.inject('conversation.input.right', function () {
					return remoteCtx.slots.register(
						{
							name: 'conversation.input.right',
							id: 'prompt-forge-button',
							order: 9996,
							inject: function () {
								return { remote: remote }
							},
						},
						PromptForgeButton,
					)
				})
				return function () {}
			})
			return async function () {
				await disposeRemote()
			}
		}

		exports.apply = apply
		exports.inject = inject
		return module.exports
	},
})
