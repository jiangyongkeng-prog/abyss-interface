import { useEffect, useRef } from "react";

const TEXT = "COSMOS";
const PARTICLE_COUNT = 520;

function easeOutCubic(value) {
  return 1 - Math.pow(1 - value, 3);
}

export default function LogoParticleIntro({ isLeaving }) {
  const canvasRef = useRef(null);
  const exitStartRef = useRef(null);

  useEffect(() => {
    if (isLeaving && !exitStartRef.current) {
      exitStartRef.current = performance.now();
    }
  }, [isLeaving]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    const offscreen = document.createElement("canvas");
    const offscreenContext = offscreen.getContext("2d", { willReadFrequently: true });
    let particles = [];
    let frameId = 0;
    let startTime = performance.now();

    function resize() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25);

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      offscreen.width = width;
      offscreen.height = height;
      offscreenContext.clearRect(0, 0, width, height);
      offscreenContext.fillStyle = "#ffffff";
      offscreenContext.textAlign = "center";
      offscreenContext.textBaseline = "middle";
      offscreenContext.font = `900 ${Math.min(width * 0.16, 178)}px Inter, Arial, sans-serif`;
      offscreenContext.fillText(TEXT, width / 2, height / 2);

      const imageData = offscreenContext.getImageData(0, 0, width, height).data;
      const targets = [];
      const gap = Math.max(8, Math.floor(width / 145));

      for (let y = 0; y < height; y += gap) {
        for (let x = 0; x < width; x += gap) {
          const alpha = imageData[(y * width + x) * 4 + 3];
          if (alpha > 120) targets.push({ x, y });
        }
      }

      particles = Array.from({ length: PARTICLE_COUNT }, (_, index) => {
        const target = targets[Math.floor((index / PARTICLE_COUNT) * targets.length)] || {
          x: width / 2,
          y: height / 2
        };
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.max(width, height) * (0.34 + Math.random() * 0.54);

        const dx = target.x - width / 2;
        const dy = target.y - height / 2;
        const distance = Math.max(1, Math.hypot(dx, dy));
        const exitDistance = Math.max(width, height) * (0.34 + Math.random() * 0.34);

        return {
          sx: width / 2 + Math.cos(angle) * radius,
          sy: height / 2 + Math.sin(angle) * radius,
          tx: target.x + (Math.random() - 0.5) * 2,
          ty: target.y + (Math.random() - 0.5) * 2,
          ex: target.x + (dx / distance) * exitDistance + (Math.random() - 0.5) * 160,
          ey: target.y + (dy / distance) * exitDistance + (Math.random() - 0.5) * 160,
          size: 0.8 + Math.random() * 1.4,
          delay: Math.random() * 420,
          phase: Math.random() * Math.PI * 2
        };
      });

      startTime = performance.now();
    }

    function draw(now) {
      const width = window.innerWidth;
      const height = window.innerHeight;

      context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = "source-over";
      context.shadowBlur = 0;

      particles.forEach((particle) => {
        const raw = Math.min(1, Math.max(0, (now - startTime - particle.delay) / 1650));
        const progress = easeOutCubic(raw);
        const orbit = Math.sin(now * 0.0012 + particle.phase) * (1 - progress) * 32;
        let x = particle.sx + (particle.tx - particle.sx) * progress + orbit;
        let y = particle.sy + (particle.ty - particle.sy) * progress;
        let alpha = 0.14 + progress * 0.82;

        if (exitStartRef.current) {
          const exitRaw = Math.min(1, Math.max(0, (now - exitStartRef.current) / 860));
          const exitProgress = easeOutCubic(exitRaw);
          x += (particle.ex - x) * exitProgress;
          y += (particle.ey - y) * exitProgress;
          alpha *= 1 - exitProgress * 0.92;
        }

        context.fillStyle = `rgba(150, 244, 255, ${alpha})`;
        context.beginPath();
        context.arc(x, y, particle.size, 0, Math.PI * 2);
        context.fill();
      });

      context.globalCompositeOperation = "lighter";
      const glowAlpha = exitStartRef.current
        ? Math.max(0, 0.07 * (1 - (now - exitStartRef.current) / 860))
        : 0.07;
      context.fillStyle = `rgba(133, 239, 255, ${glowAlpha})`;
      context.beginPath();
      context.arc(width / 2, height / 2, Math.min(width, height) * 0.24, 0, Math.PI * 2);
      context.fill();

      context.globalCompositeOperation = "source-over";
      frameId = requestAnimationFrame(draw);
    }

    resize();
    frameId = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(frameId);
    };
  }, []);

  return <canvas className="logo-particle-intro" ref={canvasRef} aria-hidden="true" />;
}
