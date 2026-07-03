import { Component } from 'react'

class ModelErrorBoundary extends Component {
    constructor(props) {
        super(props)

        this.state = {
            hasError: false,
        }
    }

    static getDerivedStateFromError() {
        return {
            hasError: true,
        }
    }

    componentDidCatch(error) {
        console.error('3D model load failed:', error)
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback
        }

        return this.props.children
    }
}

export default ModelErrorBoundary