type PlaceholderScreenProps = {
  title: string
  /** 计划能力点（仅非 AI 占位页使用） */
  items: string[]
  /** 卡片底部说明句 */
  footnote?: string
}

export default function PlaceholderScreen({ title, items, footnote = '以上内容将展示于此。' }: PlaceholderScreenProps) {
  const isAi = title === 'AI'

  if (isAi) {
    return (
      <div className="dian-ai-query-page">
        <div className="dian-ai-query-main" role="main" aria-label="AI 查询内容区">
          <div className="dian-ai-query-main-body">
            <div className="dian-ai-query-main-stream" aria-label="对话与内容" />
            <div className="dian-ai-query-main-bottom" aria-label="底部区域" />
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
