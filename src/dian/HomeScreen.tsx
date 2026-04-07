import { useEffect, useState } from 'react'

type Scope = 'all' | 'self'
type MainTab = 'overview' | 'opportunity' | 'loss'
type OverviewSub = 'today' | 'month' | 'week'
type OppSub = 'd7' | 'd30'
type LossSub = 'stock' | 'logistics' | 'aftersale'

function MiniLineChart() {
  const gl = '#e8ecf1'
  const tx = '#94a3b8'
  /* 绘图区：左 34 右 302，上 18 下 118（约 0～60万） */
  const ys = [18, 38, 58, 78, 98, 118]
  return (
    <div className="dian-chart-wrap">
      <svg viewBox="0 0 320 148" preserveAspectRatio="xMidYMid meet">
        {ys.map((y) => (
          <line
            key={y}
            x1="34"
            y1={y}
            x2="302"
            y2={y}
            stroke={gl}
            strokeWidth="1"
            strokeDasharray="3 5"
          />
        ))}
        <line x1="34" y1="18" x2="34" y2="118" stroke="#dce3ea" strokeWidth="1" />
        <line x1="34" y1="118" x2="302" y2="118" stroke="#dce3ea" strokeWidth="1" />
        <text x="0" y="21" fontSize="9" fill={tx}>
          60万
        </text>
        <text x="0" y="41" fontSize="9" fill={tx}>
          45万
        </text>
        <text x="0" y="61" fontSize="9" fill={tx}>
          30万
        </text>
        <text x="0" y="81" fontSize="9" fill={tx}>
          15万
        </text>
        <text x="4" y="121" fontSize="9" fill={tx}>
          0
        </text>
        <text x="28" y="140" fontSize="9" fill={tx} textAnchor="middle">
          0:00
        </text>
        <text x="122" y="140" fontSize="9" fill={tx} textAnchor="middle">
          8:00
        </text>
        <text x="214" y="140" fontSize="9" fill={tx} textAnchor="middle">
          16:00
        </text>
        <text x="296" y="140" fontSize="9" fill={tx} textAnchor="middle">
          24:00
        </text>
        <polyline
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          points="38,108 62,98 86,82 110,62 138,38 168,22 198,20 228,24 258,28 288,30 300,32"
        />
        <polyline
          fill="none"
          stroke="#ff8c42"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          points="38,112 72,104 106,96 140,88 174,80 208,74 242,70 276,66 300,64"
        />
        <polyline
          fill="none"
          stroke="#34c759"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          points="38,114 78,108 118,102 158,96 198,90 238,86 278,82 300,80"
        />
      </svg>
    </div>
  )
}

