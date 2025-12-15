
import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree, createPortal } from '@react-three/fiber';
import * as THREE from 'three';
import { VfxAsset, VfxEmitterConfig, VfxType } from '../types';

interface VfxRendererProps {
    vfxAsset: VfxAsset;
    isPlaying?: boolean;
    parentRef?: React.MutableRefObject<THREE.Object3D | null>;
    emitOnce?: boolean; // For burst mode testing
    onComplete?: () => void;
}

const MAX_PARTICLES = 200;

// Helper to interpolate colors
const lerpColor = (c1: THREE.Color, c2: THREE.Color, t: number) => {
    return new THREE.Color(
        c1.r + (c2.r - c1.r) * t,
        c1.g + (c2.g - c1.g) * t,
        c1.b + (c2.b - c1.b) * t
    );
};

// Helper for lerping opacity
const lerp = (start: number, end: number, t: number) => start + (end - start) * t;

const EmitterInstance: React.FC<{ 
    config: VfxEmitterConfig; 
    isPlaying: boolean; 
    type: VfxType;
    parentRef?: React.MutableRefObject<THREE.Object3D | null>;
}> = ({ config, isPlaying, type, parentRef }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const { scene } = useThree(); // Access global scene for portal
    
    // Internal tracker for parent position (if portal is used)
    const trackerRef = useRef<THREE.Group>(null);

    // Attributes for InstancedMesh
    const opacityArray = useMemo(() => new Float32Array(MAX_PARTICLES).fill(0), []);

    // Particle Data
    const particles = useRef<{
        active: boolean;
        life: number;
        maxLife: number;
        pos: THREE.Vector3;
        vel: THREE.Vector3;
        scaleStart: number;
        scaleEnd: number;
        colorStart: THREE.Color;
        colorEnd: THREE.Color;
        rotationOffset: number; // Random initial rotation
    }[]>([]);

    const timeAccumulator = useRef(0);
    const globalTime = useRef(0); // For delay logic
    const hasBursted = useRef(false);

    // Initialize Pool
    useEffect(() => {
        particles.current = Array.from({ length: MAX_PARTICLES }).map(() => ({
            active: false,
            life: 0,
            maxLife: 1,
            pos: new THREE.Vector3(),
            vel: new THREE.Vector3(),
            scaleStart: 1,
            scaleEnd: 0,
            colorStart: new THREE.Color(),
            colorEnd: new THREE.Color(),
            rotationOffset: Math.random() * Math.PI * 2
        }));
    }, []);

    // Reset burst flag and time when stopped
    useEffect(() => {
        if (!isPlaying) {
            hasBursted.current = false;
            globalTime.current = 0;
            timeAccumulator.current = 0;
        }
    }, [isPlaying]);

    // SHADER INJECTION FOR OPACITY
    const onBeforeCompile = useMemo(() => (shader: any) => {
        shader.vertexShader = `
          attribute float aOpacity;
          varying float vOpacity;
          ${shader.vertexShader}
        `.replace(
          '#include <begin_vertex>',
          `
          #include <begin_vertex>
          vOpacity = aOpacity;
          `
        );
        shader.fragmentShader = `
          varying float vOpacity;
          ${shader.fragmentShader}
        `.replace(
          '#include <dithering_fragment>',
          `
          #include <dithering_fragment>
          gl_FragColor.a *= vOpacity;
          `
        );
    }, []);

    useFrame((state, delta) => {
        if (!meshRef.current) return;
        
        if (isPlaying) {
            globalTime.current += delta;
        }

        // DELAY CHECK
        if (isPlaying && (config.delay || 0) > 0 && globalTime.current < (config.delay || 0)) {
            // Hide everything if delayed
            if (meshRef.current.count > 0) {
                dummy.scale.set(0,0,0);
                dummy.updateMatrix();
                for (let i = 0; i < MAX_PARTICLES; i++) {
                    meshRef.current.setMatrixAt(i, dummy.matrix);
                    opacityArray[i] = 0; // Hide
                }
                meshRef.current.instanceMatrix.needsUpdate = true;
                if (meshRef.current.geometry.attributes.aOpacity) {
                    meshRef.current.geometry.attributes.aOpacity.needsUpdate = true;
                }
            }
            return;
        }
        
        const c1 = new THREE.Color(config.colorStart);
        const c2 = new THREE.Color(config.colorEnd);
        
        // Determine Emitter World Position
        const emitPos = new THREE.Vector3();
        const emitQuat = new THREE.Quaternion();

        if (parentRef && parentRef.current) {
            parentRef.current.getWorldPosition(emitPos);
            parentRef.current.getWorldQuaternion(emitQuat);
        } else if (trackerRef.current) {
            trackerRef.current.getWorldPosition(emitPos);
            trackerRef.current.getWorldQuaternion(emitQuat);
        }

        // --- EMISSION LOGIC ---
        if (isPlaying && config.enabled) {
            let particlesToSpawn = 0;

            if (type === 'continuous') {
                const emitRate = config.rate > 0 ? 1 / config.rate : 0;
                timeAccumulator.current += delta;
                while (timeAccumulator.current > emitRate && particlesToSpawn < 10) {
                    timeAccumulator.current -= emitRate;
                    particlesToSpawn++;
                }
            } else if (type === 'burst') {
                if (!hasBursted.current) {
                    particlesToSpawn = config.burstCount || 10;
                    hasBursted.current = true;
                }
            }

            for (let i = 0; i < particlesToSpawn; i++) {
                // Spawn Particle
                const p = particles.current.find(p => !p.active);
                if (p) {
                    p.active = true;
                    p.life = 0;
                    p.maxLife = config.lifetime * (0.8 + Math.random() * 0.4); // Variation
                    
                    // Position: Emit Pos + Local Offset Rotated
                    const offsetVec = new THREE.Vector3(...config.offset);
                    offsetVec.applyQuaternion(emitQuat);
                    p.pos.copy(emitPos).add(offsetVec);

                    // Velocity
                    const speed = config.speed;
                    const spread = config.spread;
                    const dir = new THREE.Vector3(0, 1, 0); 
                    dir.applyQuaternion(emitQuat); 
                    
                    const randomDir = new THREE.Vector3(
                        (Math.random() - 0.5), 
                        (Math.random() - 0.5), 
                        (Math.random() - 0.5)
                    ).normalize().multiplyScalar(spread);
                    
                    dir.add(randomDir).normalize().multiplyScalar(speed);
                    p.vel.copy(dir);

                    p.scaleStart = config.sizeStart;
                    p.scaleEnd = config.sizeEnd;
                    p.colorStart.copy(c1);
                    p.colorEnd.copy(c2);
                    p.rotationOffset = Math.random() * Math.PI * 2;
                }
            }
        }

        // --- UPDATE LOGIC ---
        const turb = config.turbulence || 0;
        const rotSpeed = config.rotationSpeed || 0;
        const startOp = config.opacity ?? 1.0;
        const endOp = config.opacityEnd ?? startOp; // Default to start opacity if not set (no fade)
        
        particles.current.forEach((p, i) => {
            if (!p.active) {
                dummy.scale.set(0,0,0);
                dummy.updateMatrix();
                meshRef.current!.setMatrixAt(i, dummy.matrix);
                opacityArray[i] = 0;
                return;
            }

            p.life += delta;
            if (p.life >= p.maxLife) {
                p.active = false;
                dummy.scale.set(0,0,0);
                dummy.updateMatrix();
                meshRef.current!.setMatrixAt(i, dummy.matrix);
                opacityArray[i] = 0;
                return;
            }

            // Physics
            p.vel.y -= config.gravity * delta;
            
            if (config.followParent) {
                 p.pos.add(p.vel.clone().multiplyScalar(delta));
            } else {
                 p.pos.add(p.vel.clone().multiplyScalar(delta));
            }
            
            if (turb > 0) {
                const noiseX = Math.sin(p.life * 5 + i) * turb * delta;
                const noiseZ = Math.cos(p.life * 4 + i) * turb * delta;
                p.pos.x += noiseX;
                p.pos.z += noiseZ;
            }
            
            // Interpolation
            const t = p.life / p.maxLife;
            const currentScale = lerp(p.scaleStart, p.scaleEnd, t);
            const currentColor = lerpColor(p.colorStart, p.colorEnd, t);
            
            // Opacity Interpolation
            opacityArray[i] = lerp(startOp, endOp, t);

            dummy.position.copy(p.pos);
            dummy.scale.set(currentScale, currentScale, currentScale);
            const rot = p.rotationOffset + (p.life * rotSpeed);
            dummy.rotation.set(rot, rot, rot);
            
            dummy.updateMatrix();
            meshRef.current!.setMatrixAt(i, dummy.matrix);
            meshRef.current!.setColorAt(i, currentColor);
        });

        meshRef.current.instanceMatrix.needsUpdate = true;
        if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
        if (meshRef.current.geometry.attributes.aOpacity) {
            meshRef.current.geometry.attributes.aOpacity.needsUpdate = true;
        }
    });

    // Geometry Switcher
    let Geometry = <boxGeometry args={[1,1,1]} />;
    if (config.shape === 'sphere') Geometry = <sphereGeometry args={[0.5, 8, 8]} />;
    if (config.shape === 'plane') Geometry = <planeGeometry args={[1,1]} />;
    if (config.shape === 'tetrahedron') Geometry = <tetrahedronGeometry args={[0.5]} />;

    // Blending Mode
    const blending = config.blending === 'additive' ? THREE.AdditiveBlending : THREE.NormalBlending;

    const MeshComponent = (
        <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_PARTICLES]} renderOrder={999} frustumCulled={false}>
            {/* Clone element to inject attribute */}
            {React.cloneElement(Geometry, {}, <instancedBufferAttribute attach="attributes-aOpacity" args={[opacityArray, 1]} />)}
            
            <meshBasicMaterial 
                transparent 
                // Opacity handled by shader via aOpacity, but set base to 1 to allow multiplication
                opacity={1} 
                depthWrite={false} 
                blending={blending}
                onBeforeCompile={onBeforeCompile}
            />
        </instancedMesh>
    );

    if (config.followParent) {
        return (
            <group>
                <group ref={trackerRef} />
                {MeshComponent}
            </group>
        );
    } 

    return (
        <group>
            <group ref={trackerRef} />
            {createPortal(MeshComponent, scene)}
        </group>
    );
};

export const VfxRenderer: React.FC<VfxRendererProps> = ({ vfxAsset, isPlaying = true, parentRef }) => {
    if (!vfxAsset) return null;

    return (
        <group>
            {vfxAsset.emitters.map(emitter => (
                <EmitterInstance 
                    key={emitter.id} 
                    config={emitter} 
                    isPlaying={isPlaying} 
                    type={vfxAsset.type}
                    parentRef={parentRef} 
                />
            ))}
        </group>
    );
};
