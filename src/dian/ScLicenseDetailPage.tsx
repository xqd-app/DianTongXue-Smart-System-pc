import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import {
  buildLicenseDetailSections,
  parseVarietyDetailsFromPdVo,
} from './licenseDetailModel'
import type { LicenseRow } from './scLicenseTypes'
import { loadScDetailRowSession, persistScDetailRowSession } from './scDetailRowSession'
import type { EnterpriseNoteEntry } from './scEnterpriseNoteTypes'
import {
  fetchEnterpriseNoteHistory,
  hasEnterpriseId,
  noteStorageKey,
  persistNoteEntryLocal,
  saveEnterpriseNotesRemote,
} from './scEnterpriseNoteApi'
import { safeRandomUuid } from '../utils/safeRandomId'
import { formatNoteSavedAt } from './scEnterpriseEditUtils'
import { ScEnterpriseEditSheet } from './scEnterpriseEditSheet'
import {
  FavoriteStarIcon,
  isLicenseInFavorites,
  toggleLicenseFavorite,
  useScFavoriteSet,
} from './scEnterpriseFavorites'
import { ScrollToTopFab } from './ScrollToTopFab'
import './dian-app.css'

type LocationState = { row?: LicenseRow }

function ScField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="dian-sc-field">
      <span className="dian-sc-field-label">{label}</span>
      <span className={mono ? 'dian-sc-field-value dian-sc-field-mono' : 'dian-sc-field-value'}>{value}</span>
    </div>
  )
}

