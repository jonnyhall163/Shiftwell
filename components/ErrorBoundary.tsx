import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled app error:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-bold text-white mb-3">Something went wrong</h1>
            <p className="text-gray-400 mb-6">
              We hit an unexpected error. Refreshing the page usually fixes it.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-teal-500 hover:bg-teal-400 text-gray-950 font-semibold px-5 py-3 rounded-lg transition"
            >
              Reload
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
