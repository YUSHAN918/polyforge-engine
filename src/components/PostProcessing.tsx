/**
 * PolyForge v1.3.0 - PostProcessing
 * Phase 12: 电影级后处理管线
 * 
 * 功能：
 * - EffectComposer 管线集成
 * - UnrealBloomPass（电影级辉光）
 * - SMAAPass（边缘抗锯齿）
 * - 自发光强度联动
 */

import React, { useEffect, useRef } from 'react';
import { useThree, useFrame, extend } from '@react-three/fiber';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import * as THREE from 'three';

// 扩展 R3F 以支持后处理类
extend({ EffectComposer, RenderPass, UnrealBloomPass, SMAAPass });

/**
 * PostProcessing Props
 */
interface PostProcessingProps {
  enabled?: boolean;
  bloomEnabled?: boolean;
  bloomStrength?: number;
  bloomRadius?: number;
  bloomThreshold?: number;
  smaaEnabled?: boolean;
}

/**
 * PostProcessing - 后处理管线组件
 */
export const PostProcessing: React.FC<PostProcessingProps> = ({
  enabled = true,
  bloomEnabled = true,
  bloomStrength = 1.5,
  bloomRadius = 0.4,
  bloomThreshold = 0.85,
  smaaEnabled = true,
}) => {
  const { gl, scene, camera, size } = useThree();
  const composerRef = useRef<EffectComposer | null>(null);
  const bloomPassRef = useRef<UnrealBloomPass | null>(null);
  const smaaPassRef = useRef<SMAAPass | null>(null);

  // 初始化 EffectComposer
  useEffect(() => {
    if (!enabled) return;

    console.log('[PostProcessing] Initializing EffectComposer...');

    // 创建 EffectComposer
    const composer = new EffectComposer(gl);
    composer.setSize(size.width, size.height);
    composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 添加 RenderPass（基础渲染）
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    // 添加 UnrealBloomPass（辉光）
    if (bloomEnabled) {
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(size.width, size.height),
        bloomStrength,
        bloomRadius,
        bloomThreshold
      );
      composer.addPass(bloomPass);
      bloomPassRef.current = bloomPass;
      console.log('[PostProcessing] UnrealBloomPass added');
    }

    // 添加 SMAAPass（抗锯齿）
    if (smaaEnabled) {
      const smaaPass = new SMAAPass();
      composer.addPass(smaaPass);
      smaaPassRef.current = smaaPass;
      console.log('[PostProcessing] SMAAPass added');
    }

    composerRef.current = composer;
    console.log('[PostProcessing] EffectComposer initialized');

    // 清理
    return () => {
      composer.dispose();
      composerRef.current = null;
      bloomPassRef.current = null;
      smaaPassRef.current = null;
      console.log('[PostProcessing] EffectComposer disposed');
    };
  }, [enabled, gl, scene, camera, size.width, size.height, bloomEnabled, smaaEnabled]);

  // 更新 Bloom 参数
  useEffect(() => {
    if (!bloomPassRef.current) return;

    bloomPassRef.current.strength = bloomStrength;
    bloomPassRef.current.radius = bloomRadius;
    bloomPassRef.current.threshold = bloomThreshold;
  }, [bloomStrength, bloomRadius, bloomThreshold]);

  // 响应窗口大小变化
  useEffect(() => {
    if (!composerRef.current) return;

    composerRef.current.setSize(size.width, size.height);
    composerRef.current.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }, [size.width, size.height]);

  // 渲染循环
  useFrame(() => {
    if (!enabled || !composerRef.current) return;

    // 使用 EffectComposer 渲染（替代默认渲染）
    composerRef.current.render();
  }, 1); // 优先级 1，确保在其他 useFrame 之后执行

  return null;
};