export default function ScLicenseDetailPage({ onBack }: { onBack: () => void }) {
  const { licenseNo: licenseNoParam } = useParams()
  const location = useLocation()

  const licenseNo = licenseNoParam ? decodeURIComponent(licenseNoParam) : ''

  const [row, setRow] = useState<LicenseRow | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [draftNoteText, setDraftNoteText] = useState('')
  const [draftImages, setDraftImages] = useState<string[]>([])
  const [noteSaving, setNoteSaving] = useState(false)
  const [noteHistory, setNoteHistory] = useState<EnterpriseNoteEntry[]>([])
  const [detailScrollEl, setDetailScrollEl] = useState<HTMLDivElement | null>(null)
  const favoriteSet = useScFavoriteSet()

  useEffect(() => {
    const title = '许可证详情'
    const applyTitle = () => {
      document.title = title
      const appMeta = document.querySelector('meta[name="application-name"]')
      appMeta?.setAttribute('content', title)
      const appleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]')
      appleMeta?.setAttribute('content', title)
    }
    applyTitle()
    const retryId = window.setTimeout(() => {
      applyTitle()
    }, 80)
    return () => window.clearTimeout(retryId)
  }, [])

  useEffect(() => {
    if (!licenseNo) {
      setRow(null)
      return
    }
    const st = location.state as LocationState | undefined
    const fromState = st?.row?.licenseNo === licenseNo ? st.row : undefined
    if (fromState) {
      setRow(fromState)
      persistScDetailRowSession(licenseNo, fromState)
      return
    }
    setRow(loadScDetailRowSession(licenseNo))
  }, [licenseNo, location.state])

  const refreshNoteHistory = useCallback(async (r: LicenseRow) => {
    const list = await fetchEnterpriseNoteHistory(r.enterpriseId, r.licenseNo)
    setNoteHistory(list)
  }, [])

  useEffect(() => {
    if (!row) return
    void refreshNoteHistory(row)
  }, [row, refreshNoteHistory])

  const detailSections = useMemo(() => (row ? buildLicenseDetailSections(row) : []), [row])
  const varieties = useMemo(() => {
    if (!row) return []
    const fromApi = row.varietyRows
    if (fromApi?.length) return fromApi
    return parseVarietyDetailsFromPdVo(row.db?.pdVo)
  }, [row])

  const openEdit = useCallback(() => {
    if (!row) return
    setDraftNoteText('')
    setDraftImages([])
    void refreshNoteHistory(row)
    setEditOpen(true)
  }, [row, refreshNoteHistory])

  const closeEdit = useCallback(() => {
    setEditOpen(false)
  }, [])

  const saveEnterpriseEdit = useCallback(async () => {
    if (!row) return
    const textT = draftNoteText.trim()
    const hasNote = textT.length > 0 || draftImages.length > 0
    if (!hasNote) {
      setEditOpen(false)
      return
    }
    setNoteSaving(true)
    try {
      const newEntry: EnterpriseNoteEntry = {
        id: safeRandomUuid(),
        savedAt: new Date().toISOString(),
        text: textT,
        images: [...draftImages],
      }
      const nk = noteStorageKey(row)
      persistNoteEntryLocal(nk, newEntry)
      if (hasEnterpriseId(row.enterpriseId)) {
        void saveEnterpriseNotesRemote(row.enterpriseId.trim(), {
          notes: newEntry.text,
          images: newEntry.images,
        })
      }
      setNoteHistory((prev) => [newEntry, ...prev])
      const nextRemark = textT
        ? textT.slice(0, 120) + (textT.length > 120 ? '…' : '')
        : draftImages.length
          ? '［图片跟进］'
          : row.remark
      setRow((r) => (r ? { ...r, remark: nextRemark } : r))
      const updated = row ? { ...row, remark: nextRemark } : row
      if (updated) persistScDetailRowSession(licenseNo, updated)
      void refreshNoteHistory(row)
      setEditOpen(false)
      setDraftNoteText('')
      setDraftImages([])
    } finally {
      setNoteSaving(false)
    }
  }, [row, draftNoteText, draftImages, licenseNo, refreshNoteHistory])

  if (!licenseNo) {
    return (
      <div className="dian-subpage dian-sc-detail-page-shell">
        <header className="dian-subpage-top">
          <button type="button" className="dian-subpage-back" onClick={onBack} aria-label="返回">
            <span className="dian-subpage-back-icon" aria-hidden>
              ‹
            </span>
          </button>
          <h1 className="dian-sc-detail-page-top-title">许可证详情</h1>
          <span className="dian-sc-detail-page-top-spacer" aria-hidden />
        </header>
        <p className="dian-sc-search-pending">缺少许可证编号</p>
      </div>
    )
  }

  if (!row) {
    return (
      <div className="dian-subpage dian-sc-detail-page-shell">
        <header className="dian-subpage-top">
          <button type="button" className="dian-subpage-back" onClick={onBack} aria-label="返回">
            <span className="dian-subpage-back-icon" aria-hidden>
              ‹
            </span>
          </button>
          <h1 className="dian-sc-detail-page-top-title">许可证详情</h1>
          <span className="dian-sc-detail-page-top-spacer" aria-hidden />
        </header>
        <div className="dian-sc-result-card">
          <p className="dian-sc-empty-desc">未找到该条记录（请从列表重新进入，或刷新后重试）</p>
          <button type="button" className="dian-sc-api-demo-btn" onClick={onBack}>
            返回列表
          </button>
        </div>
      </div>
    )
  }

  const favorited = isLicenseInFavorites(favoriteSet, row.licenseNo)

  return (
    <div className="dian-subpage dian-sc-detail-page-shell">
      <header className="dian-subpage-top dian-sc-detail-page-top-row">
        <button type="button" className="dian-subpage-back" onClick={onBack} aria-label="返回">
          <span className="dian-subpage-back-icon" aria-hidden>
            ‹
          </span>
        </button>
        <h1 className="dian-sc-detail-page-top-title">许可证详情</h1>
        <button
          type="button"
          className={`dian-sc-detail-favorite-btn${favorited ? ' dian-sc-detail-favorite-btn--on' : ''}`}
          aria-label={favorited ? '取消收藏' : '收藏'}
          aria-pressed={favorited}
          onClick={() => {
            toggleLicenseFavorite(row.licenseNo)
          }}
        >
          <FavoriteStarIcon filled={favorited} />
        </button>
      </header>

      <div
        className="dian-sc-detail-panel dian-sc-detail-panel--page"
        role="region"
        aria-label={`${row.companyName}，许可证详情`}
      >
        <div className="dian-sc-detail-handle" aria-hidden />
        <div ref={setDetailScrollEl} className="dian-sc-detail-scroll">
          {detailSections.map((sec, si) => (
            <section key={sec.title} className="dian-sc-detail-section" aria-label={sec.title}>
              <h2
                className={`dian-sc-detail-section-title${si === 0 ? ' dian-sc-detail-section-title--first' : ''}`}
              >
                {sec.title}
              </h2>
              <div className="dian-sc-detail-fields">
                {sec.lines.map((line, idx) => {
                  const inner = <ScField label={line.label} value={line.value} mono={line.mono} />
                  const k = `${sec.title}-${line.label}-${idx}`
                  if (line.featured) {
                    return (
                      <div key={k} className="dian-sc-detail-field-featured">
                        {inner}
                      </div>
                    )
                  }
                  return (
                    <div
                      key={k}
                      className={`dian-sc-detail-field-wrap${line.fullRow ? ' dian-sc-detail-field-wrap--full' : ''}`}
                    >
                      {inner}
                    </div>
                  )
                })}
              </div>
            </section>
          ))}

          {varieties.length > 0 ? (
            <div className="dian-sc-detail-varieties">
              <h3 className="dian-sc-detail-section-title">食品生产许可品种明细表</h3>
              <div className="dian-sc-varieties-scroll">
                <table className="dian-sc-varieties-table dian-sc-varieties-table--detail">
                  <thead>
                    <tr>
                      <th>序号</th>
                      <th>食品、食品添加剂类别</th>
                      <th>类别编号</th>
                      <th>类别名称</th>
                      <th>品种明细</th>
                      <th>备注</th>
                    </tr>
                  </thead>
                  <tbody>
                    {varieties.map((v) => (
                      <tr key={v.seq}>
                        <td>{v.seq}</td>
                        <td>{v.foodCategory}</td>
                        <td>{v.categoryCode}</td>
                        <td>{v.categoryName}</td>
                        <td>{v.varietyDetail}</td>
                        <td>{v.remark}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {noteHistory.length > 0 ? (
            <div className="dian-sc-detail-notes">
              <h3 className="dian-sc-detail-section-title">跟进记录</h3>
              <ul className="dian-sc-detail-notes-list">
                {noteHistory.slice(0, 30).map((e) => (
                  <li key={e.id} className="dian-sc-detail-notes-item">
                    <div className="dian-sc-detail-notes-time">{formatNoteSavedAt(e.savedAt)}</div>
                    <div className="dian-sc-detail-notes-body">
                      {e.text ? <p className="dian-sc-detail-notes-text">{e.text}</p> : null}
                      {e.images.length > 0 ? (
                        <div className="dian-sc-detail-notes-imgs">
                          {e.images.map((src, i) => (
                            <a key={i} href={src} target="_blank" rel="noreferrer" className="dian-sc-detail-notes-img-a">
                              <img src={src} alt="" className="dian-sc-detail-notes-img" />
                            </a>
                          ))}
                        </div>
                      ) : null}
                      {!e.text && e.images.length === 0 ? <p className="dian-sc-detail-notes-text">—</p> : null}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
        <div className="dian-sc-detail-footer">
          <button type="button" className="dian-sc-detail-edit-link" onClick={openEdit}>
            编辑
          </button>
          <button type="button" className="dian-sc-detail-close" onClick={onBack}>
            返回列表
          </button>
        </div>
      </div>

      <ScrollToTopFab target="element" scrollEl={detailScrollEl} />

      <ScEnterpriseEditSheet
        open={editOpen}
        companyName={row.companyName}
        noteText={draftNoteText}
        onNoteTextChange={setDraftNoteText}
        images={draftImages}
        setImages={setDraftImages}
        history={noteHistory}
        onSave={() => void saveEnterpriseEdit()}
        onCancel={closeEdit}
        saving={noteSaving}
      />
    </div>
  )
}