export default function HomeScreen() {
  const [scope, setScope] = useState<Scope>('all')
  const [mainTab, setMainTab] = useState<MainTab>('overview')
  const [ovSub, setOvSub] = useState<OverviewSub>('today')
  const [oppSub, setOppSub] = useState<OppSub>('d7')
  const [lossSub, setLossSub] = useState<LossSub>('stock')
  const [chartMetric, setChartMetric] = useState<
    'amt' | 'net' | 'profit' | 'cost' | 'orders' | 'pieces'
  >('amt')
  const [chartMode, setChartMode] = useState<'sum' | 'hour'>('sum')
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const timeStr = now.toLocaleTimeString('zh-CN', { hour12: false })

  return (
    <>
      <div className="dian-home-pad dian-home-pad--no-app-topbar">
        <div className="dian-scope-bar">
          <div className="dian-scope-tabs" role="tablist" aria-label="数据范围">
            <button type="button" className={scope === 'all' ? 'dian-active' : ''} onClick={() => setScope('all')}>
              全部
            </button>
            <button type="button" className={scope === 'self' ? 'dian-active' : ''} onClick={() => setScope('self')}>
              自营
            </button>
          </div>
          <span className="dian-user-meta">数据更新于 {timeStr}</span>
        </div>

        <section className="dian-hero-card" aria-label="本月销售概览">
          <div className="dian-hero-top">
            <div>
              <p className="dian-hero-label">本月销售金额</p>
              <p className="dian-hero-value">¥ 7,361,027.55</p>
            </div>
            <button type="button" className="dian-hero-pill">
              团队业绩
            </button>
          </div>
          <div className="dian-hero-stats">
            <div className="dian-hero-stat">
              <span>本月目标</span>
              <strong>¥ -</strong>
            </div>
            <div className="dian-hero-stat">
              <span>完成度</span>
              <strong>-</strong>
            </div>
            <div className="dian-hero-stat">
              <span>时间进度</span>
              <strong>14.77%</strong>
            </div>
          </div>
        </section>

        <div className="dian-main-tabs">
          <button
            type="button"
            className={mainTab === 'overview' ? 'dian-active' : ''}
            onClick={() => setMainTab('overview')}
          >
            经营总览
          </button>
          <button
            type="button"
            className={mainTab === 'opportunity' ? 'dian-active' : ''}
            onClick={() => setMainTab('opportunity')}
          >
            发现商机
          </button>
          <button
            type="button"
            className={mainTab === 'loss' ? 'dian-active' : ''}
            onClick={() => setMainTab('loss')}
          >
            资损预警
          </button>
        </div>

        {mainTab === 'overview' ? (
          <>
            <div className="dian-sub-tabs">
              <button type="button" className={ovSub === 'today' ? 'dian-active' : ''} onClick={() => setOvSub('today')}>
                今日实时
              </button>
              <button type="button" className={ovSub === 'month' ? 'dian-active' : ''} onClick={() => setOvSub('month')}>
                本月实时
              </button>
              <button type="button" className={ovSub === 'week' ? 'dian-active' : ''} onClick={() => setOvSub('week')}>
                近7天经营周报
              </button>
            </div>

            {ovSub === 'today' ? (
              <>
                <div className="dian-card">
                  <div className="dian-card-head">
                    <h2 className="dian-card-title">
                      <span className="dian-card-title-icon" style={{ background: 'rgba(37,99,235,0.12)', color: '#2563eb' }}>
                        📄
                      </span>
                      订单
                    </h2>
                    <div className="dian-card-actions">
                      <button type="button" className="dian-chip-btn">
                        渠道分析
                      </button>
                      <button type="button" className="dian-chip-btn">
                        商品分析
                      </button>
                    </div>
                  </div>
                  <div className="dian-metric-grid">
                    <div className="dian-metric-cell">
                      <div className="label">销售金额</div>
                      <div className="value">¥88.32</div>
                      <div className="delta">较昨日 +702.91%</div>
                    </div>
                    <div className="dian-metric-cell">
                      <div className="label">净销售金额</div>
                      <div className="value">¥88.32</div>
                      <div className="delta">较昨日 +702.91%</div>
                    </div>
                    <div className="dian-metric-cell">
                      <div className="label">毛利/毛利率</div>
                      <div className="value dian-mask">***</div>
                      <span className="dian-tag-green">有权限可见</span>
                    </div>
                    <div className="dian-metric-cell">
                      <div className="label">净成本/占净金额</div>
                      <div className="value dian-mask">***</div>
                      <span className="dian-tag-green">有权限可见</span>
                    </div>
                  </div>
                  <div className="dian-mini-section">
                    <div className="dian-metric-grid">
                      <div className="dian-metric-cell">
                        <div className="label">商品毛利/毛利率</div>
                        <div className="value dian-mask">···</div>
                        <span className="dian-tag-green">有权限可见</span>
                      </div>
                      <div className="dian-metric-cell">
                        <div className="label">销售订单数/销售件数</div>
                        <div className="value">3/6</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="dian-card dian-chart-card">
                  <div className="dian-chart-toolbar" role="group" aria-label="图表指标">
                    {(
                      [
                        ['amt', '金额'],
                        ['net', '净金额'],
                        ['profit', '毛利'],
                        ['cost', '净成本'],
                        ['orders', '订单数'],
                        ['pieces', '件数'],
                      ] as const
                    ).map(([k, lab]) => (
                      <button
                        key={k}
                        type="button"
                        className={`pill ${chartMetric === k ? 'dian-active' : ''}`}
                        onClick={() => setChartMetric(k)}
                      >
                        {lab}
                      </button>
                    ))}
                  </div>
                  <div className="dian-chart-toggle-wrap">
                    <div className="dian-chart-toggle">
                      <button type="button" className={chartMode === 'sum' ? 'dian-active' : ''} onClick={() => setChartMode('sum')}>
                        累计
                      </button>
                      <button type="button" className={chartMode === 'hour' ? 'dian-active' : ''} onClick={() => setChartMode('hour')}>
                        小时
                      </button>
                    </div>
                  </div>
                  <div className="dian-chart-panel">
                    <MiniLineChart />
                  </div>
                </div>

                <div className="dian-card">
                  <div className="dian-mini-head">
                    <h4>
                      <span style={{ color: '#ea580c' }}>🚚</span> 今日发货
                    </h4>
                    <button type="button" className="dian-link">
                      发货预警
                    </button>
                  </div>
                  <div className="dian-mini-metrics">
                    <div>
                      <div className="l">发货金额</div>
                      <div className="v">¥88.32</div>
                    </div>
                    <div>
                      <div className="l">发货订单数</div>
                      <div className="v">3</div>
                    </div>
                    <div>
                      <div className="l">发货件数</div>
                      <div className="v">6</div>
                    </div>
                  </div>
                  <div className="dian-mini-section">
                    <div className="dian-mini-head">
                      <h4>
                        <span style={{ color: '#ca8a04' }}>📦</span> 今日退款
                      </h4>
                      <button type="button" className="dian-link">
                        售后预警
                      </button>
                    </div>
                    <div className="dian-mini-metrics">
                      <div>
                        <div className="l">
                          退款金额<span className="dian-erp-tag">ERP</span>
                        </div>
                        <div className="v">¥0.00</div>
                      </div>
                      <div>
                        <div className="l">
                          退款订单数<span className="dian-erp-tag">ERP</span>
                        </div>
                        <div className="v">0</div>
                      </div>
                      <div>
                        <div className="l">
                          退款件数<span className="dian-erp-tag">ERP</span>
                        </div>
                        <div className="v">0</div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="dian-card">
                <p style={{ margin: 0, fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>
                  {ovSub === 'month' ? '本月实时数据与趋势可在登录后同步您的店铺数据查看。' : '近7天经营周报支持多维度对比，登录后解锁完整报表。'}
                </p>
              </div>
            )}
          </>
        ) : null}

        {mainTab === 'opportunity' ? (
          <>
            <div className="dian-sub-tabs">
              <button type="button" className={oppSub === 'd7' ? 'dian-active' : ''} onClick={() => setOppSub('d7')}>
                近7天
              </button>
              <button type="button" className={oppSub === 'd30' ? 'dian-active' : ''} onClick={() => setOppSub('d30')}>
                近30天
              </button>
            </div>
            <div className="dian-biz-block">
              <div className="head">
                <span style={{ color: '#ea580c' }}>◆</span> 分销业务（供销+订单）
              </div>
              <div className="dian-empty-card">您暂无供销+订单数据~</div>
            </div>
            <div className="dian-biz-block">
              <div className="head">
                <span style={{ color: '#7c3aed' }}>◆</span> 直播业务（达播订单）
              </div>
              <div className="dian-empty-card">您暂无达播订单数据~</div>
            </div>
          </>
        ) : null}

        {mainTab === 'loss' ? (
          <>
            <div className="dian-sub-tabs">
              <button type="button" className={lossSub === 'stock' ? 'dian-active' : ''} onClick={() => setLossSub('stock')}>
                缺货处罚预警
              </button>
              <button type="button" className={lossSub === 'logistics' ? 'dian-active' : ''} onClick={() => setLossSub('logistics')}>
                物流超时预警
              </button>
              <button type="button" className={lossSub === 'aftersale' ? 'dian-active' : ''} onClick={() => setLossSub('aftersale')}>
                售后预警
              </button>
            </div>

            {lossSub === 'stock' ? (
              <div className="dian-card dian-loss-card">
                <div className="dian-card-head" style={{ marginBottom: 8 }}>
                  <h2 className="dian-card-title">
                    <span className="dian-card-title-icon" style={{ background: '#fff7ed', color: '#c2410c' }}>!</span>
                    近30天支付且未发货订单
                  </h2>
                </div>
                <div className="dian-loss-row">
                  <span>近7日关注风险的子账号数</span>
                  <button type="button" className="dian-chip-btn">
                    找人跟进
                  </button>
                </div>
                <p className="dian-loss-muted" style={{ margin: '12px 0 8px' }}>
                  浅库存防处罚：避免因缺货导致延迟发货处罚。
                </p>
                <div className="dian-loss-grid">
                  <div>
                    SKU
                    <strong>-</strong>
                  </div>
                  <div>
                    款式
                    <strong>-</strong>
                  </div>
                  <div>
                    延迟发货处罚预估
                    <strong>¥ -</strong>
                  </div>
                  <div>
                    未发货订单数
                    <strong>-</strong>
                  </div>
                </div>
                <div className="dian-loss-actions">
                  <button type="button" className="dian-outline-btn">
                    查看商品明细
                  </button>
                  <button type="button" className="dian-outline-btn">
                    去采购
                  </button>
                </div>
              </div>
            ) : null}

            {lossSub === 'logistics' ? (
              <div className="dian-card dian-loss-card">
                <div className="dian-card-head" style={{ marginBottom: 8 }}>
                  <h2 className="dian-card-title">
                    <span className="dian-card-title-icon" style={{ background: '#fff7ed', color: '#ea580c' }}>🚚</span>
                    物流超时预警
                  </h2>
                </div>
                <div className="dian-sub-tabs" style={{ marginBottom: 12 }}>
                  <button type="button" className="dian-active">
                    近7天
                  </button>
                  <button type="button">近30天</button>
                </div>
                <div className="dian-loss-row">
                  <span>近7日关注风险的子账号数</span>
                  <button type="button" className="dian-chip-btn">
                    找人跟进
                  </button>
                </div>
                <p style={{ fontSize: 13, fontWeight: 600, margin: '14px 0 8px' }}>发货快超时</p>
                <div className="dian-loss-grid">
                  <div>
                    待审核
                    <strong>-</strong>
                  </div>
                  <div>
                    未发货
                    <strong>-</strong>
                  </div>
                </div>
                <div className="dian-loss-actions">
                  <button type="button" className="dian-outline-btn">
                    找人处理
                  </button>
                  <button type="button" className="dian-outline-btn">
                    联系快递处理
                  </button>
                </div>
              </div>
            ) : null}

            {lossSub === 'aftersale' ? (
              <div className="dian-card dian-loss-card">
                <div className="dian-card-head" style={{ marginBottom: 8 }}>
                  <h2 className="dian-card-title">
                    <span className="dian-card-title-icon" style={{ background: '#fff7ed', color: '#ea580c' }}>💡</span>
                    售后预警
                  </h2>
                </div>
                <div className="dian-sub-tabs" style={{ marginBottom: 12 }}>
                  <button type="button" className="dian-active">
                    近7天
                  </button>
                  <button type="button">近30天</button>
                </div>
                <div className="dian-loss-row">
                  <span>待拦截售后单（仅退款+退货退款）</span>
                  <button type="button" className="dian-chip-btn">
                    找人去拦截
                  </button>
                </div>
                <div className="dian-loss-row">
                  <span>仅退款 · 买家已签收</span>
                  <button type="button" className="dian-chip-btn">
                    找人跟进
                  </button>
                </div>
                <div className="dian-loss-grid">
                  <div>
                    在途已拦截
                    <strong>-</strong>
                  </div>
                  <div>
                    拦截已签收
                    <strong>-</strong>
                  </div>
                  <div>
                    未揽收
                    <strong>-</strong>
                  </div>
                  <div>
                    未发货
                    <strong>-</strong>
                  </div>
                </div>
                <div className="dian-loss-actions">
                  <button type="button" className="dian-outline-btn">
                    找人去退款
                  </button>
                  <button type="button" className="dian-outline-btn">
                    找人去处理
                  </button>
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </>
  )
}
