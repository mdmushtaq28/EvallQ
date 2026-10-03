import React, { useEffect, useRef } from 'react';

interface NeuralConstellationProps {
  className?: string;
  particleCount?: number;
  interactive?: boolean;
}

interface Point3D {
  x: number;
  y: number;
  z: number;
  baseRadius: number;
  color: string;
  pulsePhase: number;
  pulseSpeed: number;
  connections: number[];
}

export const NeuralConstellation: React.FC<NeuralConstellationProps> = ({
  className = '',
  particleCount = 65,
  interactive = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef<{ x: number; y: number; targetX: number; targetY: number }>({
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 500);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 420);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener('resize', handleResize);

    // Generate 3D sphere points (neural network distribution)
    const points: Point3D[] = [];
    const radius = Math.min(width, height) * 0.42;

    const colors = [
      '#8052FF', // Violet primary
      '#8052FF',
      '#9A75FF', // Violet light
      '#FFFFFF', // Pure white core
      '#FFB829', // Gold accent synapse
      '#15846E', // Green subtle synapse
    ];

    for (let i = 0; i < particleCount; i++) {
      // Golden spiral distribution on sphere
      const phi = Math.acos(1 - (2 * (i + 0.5)) / particleCount);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;

      // Jitter radius for natural organic neural cloud appearance
      const r = radius * (0.65 + Math.random() * 0.45);

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      points.push({
        x,
        y,
        z,
        baseRadius: Math.random() * 1.8 + 1.2,
        color: colors[Math.floor(Math.random() * colors.length)],
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.02 + Math.random() * 0.03,
        connections: [],
      });
    }

    // Connect nearby nodes
    const maxConnectionDistance = radius * 0.58;
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const dx = points[i].x - points[j].x;
        const dy = points[i].y - points[j].y;
        const dz = points[i].z - points[j].z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < maxConnectionDistance) {
          points[i].connections.push(j);
        }
      }
    }

    // Rotation angles
    let angleX = 0;
    let angleY = 0;
    const baseSpeed = 0.0035;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Smooth mouse follow
      if (interactive) {
        mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
        mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;
      }

      angleY += baseSpeed + mouseRef.current.x * 0.00008;
      angleX = Math.sin(angleY * 0.5) * 0.2 + mouseRef.current.y * 0.0003;

      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);
      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);

      const fov = 420;
      const centerX = width / 2;
      const centerY = height / 2;

      // Transform all points to 2D screen coordinates with perspective
      interface ProjectedPoint {
        x2d: number;
        y2d: number;
        scale: number;
        zRot: number;
        orig: Point3D;
      }

      const projected: ProjectedPoint[] = [];

      for (let i = 0; i < points.length; i++) {
        const p = points[i];

        // Rotate around Y axis
        const x1 = p.x * cosY - p.z * sinY;
        const z1 = p.z * cosY + p.x * sinY;

        // Rotate around X axis
        const y2 = p.y * cosX - z1 * sinX;
        const z2 = z1 * cosX + p.y * sinX;

        // Perspective scale factor
        const scale = fov / (fov + z2 + radius * 0.2);
        const x2d = centerX + x1 * scale;
        const y2d = centerY + y2 * scale;

        p.pulsePhase += p.pulseSpeed;

        projected.push({
          x2d,
          y2d,
          scale,
          zRot: z2,
          orig: p,
        });
      }

      // Draw connecting neural synapse lines
      ctx.lineWidth = 1;
      for (let i = 0; i < projected.length; i++) {
        const p1 = projected[i];
        for (const targetIdx of p1.orig.connections) {
          const p2 = projected[targetIdx];
          const dist3D = Math.hypot(
            p1.orig.x - p2.orig.x,
            p1.orig.y - p2.orig.y,
            p1.orig.z - p2.orig.z
          );

          if (dist3D < maxConnectionDistance) {
            // Opacity based on depth and distance
            const distanceAlpha = 1 - dist3D / maxConnectionDistance;
            const depthFactor = Math.max(0.08, (p1.scale + p2.scale) * 0.45);
            const alpha = distanceAlpha * depthFactor * 0.4;

            ctx.strokeStyle = `rgba(128, 82, 255, ${alpha.toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(p1.x2d, p1.y2d);
            ctx.lineTo(p2.x2d, p2.y2d);
            ctx.stroke();
          }
        }
      }

      // Sort points back-to-front so closer particles render on top
      projected.sort((a, b) => b.zRot - a.zRot);

      // Draw nodes (synapses)
      for (let i = 0; i < projected.length; i++) {
        const { x2d, y2d, scale, orig } = projected[i];
        const pulse = 1 + 0.25 * Math.sin(orig.pulsePhase);
        const currentRadius = Math.max(0.8, orig.baseRadius * scale * pulse);

        // Core particle
        ctx.fillStyle = orig.color;
        ctx.beginPath();
        ctx.arc(x2d, y2d, currentRadius, 0, Math.PI * 2);
        ctx.fill();

        // Subtle glow halo for selected synapse points
        if (orig.color === '#8052FF' || orig.color === '#FFB829' || orig.color === '#FFFFFF') {
          const glowRadius = currentRadius * 3.2;
          const gradient = ctx.createRadialGradient(
            x2d,
            y2d,
            0,
            x2d,
            y2d,
            glowRadius
          );
          gradient.addColorStop(0, orig.color === '#FFB829' ? 'rgba(255, 184, 41, 0.4)' : 'rgba(128, 82, 255, 0.35)');
          gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(x2d, y2d, glowRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.targetX = e.clientX - rect.left - width / 2;
      mouseRef.current.targetY = e.clientY - rect.top - height / 2;
    };

    const handleMouseLeave = () => {
      mouseRef.current.targetX = 0;
      mouseRef.current.targetY = 0;
    };

    if (interactive) {
      canvas.addEventListener('mousemove', handleMouseMove);
      canvas.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (interactive) {
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [particleCount, interactive]);

  return (
    <div className={`relative overflow-hidden w-full h-full flex items-center justify-center bg-black ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-grab active:cursor-grabbing"
      />
    </div>
  );
};
