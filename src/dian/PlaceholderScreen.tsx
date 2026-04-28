import { useState } from 'react'

type PlaceholderScreenProps = {
  title: string
  /** 计划能力点（仅非 AI 占位页使用） */
  items: string[]
  /** 卡片底部说明句 */
  footnote?: string
}

export default function PlaceholderScreen({ title, items, footnote = '以上内容将展示于此。' }: PlaceholderScreenProps) {
  const [aiDraft, setAiDraft] = useState('')

  if (title === 'AI') {
    const sendAi = () => {
      const q = aiDraft.trim()
      if (!q) return
      setAiDraft('')
    }

    return (
      <div className="dian-ai-query-page">
        <div className="dian-ai-query-main" role="main" aria-label="AI 查询内容区">
          <div className="dian-ai-query-main-body">
            <div className="dian-ai-query-main-stream" aria-label="对话与内容">
              <div className="dian-ai-query-scroll-inner">
                <h1 className="dian-ai-query-greeting">有什么可以帮忙的？</h1>
                <div className="dian-ai-query-promo-card">
                  <div className="dian-ai-query-promo-logo" aria-hidden>
                    <span className="dian-ai-query-promo-logo-m">滇</span>
                    <span className="dian-ai-query-promo-logo-sub">同学</span>
                  </div>
                  <div className="dian-ai-query-promo-body">
                    <p className="dian-ai-query-promo-title">滇同学 来了！</p>
                    <p className="dian-ai-query-promo-desc">
                      智慧中台能力将逐步接入，数据、业务与 AI 助手统一入口，随时提问。
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="dian-ai-query-dock">
              <button type="button" className="dian-ai-query-context-pill" aria-label="当前助手：滇同学">
                <span className="dian-ai-query-context-pill-icon" aria-hidden>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                滇同学
                <span className="dian-ai-query-context-chev" aria-hidden>
                  ›
                </span>
              </button>

              <div className="dian-ai-query-composer">
                <textarea
                  className="dian-ai-query-field"
                  placeholder="输入信息"
                  value={aiDraft}
                  onChange={(e) => setAiDraft(e.target.value)}
                  rows={3}
                  name="dian-ai-query-draft"
                  aria-label="向 AI 提问"
                />
                <div className="dian-ai-query-composer-bar">
                  <div className="dian-ai-query-composer-left">
                    <button type="button" className="dian-ai-tool-plus" aria-label="添加">
                      +
                    </button>
                    <button type="button" className="dian-ai-tool-versatile" aria-label="全能模式">
                      <span className="dian-ai-tool-versatile-icon" aria-hidden>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                          <path
                            d="M12 2l1.2 4.2L17 7l-4.2 1.2L12 12l-1.2-4.2L7 7l4.2-1.2L12 2zM19 14l.8 2.8 2.8.8-2.8.8-.8 2.8-.8-2.8-2.8-.8 2.8-.8.8-2.8z"
                            fill="currentColor"
                            opacity="0.85"
                          />
                        </svg>
                      </span>
                      全能
                    </button>
                  </div>
                  <button
                    type="button"
                    className="dian-ai-send-fab"
                    aria-label="发送"
                    disabled={!aiDraft.trim()}
                    onClick={sendAi}
                  >
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M12 19V5M5 12l7-7 7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              <p className="dian-ai-query-disclaimer">内容由 AI 生成，重要信息请务必核查</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const spotlightClass = 'dian-card--spotlight-slate'
  const promoTitle = '经营数据中心 来了！'
  const promoLead = '经营态势、统计报表与多维分析将集中呈现，便于一眼掌握关键指标。'

  return (
    <>
      <div className="dian-simple-pad">
        <div className={`dian-card dian-card--placeholder-spotlight ${spotlightClass}`}>
          <div className="dian-placeholder-spotlight-row">
            <div className="dian-placeholder-spotlight-logo" aria-hidden>
              <span className="dian-placeholder-spotlight-logo-m">滇</span>
              <span className="dian-placeholder-spotlight-logo-sub">同学</span>
            </div>
            <div className="dian-placeholder-spotlight-body">
              <p className="dian-placeholder-spotlight-title">{promoTitle}</p>
              <p className="dian-placeholder-spotlight-desc">{promoLead}</p>
              <ul className="dian-placeholder-spotlight-list">
                {items.map((text) => (
                  <li key={text}>{text}</li>
                ))}
              </ul>
            </div>
          </div>

          {footnote ? <p className="dian-placeholder-spotlight-foot">{footnote}</p> : null}
          <p className="dian-placeholder-spotlight-hint">功能开发中，结构与首页底栏导航一致。</p>
        </div>
      </div>
    </>
  )
}
