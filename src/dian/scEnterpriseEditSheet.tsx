import {
  useEffect,
  useRef,
  type ClipboardEvent,
  type Dispatch,
  type SetStateAction,
} from 'react'
import { withBackTap } from '../backTapFeedback'
import type { EnterpriseNoteEntry } from './scEnterpriseNoteTypes'
import { fileToDataUrl, formatNoteSavedAt, MAX_NOTE_IMAGES } from './scEnterpriseEditUtils'

export function ScEnterpriseEditSheet({
  open,
  companyName,
  noteText,
  onNoteTextChange,
  images,
  setImages,
  history,
  onSave,
  onCancel,
  saving,
}: {
  open: boolean
  companyName: string
  noteText: string
  onNoteTextChange: (v: string) => void
  images: string[]
  setImages: Dispatch<SetStateAction<string[]>>
  history: EnterpriseNoteEntry[]
  onSave: () => void
  onCancel: () => void
  saving: boolean
}) {
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const addFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files)
    const urls: string[] = []
    for (const f of arr) {
      if (urls.length >= MAX_NOTE_IMAGES) break
      const url = await fileToDataUrl(f)
      if (url) urls.push(url)
    }
    if (!urls.length) return
    setImages((prev) => [...prev, ...urls].slice(0, MAX_NOTE_IMAGES))
  }

  const onPasteImages = async (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items
    if (!items?.length) return
    const urls: string[] = []
    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      if (it.kind === 'file' && it.type.startsWith('image/')) {
        e.preventDefault()
        const f = it.getAsFile()
        if (f) {
          const url = await fileToDataUrl(f)
          if (url) urls.push(url)
        }
      }
    }
    if (!urls.length) return
    setImages((prev) => [...prev, ...urls].slice(0, MAX_NOTE_IMAGES))
  }

  if (!open) return null

  return (
    <div className="dian-sc-edit-root" role="presentation">
      <button
        type="button"
        className="dian-sc-edit-backdrop"
        aria-label="关闭"
        onClick={() => withBackTap(onCancel)}
      />
      <div
        className="dian-sc-edit-panel dian-sc-edit-panel--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dian-sc-edit-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dian-sc-edit-handle" aria-hidden />
        <h2 id="dian-sc-edit-title" className="dian-sc-edit-title">
          编辑
        </h2>
        <p className="dian-sc-edit-sub">{companyName}</p>

        <label className="dian-sc-edit-label" htmlFor="dian-sc-edit-note">
          本次跟进内容
        </label>
        <textarea
          id="dian-sc-edit-note"
          className="dian-sc-edit-textarea dian-sc-edit-textarea--tall"
          placeholder="填写文字；支持 Ctrl+V 粘贴图片"
          rows={5}
          value={noteText}
          onChange={(e) => onNoteTextChange(e.target.value)}
          onPaste={onPasteImages}
        />

        <div className="dian-sc-edit-img-toolbar">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="dian-sc-edit-file"
            onChange={(e) => {
              const fl = e.target.files
              if (fl?.length) void addFiles(fl)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            className="dian-sc-edit-img-btn"
            onClick={() => fileRef.current?.click()}
            disabled={images.length >= MAX_NOTE_IMAGES}
          >
            添加图片（{images.length}/{MAX_NOTE_IMAGES}）
          </button>
        </div>

        {images.length > 0 ? (
          <div className="dian-sc-edit-img-grid">
            {images.map((src, idx) => (
              <div key={`${idx}-${src.slice(0, 24)}`} className="dian-sc-edit-img-cell">
                <img src={src} alt="" className="dian-sc-edit-img-thumb" />
                <button
                  type="button"
                  className="dian-sc-edit-img-remove"
                  aria-label="移除图片"
                  onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {history.length > 0 ? (
          <div className="dian-sc-edit-history">
            <div className="dian-sc-edit-history-title">历史记录</div>
            <ul className="dian-sc-edit-history-list">
              {history.map((e) => (
                <li key={e.id} className="dian-sc-edit-history-item">
                  <div className="dian-sc-edit-history-time">{formatNoteSavedAt(e.savedAt)}</div>
                  <div className="dian-sc-edit-history-text">{e.text || (e.images.length ? '（图片）' : '—')}</div>
                  {e.images.length > 0 ? (
                    <div className="dian-sc-edit-history-imgs">
                      {e.images.slice(0, 4).map((src, i) => (
                        <img key={i} src={src} alt="" className="dian-sc-edit-history-thumb" />
                      ))}
                      {e.images.length > 4 ? <span className="dian-sc-edit-history-more">+{e.images.length - 4}</span> : null}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="dian-sc-edit-actions">
          <button
            type="button"
            className="dian-sc-edit-btn dian-sc-edit-btn-cancel"
            onClick={() => withBackTap(onCancel)}
            disabled={saving}
          >
            取消
          </button>
          <button type="button" className="dian-sc-edit-btn dian-sc-edit-btn-save" onClick={onSave} disabled={saving}>
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}
