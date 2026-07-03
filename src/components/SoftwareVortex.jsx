import { useEffect, useRef } from "react";

const ICONS = ["⌘", "▦", "◆", "△", "◎", "✦", "{ }", "▶", "◌", "⌁", "▣", "✕"];

function roundRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
}

export default function SoftwareVortex() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        let rafId = 0;
        let width = 0;
        let height = 0;
        let dpr = 1;

        const items = Array.from({ length: 54 }, (_, index) => ({
            icon: ICONS[index % ICONS.length],
            lane: index / 54,
            phase: Math.random() * Math.PI * 2,
            radius: 0.28 + Math.random() * 0.28,
            speed: 0.16 + Math.random() * 0.12,
            size: 34 + Math.random() * 28,
        }));

        function resize() {
            const rect = canvas.getBoundingClientRect();
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            width = rect.width;
            height = rect.height;
            canvas.width = Math.max(1, Math.floor(width * dpr));
            canvas.height = Math.max(1, Math.floor(height * dpr));
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        function draw(timeMs) {
            const time = timeMs * 0.001;
            ctx.clearRect(0, 0, width, height);

            const cx = width * 0.5;
            const cy = height * 0.5;
            const maxRadius = Math.min(width, height) * 0.38;

            const sorted = items
                .map((item) => {
                    const climb = (item.lane + time * item.speed) % 1;
                    const angle = item.phase + time * 1.15 + climb * Math.PI * 7;
                    const depth = Math.sin(angle);
                    const twistRadius = maxRadius * item.radius * (0.36 + climb * 0.92);
                    const x = cx + Math.cos(angle) * twistRadius;
                    const y = cy + (climb - 0.5) * height * 0.9 + Math.sin(angle * 0.6) * 26;
                    const scale = 0.55 + (depth + 1) * 0.32 + climb * 0.18;
                    return { ...item, x, y, scale, depth, alpha: 0.16 + (depth + 1) * 0.22 };
                })
                .sort((a, b) => a.scale - b.scale);

            const glow = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.min(width, height) * 0.42);
            glow.addColorStop(0, "rgba(133, 239, 255, 0.22)");
            glow.addColorStop(0.5, "rgba(82, 116, 255, 0.08)");
            glow.addColorStop(1, "rgba(0, 0, 0, 0)");
            ctx.fillStyle = glow;
            ctx.fillRect(0, 0, width, height);

            sorted.forEach((item) => {
                const size = item.size * item.scale;
                const x = item.x - size / 2;
                const y = item.y - size / 2;

                ctx.save();
                ctx.globalAlpha = Math.max(0, Math.min(0.82, item.alpha));
                ctx.shadowColor = "rgba(104, 231, 255, 0.55)";
                ctx.shadowBlur = 24 * item.scale;
                ctx.translate(item.x, item.y);
                ctx.rotate(item.depth * 0.2);
                ctx.translate(-item.x, -item.y);

                roundRect(ctx, x, y, size, size, size * 0.24);
                ctx.fillStyle = "rgba(218, 249, 255, 0.08)";
                ctx.fill();
                ctx.strokeStyle = "rgba(172, 245, 255, 0.34)";
                ctx.lineWidth = 1;
                ctx.stroke();

                ctx.shadowBlur = 0;
                ctx.fillStyle = "rgba(238, 253, 255, 0.82)";
                ctx.font = `800 ${Math.max(13, size * 0.34)}px Inter, Arial, sans-serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(item.icon, item.x, item.y + 1);
                ctx.restore();
            });

            ctx.save();
            ctx.globalAlpha = 0.34;
            ctx.strokeStyle = "rgba(133, 239, 255, 0.22)";
            ctx.lineWidth = 1;
            for (let i = 0; i < 4; i += 1) {
                ctx.beginPath();
                ctx.ellipse(cx, cy, maxRadius * (0.62 + i * 0.12), maxRadius * (0.18 + i * 0.05), time * 0.22 + i, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.restore();

            rafId = requestAnimationFrame(draw);
        }

        resize();
        rafId = requestAnimationFrame(draw);
        window.addEventListener("resize", resize);

        return () => {
            cancelAnimationFrame(rafId);
            window.removeEventListener("resize", resize);
        };
    }, []);

    return <canvas ref={canvasRef} className="software-vortex" aria-hidden="true" />;
}
