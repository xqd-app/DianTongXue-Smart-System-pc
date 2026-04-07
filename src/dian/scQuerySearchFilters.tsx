import type { RefObject, ReactNode } from 'react'

export type ScPhoneFilter = 'all' | 'has' | 'none'
export type ScRemarkFilter = 'all' | 'has' | 'none'
export type ScContactFilter = 'all' | '已联系' | '未联系'
export type ScFavoriteFilter = 'all' | 'only' | 'none'

type ScQuerySearchFiltersProps = {
  /** drawer：底部悬浮抽屉内专用布局，不与页顶「返回+搜索」重复一层壳 */
  variant?: 'page' | 'drawer'
  idSuffix: string
  hideBack?: boolean
  onBack?: () => void
  query: string
  setQuery: (v: string) => void
  searchInputRef: RefObject<HTMLInputElement | null>
  clearSearchOnDoubleClick: () => void
  SearchIcon: () => ReactNode
  dataSourceLine: ReactNode
  filterPanelOpen: boolean
  setFilterPanelOpen: (v: boolean | ((p: boolean) => boolean)) => void
  filterFood: string
  setFilterFood: (v: string) => void
  filterAuthority: string
  setFilterAuthority: (v: string) => void
  filterPhone: ScPhoneFilter
  setFilterPhone: (v: ScPhoneFilter) => void
  filterContact: ScContactFilter
  setFilterContact: (v: ScContactFilter) => void
  filterRemark: ScRemarkFilter
  setFilterRemark: (v: ScRemarkFilter) => void
  filterFavorite: ScFavoriteFilter
  setFilterFavorite: (v: ScFavoriteFilter) => void
  filterActiveCount: number
  foodOptions: string[]
  authorityOptions: string[]
  setPage: (v: number | ((p: number) => number)) => void
}

