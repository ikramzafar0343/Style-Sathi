import { Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch() {}

  render() {
    if (this.state.hasError) {
      return (
        <div className="container py-5">
          <h4 className="text-danger">Something went wrong.</h4>
          <p className="text-muted">Please try again or navigate back.</p>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
