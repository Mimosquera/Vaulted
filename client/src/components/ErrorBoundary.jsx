import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error) {
    // Log error for monitoring services
    // Sentry.captureException(error);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#0a0a0f',
          color: '#ffffff',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          padding: '20px'
        }}>
          <div style={{
            textAlign: 'center',
            maxWidth: '500px'
          }}>
            <h1 style={{ fontSize: '32px', marginBottom: '16px' }}>
              Something went wrong
            </h1>
            <p style={{ fontSize: '16px', color: '#8c8c94', marginBottom: '32px' }}>
              We encountered an unexpected error. Please try refreshing the page.
            </p>
            {process.env.NODE_ENV === 'development' && (
              <details style={{
                textAlign: 'left',
                backgroundColor: 'rgba(255, 0, 0, 0.1)',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '32px',
                border: '1px solid rgba(255, 0, 0, 0.2)',
                fontSize: '12px',
                color: '#ff6b6b',
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                <summary style={{ cursor: 'pointer', marginBottom: '8px' }}>Error details</summary>
                {this.state.error && this.state.error.toString()}
              </details>
            )}
            <button
              onClick={this.handleReset}
              style={{
                padding: '12px 24px',
                backgroundColor: '#7c3aed',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#6d28d9'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#7c3aed'}
            >
              Go Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
