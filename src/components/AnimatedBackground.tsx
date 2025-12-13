'use client';

import { useEffect, useRef } from 'react';

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    color: string;
}

export default function AnimatedBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size
        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Green color palette
        const greenColors = [
            'rgba(34, 197, 94, 0.6)',   // soft green
            'rgba(74, 222, 128, 0.5)',  // light green
            'rgba(22, 163, 74, 0.7)',   // dark green
            'rgba(134, 239, 172, 0.4)', // glow green
            'rgba(187, 247, 208, 0.5)', // very light green
            'rgba(21, 128, 61, 0.6)',   // forest green
        ];

        // Create particles
        const particleCount = 80;
        const particles: Particle[] = [];

        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                radius: Math.random() * 3 + 1,
                color: greenColors[Math.floor(Math.random() * greenColors.length)],
            });
        }

        // Gradient animation parameters
        let gradientOffset = 0;

        // Animation loop
        function animate() {
            if (!ctx || !canvas) return;

            // Create animated gradient background
            gradientOffset += 0.002;
            const gradient = ctx.createLinearGradient(
                0,
                0,
                canvas.width * Math.cos(gradientOffset),
                canvas.height * Math.sin(gradientOffset)
            );

            // Animate gradient colors
            const hue1 = 120 + Math.sin(gradientOffset * 2) * 30; // Green hue range
            const hue2 = 140 + Math.cos(gradientOffset * 1.5) * 25;
            const hue3 = 100 + Math.sin(gradientOffset * 3) * 20;

            gradient.addColorStop(0, `hsla(${hue1}, 60%, 85%, 0.95)`);
            gradient.addColorStop(0.5, `hsla(${hue2}, 50%, 90%, 0.93)`);
            gradient.addColorStop(1, `hsla(${hue3}, 65%, 88%, 0.95)`);

            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw and update particles
            particles.forEach((particle) => {
                // Draw particle
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
                ctx.fillStyle = particle.color;
                ctx.fill();

                // Add glow effect
                ctx.shadowBlur = 10;
                ctx.shadowColor = particle.color;
                ctx.fill();
                ctx.shadowBlur = 0;

                // Update position
                particle.x += particle.vx;
                particle.y += particle.vy;

                // Wrap around edges
                if (particle.x < 0) particle.x = canvas.width;
                if (particle.x > canvas.width) particle.x = 0;
                if (particle.y < 0) particle.y = canvas.height;
                if (particle.y > canvas.height) particle.y = 0;
            });

            // Draw connections between nearby particles
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < 120) {
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(34, 197, 94, ${0.15 * (1 - distance / 120)})`;
                        ctx.lineWidth = 0.5;
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }

            requestAnimationFrame(animate);
        }

        animate();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed top-0 left-0 w-full h-full"
            style={{
                zIndex: -1,
                pointerEvents: 'none',
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh'
            }}
        />
    );
}
