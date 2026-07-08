import { useEffect, useRef } from "react";

const PARTICLE_COUNT = 125;
const STREAM_COUNT = 12;
const VORTEX_STRANDS = 7;

export default function DeepSeaMotion() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let frame = 0;
    let streams = [];
    let particles = [];
    let vortex = [];

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const width = rect.width;
      const height = rect.height;

      streams = Array.from({ length: STREAM_COUNT }, (_, index) => ({
        radius: Math.min(width, height) * (0.2 + index * 0.026),
        speed: 0.00012 + Math.random() * 0.00018,
        phase: Math.random() * Math.PI * 2,
        alpha: 0.018 + Math.random() * 0.045
      }));

      particles = Array.from({ length: PARTICLE_COUNT }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 0.35 + Math.random() * 1.7,
        speed: 0.035 + Math.random() * 0.16,
        drift: -0.08 + Math.random() * 0.16,
        alpha: 0.08 + Math.random() * 0.36,
        phase: Math.random() * Math.PI * 2
      }));

      vortex = Array.from({ length: VORTEX_STRANDS }, (_, index) => ({
        phase: (index / VORTEX_STRANDS) * Math.PI * 2,
        speed: 0.00036 + Math.random() * 0.00014,
        alpha: 0.035 + Math.random() * 0.05,
        width: 0.45 + Math.random() * 0.65,
        offset: -0.08 + Math.random() * 0.16
      }));
    }

    function drawUnderwaterVortex(now, width, height) {
      const centerX = width * 0.61;
      const topY = height * 0.23;
      const funnelHeight = height * 0.58;
      const maxRadius = Math.min(width, height) * 0.15;

      ctx.save();
      ctx.translate(centerX, topY);
      ctx.globalCompositeOperation = "screen";
      ctx.shadowColor = "rgba(92, 244, 255, 0.22)";
      ctx.shadowBlur = 16;

      const core = ctx.createRadialGradient(0, funnelHeight * 0.42, 0, 0, funnelHeight * 0.42, maxRadius * 1.25);
      core.addColorStop(0, "rgba(107, 242, 255, 0.04)");
      core.addColorStop(0.46, "rgba(55, 156, 184, 0.026)");
      core.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.ellipse(0, funnelHeight * 0.43, maxRadius * 1.15, funnelHeight * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();

      vortex.forEach((strand) => {
        for (let segment = 0; segment < 7; segment += 1) {
          const segmentStart = segment / 7 + Math.sin(now * 0.00006 + strand.phase + segment) * 0.018;
          const segmentEnd = Math.min(1, segmentStart + 0.115);

          ctx.beginPath();
          ctx.lineWidth = strand.width;
          ctx.strokeStyle = `rgba(142, 255, 246, ${strand.alpha * (1 - segmentStart * 0.36)})`;

          for (let i = 0; i <= 18; i += 1) {
            const p = segmentStart + (segmentEnd - segmentStart) * (i / 18);
            const taper = Math.pow(1 - p, 0.78);
            const radius = maxRadius * (0.1 + taper * 0.9);
            const twist = p * Math.PI * 6.6 + now * strand.speed + strand.phase;
            const sway = Math.sin(now * 0.00022 + p * 6 + strand.phase) * width * 0.014;
            const noise = Math.sin(p * 21 + strand.phase) * maxRadius * 0.035;
            const x = Math.cos(twist) * (radius + noise) + sway + strand.offset * width * 0.035;
            const y = p * funnelHeight;

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }

          ctx.stroke();
        }
      });

      for (let i = 0; i < 34; i += 1) {
        const p = (i / 34 + (now * 0.00003)) % 1;
        const phase = i * 2.399 + now * 0.00055;
        const taper = Math.pow(1 - p, 0.72);
        const radius = maxRadius * (0.1 + taper * 0.88);
        const x = Math.cos(phase + p * Math.PI * 7) * radius;
        const y = p * funnelHeight;
        const size = 0.35 + taper * 1.35;
        const alpha = 0.045 + taper * 0.16;

        ctx.fillStyle = `rgba(188, 255, 248, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    function draw(now) {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      frame = requestAnimationFrame(draw);

      ctx.clearRect(0, 0, width, height);

      const glow = ctx.createRadialGradient(width * 0.5, height * 0.26, 0, width * 0.5, height * 0.42, width * 0.58);
      glow.addColorStop(0, "rgba(94, 236, 255, 0.11)");
      glow.addColorStop(0.42, "rgba(12, 94, 116, 0.045)");
      glow.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      ctx.globalCompositeOperation = "screen";

      for (let i = 0; i < 4; i += 1) {
        const x = width * (0.26 + i * 0.15) + Math.sin(now * 0.00018 + i) * 14;
        const gradient = ctx.createLinearGradient(x, 0, x + width * 0.06, height);
        gradient.addColorStop(0, "rgba(168, 255, 247, 0.095)");
        gradient.addColorStop(0.55, "rgba(71, 218, 237, 0.024)");
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(x - width * 0.08, 0);
        ctx.lineTo(x + width * 0.035, 0);
        ctx.lineTo(x + width * 0.13, height);
        ctx.lineTo(x - width * 0.12, height);
        ctx.closePath();
        ctx.fill();
      }

      ctx.save();
      ctx.translate(width * 0.5, height * 0.38);
      streams.forEach((stream) => {
        ctx.strokeStyle = `rgba(92, 244, 255, ${stream.alpha})`;
        ctx.lineWidth = 0.65;
        ctx.shadowColor = "rgba(104, 238, 255, 0.22)";
        ctx.shadowBlur = 10;
        ctx.beginPath();
        const start = stream.phase + Math.sin(now * 0.00011 + stream.phase) * 0.28;
        const end = start + Math.PI * (1.08 + Math.sin(stream.phase) * 0.18);
        for (let angle = start; angle < end; angle += 0.055) {
          const wobble = Math.sin(angle * 2.5 + now * stream.speed + stream.phase) * 9;
          const x = Math.cos(angle + now * stream.speed) * (stream.radius + wobble);
          const y = Math.sin(angle + now * stream.speed) * (stream.radius * 0.34 + wobble * 0.22);
          if (angle === start) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      });
      ctx.shadowBlur = 0;
      ctx.restore();

      drawUnderwaterVortex(now, width, height);

      particles.forEach((particle) => {
        particle.y -= particle.speed;
        particle.x += particle.drift + Math.sin(now * 0.001 + particle.phase) * 0.12;

        if (particle.y < -12) {
          particle.y = height + 12;
          particle.x = Math.random() * width;
        }

        const pulse = 0.7 + Math.sin(now * 0.0014 + particle.phase) * 0.28;
        ctx.fillStyle = `rgba(166, 255, 247, ${particle.alpha})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * pulse, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.globalCompositeOperation = "source-over";
    }

    resize();
    frame = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(frame);
    };
  }, []);

  return <canvas className="deep-sea-motion" ref={canvasRef} aria-hidden="true" />;
}
