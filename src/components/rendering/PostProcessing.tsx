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
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import * as THREE from 'three';

// 扩展 R3F 以支持后处理类
extend({ EffectComposer, RenderPass, UnrealBloomPass, SMAAPass, ShaderPass, OutputPass });

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
  toneMappingExposure?: number;
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
  toneMappingExposure = 1.0,
}) => {
  const { gl, scene, camera, size } = useThree();
  const composerRef = useRef<EffectComposer | null>(null);
  const bloomPassRef = useRef<UnrealBloomPass | null>(null);
  const fxaaPassRef = useRef<any | null>(null); // Use any to support SMAAPass | ShaderPass

  // 初始化 EffectComposer
  useEffect(() => {
    if (!enabled) return;
    if (size.width === 0 || size.height === 0) return;

    console.log('[PostProcessing] Initializing EffectComposer...');

    // 创建 EffectComposer
    // 关键修正：显式使用 HalfFloatType 以支持 HDR 渲染管线
    const dpr = Math.min(window.devicePixelRatio, 2);

    const renderTarget = new THREE.WebGLRenderTarget(
      size.width * dpr,
      size.height * dpr,
      {
        type: THREE.HalfFloatType,
        format: THREE.RGBAFormat,
        colorSpace: THREE.NoColorSpace, // Keep linear for HDR chain
      }
    );

    // Polyfill clone method for EffectComposer internal usage
    // EffectComposer depends on .clone() which might be missing on some RenderTarget instances
    if (typeof renderTarget.clone !== 'function') {
      renderTarget.clone = function () {
        return new THREE.WebGLRenderTarget(this.width, this.height, this.options).copy(this);
      };
    }

    const composer = new EffectComposer(gl, renderTarget);
    composer.setSize(size.width, size.height);
    composer.setPixelRatio(dpr);

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

    // 添加 OutputPass (ToneMapping + ColorSpace Conversion)
    // 必须在 AA 之前应用，确保 AA 基于最终显示的颜色（sRGB/ToneMapped）进行边缘检测
    const outputPass = new OutputPass();
    composer.addPass(outputPass);
    console.log('[PostProcessing] OutputPass added (ToneMapping enabled)');

    // SMAA (Subpixel Morphological Antialiasing)
    // 恢复 SMAA 以解决 FXAA Shader 在部分显卡上的未初始化变量警告 (X4000)，并提供更好的抗锯齿质量
    if (smaaEnabled) {
      try {
        // @ts-ignore - SMAAPass requires width/height in implementation, but types may differ
        const smaaPass = new SMAAPass(size.width * dpr, size.height * dpr);
        composer.addPass(smaaPass);
        fxaaPassRef.current = smaaPass;
        console.log('[PostProcessing] SMAAPass added (Superior Edge Detection)');
      } catch (e) {
        console.error('[PostProcessing] Failed to create SMAAPass:', e);
      }
    }

    composerRef.current = composer;
    console.log('[PostProcessing] EffectComposer initialized');

    // 清理
    return () => {
      composer.dispose();
      composerRef.current = null;
      bloomPassRef.current = null;
      fxaaPassRef.current = null;
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

  // 更新曝光度
  useEffect(() => {
    gl.toneMappingExposure = toneMappingExposure;
  }, [toneMappingExposure, gl]);

  // 响应窗口大小变化
  useEffect(() => {
    if (!composerRef.current) return;

    composerRef.current.setSize(size.width, size.height);
    composerRef.current.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // SMAAPass handles resize automatically via composer.setSize
  }, [size.width, size.height]);

  // 渲染循环
  useFrame(() => {
    if (!enabled || !composerRef.current) return;

    // 使用 EffectComposer 渲染（替代默认渲染）
    composerRef.current.render();
  }, 1); // 优先级 1，确保在其他 useFrame 之后执行

  return null;
};
