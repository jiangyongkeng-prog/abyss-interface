const outerPetals = Array.from({ length: 18 }, (_, index) => index * 20)
const middlePetals = Array.from({ length: 14 }, (_, index) => index * 25.7 + 8)
const innerPetals = Array.from({ length: 10 }, (_, index) => index * 36 + 12)

function CosmicFlower({ mousePosition }) {
    return (
        <div
            className="nebula-flower"
            style={{
                transform: `translate(${mousePosition.x * 20}px, ${mousePosition.y * 16}px)`,
            }}
        >
            <div className="nebula-flower__aura"></div>

            <svg
                className="nebula-flower__svg"
                viewBox="0 0 600 600"
                aria-hidden="true"
            >
                <defs>
                    <radialGradient id="nebulaCore" cx="35%" cy="30%" r="70%">
                        <stop offset="0%" stopColor="#ffffff" />
                        <stop offset="22%" stopColor="#e7fbff" />
                        <stop offset="52%" stopColor="#7de2ff" />
                        <stop offset="78%" stopColor="#7668ff" />
                        <stop offset="100%" stopColor="#120b36" />
                    </radialGradient>

                    <linearGradient id="outerNebulaPetal" x1="50%" y1="0%" x2="50%" y2="100%">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                        <stop offset="28%" stopColor="#b8f6ff" stopOpacity="0.82" />
                        <stop offset="58%" stopColor="#7de2ff" stopOpacity="0.42" />
                        <stop offset="86%" stopColor="#806cff" stopOpacity="0.18" />
                        <stop offset="100%" stopColor="#110b35" stopOpacity="0.02" />
                    </linearGradient>

                    <linearGradient id="middleNebulaPetal" x1="50%" y1="0%" x2="50%" y2="100%">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.88" />
                        <stop offset="36%" stopColor="#91ecff" stopOpacity="0.62" />
                        <stop offset="72%" stopColor="#9b71ff" stopOpacity="0.24" />
                        <stop offset="100%" stopColor="#110b35" stopOpacity="0.02" />
                    </linearGradient>

                    <filter id="nebulaGlow" x="-60%" y="-60%" width="220%" height="220%">
                        <feGaussianBlur stdDeviation="7" result="blur" />
                        <feColorMatrix
                            in="blur"
                            type="matrix"
                            values="
                0 0 0 0 0.48
                0 0 0 0 0.89
                0 0 0 0 1
                0 0 0 0.72 0
              "
                            result="glow"
                        />
                        <feMerge>
                            <feMergeNode in="glow" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                <circle className="nebula-flower__back" cx="300" cy="300" r="222" />
                <circle className="nebula-flower__scan nebula-flower__scan-one" cx="300" cy="300" r="232" />
                <circle className="nebula-flower__scan nebula-flower__scan-two" cx="300" cy="300" r="170" />

                <g className="nebula-flower__outer-layer" filter="url(#nebulaGlow)">
                    {outerPetals.map((angle) => (
                        <path
                            key={angle}
                            className="nebula-flower__petal nebula-flower__petal--outer"
                            d="M300 300 C246 250 238 142 300 60 C362 142 354 250 300 300Z"
                            transform={`rotate(${angle} 300 300)`}
                            fill="url(#outerNebulaPetal)"
                        />
                    ))}
                </g>

                <g className="nebula-flower__middle-layer" filter="url(#nebulaGlow)">
                    {middlePetals.map((angle) => (
                        <path
                            key={angle}
                            className="nebula-flower__petal nebula-flower__petal--middle"
                            d="M300 300 C260 258 258 176 300 106 C342 176 340 258 300 300Z"
                            transform={`rotate(${angle} 300 300)`}
                            fill="url(#middleNebulaPetal)"
                        />
                    ))}
                </g>

                <g className="nebula-flower__inner-layer">
                    {innerPetals.map((angle) => (
                        <path
                            key={angle}
                            className="nebula-flower__petal nebula-flower__petal--inner"
                            d="M300 300 C274 268 274 220 300 168 C326 220 326 268 300 300Z"
                            transform={`rotate(${angle} 300 300)`}
                            fill="rgba(230, 250, 255, 0.62)"
                        />
                    ))}
                </g>

                <circle className="nebula-flower__core" cx="300" cy="300" r="58" fill="url(#nebulaCore)" />
                <circle className="nebula-flower__core-light" cx="282" cy="276" r="20" />
                <circle className="nebula-flower__core-dot" cx="300" cy="300" r="12" />
            </svg>

            <span className="nebula-spark spark-a"></span>
            <span className="nebula-spark spark-b"></span>
            <span className="nebula-spark spark-c"></span>
            <span className="nebula-spark spark-d"></span>
        </div>
    )
}

export default CosmicFlower