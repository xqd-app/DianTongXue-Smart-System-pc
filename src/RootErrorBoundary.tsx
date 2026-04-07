import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { error: Error | null }

export class RootErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(error, info.componentStack)
  }

  render(): ReactNode {
    if (this.state.error) {
      const e = this.state.error
      return (
        <div
          style={{
            margin: 0,
            minHeight: '100dvh',
            padding: '20px 16px',
            boxSizing: 'border-box',
            fontFamily: 'system-ui, PingFang SC, sans-serif',
            background: '#fff',
            color: '#0f172a',
          }}
        >
          <h1 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 12px' }}>页面加载出错</h1>
          <p style={{ margin: '0 0 8px', fontSize: '0.875rem', color: '#64748b' }}>
            若控制台或下方有报错，请截图发给开发人员。常见原因：静态资源 404（JS 被当成 HTML 返回）、缓存了旧版文件。
          </p>
          <pre
            style={{
              margin: 0,
              padding: 12,
              borderRadius: 8,
              background: '#fff',
              border: '1px solid #e2e8f0',
              fontSize: '0.75rem',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {e.message}
            {e.stack ? `\n\n${e.stack}` : ''}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}
