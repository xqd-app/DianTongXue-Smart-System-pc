type PlaceholderScreenProps = {
  title: string
  subtitle: string
}

export default function PlaceholderScreen({ title, subtitle }: PlaceholderScreenProps) {
  return (
    <>
      <header className="dian-topbar">
        <h1 className="dian-topbar-title">{title}</h1>
      </header>
      <div className="dian-simple-pad">
        <div className="dian-card">
          <p style={{ margin: 0, fontSize: 15, color: '#334155', lineHeight: 1.6 }}>{subtitle}</p>
          <p className="dian-simple-hint" style={{ marginTop: 20 }}>
            功能开发中，结构与首页底栏导航一致。
          </p>
        </div>
      </div>
    </>
  )
}
