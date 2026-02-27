"use client";
import { useRef, useMemo, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/* ---- Particle Sphere Mesh ---- */
function Particles({ count = 8000, radius = 2.8, color = "#818cf8" }: { count?: number; radius?: number; color?: string }) {
    const meshRef = useRef<THREE.Points>(null);
    const mouseRef = useRef({ x: 0, y: 0 });
    const { viewport } = useThree();

    // Generate sphere positions
    const [positions, originalPositions, sizes] = useMemo(() => {
        const pos = new Float32Array(count * 3);
        const orig = new Float32Array(count * 3);
        const sz = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            // Fibonacci sphere distribution for even coverage
            const phi = Math.acos(1 - (2 * (i + 0.5)) / count);
            const theta = Math.PI * (1 + Math.sqrt(5)) * i;

            // Add slight random offset for organic feel
            const r = radius * (0.92 + Math.random() * 0.16);
            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.sin(phi) * Math.sin(theta);
            const z = r * Math.cos(phi);

            pos[i * 3] = x;
            pos[i * 3 + 1] = y;
            pos[i * 3 + 2] = z;

            orig[i * 3] = x;
            orig[i * 3 + 1] = y;
            orig[i * 3 + 2] = z;

            sz[i] = 0.8 + Math.random() * 1.2;
        }
        return [pos, orig, sz];
    }, [count, radius]);

    // Track mouse position
    const handlePointerMove = useCallback(
        (e: { clientX: number; clientY: number }) => {
            mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
            mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
        },
        []
    );

    // Animation loop
    useFrame(({ clock }) => {
        if (!meshRef.current) return;
        const t = clock.getElapsedTime();
        const geo = meshRef.current.geometry;
        const posAttr = geo.attributes.position as THREE.BufferAttribute;
        const arr = posAttr.array as Float32Array;

        const mx = mouseRef.current.x * viewport.width * 0.3;
        const my = mouseRef.current.y * viewport.height * 0.3;

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            const ox = originalPositions[i3];
            const oy = originalPositions[i3 + 1];
            const oz = originalPositions[i3 + 2];

            // Gentle wave distortion
            const wave = Math.sin(t * 0.6 + ox * 0.5) * 0.08 + Math.cos(t * 0.4 + oy * 0.5) * 0.08;

            // Mouse influence — push particles near cursor
            const dx = ox - mx;
            const dy = oy - my;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const influence = Math.max(0, 1 - dist / 2.5);
            const pushX = dx * influence * 0.25;
            const pushY = dy * influence * 0.25;

            arr[i3] = ox + wave + pushX;
            arr[i3 + 1] = oy + wave + pushY;
            arr[i3 + 2] = oz + wave * 0.5;
        }
        posAttr.needsUpdate = true;

        // Slow rotation
        meshRef.current.rotation.y = t * 0.08;
        meshRef.current.rotation.x = Math.sin(t * 0.05) * 0.1;
    });

    // Listen for mouse events globally
    useFrame(() => { });  // keep alive
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useMemo(() => {
        if (typeof window === "undefined") return;
        const handler = (e: MouseEvent) => {
            mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
            mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
        };
        window.addEventListener("mousemove", handler);
        return () => window.removeEventListener("mousemove", handler);
    }, []);

    return (
        <points ref={meshRef}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    args={[positions, 3]}
                    count={count}
                />
                <bufferAttribute
                    attach="attributes-size"
                    args={[sizes, 1]}
                    count={count}
                />
            </bufferGeometry>
            <pointsMaterial
                color={color}
                size={0.028}
                sizeAttenuation
                transparent
                opacity={0.45}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
            />
        </points>
    );
}

/* ---- Wrapper Component ---- */
export default function ParticleSphere({
    className = "",
    count,
    radius,
    color,
}: {
    className?: string;
    count?: number;
    radius?: number;
    color?: string;
}) {
    return (
        <div className={`${className}`}>
            <Canvas
                camera={{ position: [0, 0, 6], fov: 50 }}
                dpr={[1, 1.5]}
                gl={{ alpha: true, antialias: false }}
                style={{ background: "transparent" }}
            >
                <Particles count={count} radius={radius} color={color} />
            </Canvas>
        </div>
    );
}
