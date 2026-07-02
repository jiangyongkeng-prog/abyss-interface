const particles = [
    { left: '8%', top: '18%', size: 3, delay: '0s', duration: '18s', opacity: 0.35 },
    { left: '16%', top: '72%', size: 2, delay: '1.5s', duration: '22s', opacity: 0.28 },
    { left: '28%', top: '38%', size: 4, delay: '0.8s', duration: '20s', opacity: 0.42 },
    { left: '40%', top: '82%', size: 2, delay: '2.2s', duration: '24s', opacity: 0.32 },
    { left: '52%', top: '26%', size: 3, delay: '1s', duration: '19s', opacity: 0.4 },
    { left: '61%', top: '62%', size: 2, delay: '3s', duration: '23s', opacity: 0.26 },
    { left: '72%', top: '14%', size: 4, delay: '1.8s', duration: '21s', opacity: 0.36 },
    { left: '84%', top: '48%', size: 3, delay: '0.4s', duration: '17s', opacity: 0.34 },
    { left: '92%', top: '76%', size: 2, delay: '2.8s', duration: '25s', opacity: 0.24 },
    { left: '35%', top: '12%', size: 2, delay: '3.5s', duration: '20s', opacity: 0.3 },
    { left: '68%', top: '88%', size: 3, delay: '4.2s', duration: '26s', opacity: 0.25 },
    { left: '5%', top: '52%', size: 2, delay: '2.6s', duration: '22s', opacity: 0.32 },
]

function SpaceParticles() {
    return (
        <div className="space-particles" aria-hidden="true">
            {particles.map((particle, index) => (
                <span
                    className="space-particle"
                    key={index}
                    style={{
                        left: particle.left,
                        top: particle.top,
                        width: `${particle.size}px`,
                        height: `${particle.size}px`,
                        opacity: particle.opacity,
                        animationDelay: particle.delay,
                        animationDuration: particle.duration,
                    }}
                />
            ))}
        </div>
    )
}

export default SpaceParticles