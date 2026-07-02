import { useEffect, useState } from 'react'

function ScrollProgress() {
    const [progress, setProgress] = useState(0)

    useEffect(() => {
        function updateProgress() {
            const scrollTop = window.scrollY
            const docHeight = document.documentElement.scrollHeight - window.innerHeight

            if (docHeight <= 0) {
                setProgress(0)
                return
            }

            const currentProgress = (scrollTop / docHeight) * 100
            setProgress(currentProgress)
        }

        updateProgress()

        window.addEventListener('scroll', updateProgress)

        return () => {
            window.removeEventListener('scroll', updateProgress)
        }
    }, [])

    return (
        <div className="scroll-progress">
            <div
                className="scroll-progress-bar"
                style={{ width: `${progress}%` }}
            ></div>
        </div>
    )
}

export default ScrollProgress