export default function ScQuerySearchFilters({
  variant = 'page',
  idSuffix,
  hideBack,
  onBack,
  query,
  setQuery,
  searchInputRef,
  clearSearchOnDoubleClick,
  SearchIcon,
  filterPanelOpen,
  setFilterPanelOpen,
  filterFood,
  setFilterFood,
  filterAuthority,
  setFilterAuthority,
  filterPhone,
  setFilterPhone,
  filterContact,
  setFilterContact,
  filterRemark,
  setFilterRemark,
  filterFavorite,
  setFilterFavorite,
  filterActiveCount,
  foodOptions,
  authorityOptions,
  setPage,
}: ScQuerySearchFiltersProps) {
  const gridId = `dian-sc-filter-grid${idSuffix}`
  const toggleId = `dian-sc-filter-toggle${idSuffix}`
  const isDrawer = variant === 'drawer'

  const searchBlock = (
    <div
      className={`dian-sc-search${isDrawer ? ' dian-sc-search--drawer' : ''}`}
      role="search"
      onDoubleClick={isDrawer ? undefined : clearSearchOnDoubleClick}
      title={isDrawer ? undefined : '双击清空搜索'}
    >
      <span className="dian-sc-search-icon">
        <SearchIcon />
      </span>
      <input
        ref={searchInputRef}
        type="search"
        className="dian-sc-search-input"
            placeholder="企业名称、许可证号（可查本地是否收藏）等"
        enterKeyHint="search"
        autoComplete="off"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
    </div>
  )

  return (
    <>
      {isDrawer ? (
        <div className="dian-sc-filter-drawer-top">{searchBlock}</div>
      ) : (
        <header className="dian-subpage-top">
          {!hideBack && onBack ? (
            <button type="button" className="dian-subpage-back" onClick={onBack} aria-label="返回">
              <span className="dian-subpage-back-icon" aria-hidden>
                ‹
              </span>
            </button>
          ) : null}
          {searchBlock}
        </header>
      )}

      <div
        className={`dian-sc-filter-bar${isDrawer ? ' dian-sc-filter-bar--drawer' : ''}`}
        role="toolbar"
        aria-label="列表筛选"
      >
        <div className={`dian-sc-filter-panel${filterPanelOpen ? ' dian-sc-filter-panel--open' : ''}`}>
          <button
            type="button"
            className="dian-sc-filter-toggle"
            aria-expanded={filterPanelOpen}
            aria-controls={gridId}
            id={toggleId}
            onClick={() => setFilterPanelOpen((v) => !v)}
          >
            <span className="dian-sc-filter-head-ico" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
              </svg>
            </span>
            <span className="dian-sc-filter-head-text">
              <span className="dian-sc-filter-head-row">
                <span className="dian-sc-filter-head-title">筛选条件</span>
                {filterActiveCount > 0 ? (
                  <span className="dian-sc-filter-badge" aria-label={`已选 ${filterActiveCount} 项`}>
                    {filterActiveCount}
                  </span>
                ) : null}
              </span>
              <span className="dian-sc-filter-head-hint">{filterPanelOpen ? '轻触收起' : '轻触展开'}</span>
            </span>
            <span className="dian-sc-filter-chevron" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </button>
          <div
            className="dian-sc-filter-animate"
            aria-hidden={!filterPanelOpen}
            inert={filterPanelOpen ? undefined : true}
          >
            <div
              id={gridId}
              className={`dian-sc-filter-grid${isDrawer ? ' dian-sc-filter-grid--3x2' : ''}`}
            >
              {isDrawer ? (
                <>
                  <label className="dian-sc-filter-field" htmlFor={`dian-sc-f-fav${idSuffix}`}>
                    <span className="dian-sc-filter-label">收藏</span>
                    <select
                      id={`dian-sc-f-fav${idSuffix}`}
                      className="dian-sc-filter-select"
                      value={filterFavorite}
                      onChange={(e) => {
                        setFilterFavorite(e.target.value as ScFavoriteFilter)
                        setPage(1)
                      }}
                    >
                      <option value="all">全部</option>
                      <option value="only">仅看收藏</option>
                      <option value="none">仅未收藏</option>
                    </select>
                  </label>
                  <label className="dian-sc-filter-field" htmlFor={`dian-sc-f-remark${idSuffix}`}>
                    <span className="dian-sc-filter-label">备注</span>
                    <select
                      id={`dian-sc-f-remark${idSuffix}`}
                      className="dian-sc-filter-select"
                      value={filterRemark}
                      onChange={(e) => {
                        setFilterRemark(e.target.value as ScRemarkFilter)
                        setPage(1)
                      }}
                    >
                      <option value="all">全部</option>
                      <option value="has">已备注</option>
                      <option value="none">未备注</option>
                    </select>
                  </label>
                  <label className="dian-sc-filter-field" htmlFor={`dian-sc-f-contact${idSuffix}`}>
                    <span className="dian-sc-filter-label">联系记录</span>
                    <select
                      id={`dian-sc-f-contact${idSuffix}`}
                      className="dian-sc-filter-select"
                      value={filterContact}
                      onChange={(e) => {
                        setFilterContact(e.target.value as ScContactFilter)
                        setPage(1)
                      }}
                    >
                      <option value="all">全部</option>
                      <option value="已联系">已联系</option>
                      <option value="未联系">未联系</option>
                    </select>
                  </label>
                </>
              ) : (
                <label className="dian-sc-filter-field dian-sc-filter-field--full" htmlFor={`dian-sc-f-fav${idSuffix}`}>
                  <span className="dian-sc-filter-label">收藏</span>
                  <select
                    id={`dian-sc-f-fav${idSuffix}`}
                    className="dian-sc-filter-select"
                    value={filterFavorite}
                    onChange={(e) => {
                      setFilterFavorite(e.target.value as ScFavoriteFilter)
                      setPage(1)
                    }}
                  >
                    <option value="all">全部</option>
                    <option value="only">仅看收藏</option>
                    <option value="none">仅未收藏</option>
                  </select>
                </label>
              )}
              <label className="dian-sc-filter-field" htmlFor={`dian-sc-f-food${idSuffix}`}>
                <span className="dian-sc-filter-label">产品类别</span>
                <select
                  id={`dian-sc-f-food${idSuffix}`}
                  className="dian-sc-filter-select"
                  value={filterFood}
                  onChange={(e) => {
                    setFilterFood(e.target.value)
                    setPage(1)
                  }}
                  title={filterFood || '选择产品类别'}
                >
                  <option value="">全部类别</option>
                  {foodOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </label>
              <label className="dian-sc-filter-field" htmlFor={`dian-sc-f-auth${idSuffix}`}>
                <span className="dian-sc-filter-label">发证机关</span>
                <select
                  id={`dian-sc-f-auth${idSuffix}`}
                  className="dian-sc-filter-select"
                  value={filterAuthority}
                  onChange={(e) => {
                    setFilterAuthority(e.target.value)
                    setPage(1)
                  }}
                  title={filterAuthority || '选择发证机关'}
                >
                  <option value="">全部机关</option>
                  {authorityOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </label>
              <label className="dian-sc-filter-field" htmlFor={`dian-sc-f-phone${idSuffix}`}>
                <span className="dian-sc-filter-label">手机号码</span>
                <select
                  id={`dian-sc-f-phone${idSuffix}`}
                  className="dian-sc-filter-select"
                  value={filterPhone}
                  onChange={(e) => {
                    setFilterPhone(e.target.value as ScPhoneFilter)
                    setPage(1)
                  }}
                >
                  <option value="all">全部</option>
                  <option value="has">有手机</option>
                  <option value="none">无手机</option>
                </select>
              </label>
              {!isDrawer ? (
                <>
                  <label className="dian-sc-filter-field" htmlFor={`dian-sc-f-contact${idSuffix}`}>
                    <span className="dian-sc-filter-label">联系记录</span>
                    <select
                      id={`dian-sc-f-contact${idSuffix}`}
                      className="dian-sc-filter-select"
                      value={filterContact}
                      onChange={(e) => {
                        setFilterContact(e.target.value as ScContactFilter)
                        setPage(1)
                      }}
                    >
                      <option value="all">全部</option>
                      <option value="已联系">已联系</option>
                      <option value="未联系">未联系</option>
                    </select>
                  </label>
                  <label className="dian-sc-filter-field dian-sc-filter-field--full" htmlFor={`dian-sc-f-remark${idSuffix}`}>
                    <span className="dian-sc-filter-label">备注</span>
                    <select
                      id={`dian-sc-f-remark${idSuffix}`}
                      className="dian-sc-filter-select"
                      value={filterRemark}
                      onChange={(e) => {
                        setFilterRemark(e.target.value as ScRemarkFilter)
                        setPage(1)
                      }}
                    >
                      <option value="all">全部</option>
                      <option value="has">已备注</option>
                      <option value="none">未备注</option>
                    </select>
                  </label>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
