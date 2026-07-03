import { useEffect, useRef } from "react";

function resizeCanvas(canvas, ctx) {
  const dpr = Math.min(window.devicePixelRatio || 1, 1.8);
  const width = Math.floor(window.innerWidth * dpr);
  const height = Math.floor(window.innerHeight * dpr);
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { dpr, width: window.innerWidth, height: window.innerHeight };
}

export default function CosmicMotionBackground({ progress = 0, mx = 0, my = 0 }) {
  const canvasRef = useRef(null);
  const motionRef = useRef({ progress, mx, my });

  useEffect(() => {
    motionRef.current = { progress, mx, my };
  }, [progress, mx, my]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let frame = 0;
    let size = resizeCanvas(canvas, ctx);

    const particles = Array.from({ length: 190 }, (_, index) => ({
      angle: Math.random() * Math.PI * 2,
      radius: 0.08 + Math.random() * 0.82,
      speed: 0.045 + Math.random() * 0.19,
      phase: Math.random() * Math.PI * 2,
      size: 0.8 + Math.random() * 2.2,
      lane: index % 5
    }));

    const orbits = Array.from({ length: 10 }, (_, index) => ({
      radius: 0.12 + index * 0.062,
      tilt: 0.26 + index * 0.045,
      speed: 0.02 + index * 0.004,
      phase: index * 0.8
    }));

    function onResize() {
      size = resizeCanvas(canvas, ctx);
    }

    function draw(time) {
      const t = time * 0.001;
      const { width, height } = size;
      const { progress: p, mx: px, my: py } = motionRef.current;
      const cx = width * (0.54 + px * 0.03);
      const cy = height * (0.46 + py * 0.035);
      const base = Math.min(width, height);

      ctx.clearRect(0, 0, width, height);

      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, base * (0.54 + p * 0.18));
      glow.addColorStop(0, `rgba(104, 244, 255, ${0.07 + p * 0.04})`);
      glow.addColorStop(0.34, "rgba(36, 116, 190, 0.035)");
      glow.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.sin(t * 0.08) * 0.06);

      for (let petal = 0; petal < 18; petal += 1) {
        const angle = (petal / 18) * Math.PI * 2 + t * 0.035;
        const inner = base * (0.045 + p * 0.025);
        const outer = base * (0.18 + Math.sin(t * 0.5 + petal) * 0.018 + p * 0.08);
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner * 0.42);
        ctx.quadraticCurveTo(
          Math.cos(angle + 0.22) * outer,
          Math.sin(angle + 0.22) * outer * 0.35,
          Math.cos(angle + 0.48) * inner,
          Math.sin(angle + 0.48) * inner * 0.42
        );
        ctx.strokeStyle = `rgba(120, 255, 241, ${0.035 + p * 0.025})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      for (const orbit of orbits) {
        const r = base * orbit.radius * (1 + p * 0.34);
        ctx.beginPath();
        for (let i = 0; i <= 220; i += 1) {
          const a = (i / 220) * Math.PI * 2 + t * orbit.speed + orbit.phase;
          const wave = Math.sin(a * 3 + t * 0.7) * base * 0.012;
          const x = Math.cos(a) * (r + wave);
          const y = Math.sin(a) * (r * orbit.tilt + wave * 0.35);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(${orbit.phase % 2 ? "94, 180, 255" : "118, 255, 241"}, ${0.055 + p * 0.035})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      for (const particle of particles) {
        const a = particle.angle + t * particle.speed + Math.sin(t * 0.13 + particle.phase) * 0.2;
        const r = base * particle.radius * (0.18 + particle.lane * 0.05 + p * 0.22);
        const x = Math.cos(a) * r + Math.sin(t * 0.18 + particle.phase) * 16;
        const y = Math.sin(a) * r * (0.34 + particle.lane * 0.045) + Math.cos(t * 0.16 + particle.phase) * 10;
        const pulse = 0.35 + Math.sin(t * 1.6 + particle.phase) * 0.28;
        ctx.beginPath();
        ctx.arc(x, y, particle.size * (0.7 + pulse), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220, 252, 255, ${0.06 + pulse * 0.16})`;
        ctx.shadowColor = "rgba(120, 255, 241, 0.35)";
        ctx.shadowBlur = 12;
        ctx.fill();
      }

      ctx.restore();

      const sweepY = height * (0.26 + Math.sin(t * 0.09) * 0.04);
      const beam = ctx.createLinearGradient(0, sweepY - 80, width, sweepY + 80);
      beam.addColorStop(0, "rgba(0,0,0,0)");
      beam.addColorStop(0.45, "rgba(120,255,241,0.035)");
      beam.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = beam;
      ctx.fillRect(0, 0, width, height);

      frame = requestAnimationFrame(draw);
    }

    window.addEventListener("resize", onResize);
    frame = requestAnimationFrame(draw);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(frame);
    };
  }, []);

  return <canvas ref={canvasRef} className="cosmic-motion-bg" aria-hidden="true" />;
}
