/**
 * PolyForge v1.3.0 - ArchitectureValidationPanel
 * 架构验证观测窗口 - Project Orbital Command UI
 * 
 * "Guard Rail Compliance": strict dispatch(command) only.
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ValidationContext } from '../../core/ArchitectureValidationManager';
import { IArchitectureFacade } from '../../core/IArchitectureFacade'; // Use Interface
import { EngineCommandType } from '../../core/EngineCommand';
import { TerrainComponent } from '../../core/components/TerrainComponent';
import { CameraMode, CameraComponent } from '../../core/components/CameraComponent';
import { VisualComponent } from '../../core/components/VisualComponent';
import { PlacementComponent } from '../../core/components/PlacementComponent';
import { Entity } from '../../core/Entity';
import { TransformComponent } from '../../core/components/TransformComponent';
import * as THREE from 'three';
import { FileSystemService } from '../../core/assets/FileSystemService';
import { eventBus } from '../../core/EventBus';
import { BundleProgress } from '../../core/bundling/types';
import { ModelExportService } from '../../core/export/ModelExportService';
import { AssetMetadata } from '../../core/assets/types';

interface ArchitectureValidationPanelProps {
  manager: IArchitectureFacade | null; // Strict typing
  onBloomStrengthChange?: (value: number) => void;
  onBloomThresholdChange?: (value: number) => void;
  onGrassScaleChange?: (value: number) => void;
  onWindStrengthChange?: (value: number) => void;
  onGrassColorChange?: (color: string) => void;
}

type TabType = 'world' | 'director' | 'assets' | 'experience' | 'stats';

/**
 * 实体详情段落 - 独立组件化以防止外部 stats 更新导致失焦 (如图片模式选择下拉框)
 */
interface EntityDetailsSectionProps {
  selectedEntity: string | null;
  manager: IArchitectureFacade;
  dispatch: (type: any, payload: any) => void;
  revision: number;
}

const EntityDetailsSection = React.memo(({ selectedEntity, manager, dispatch, revision }: EntityDetailsSectionProps) => {
  if (!selectedEntity) return null;
  const entity = manager.getEntityManager().getEntity(selectedEntity);
  if (!entity) return null;

  const visual = entity.getComponent('Visual') as any;
  const placement = entity.getComponent('Placement') as any;
  const geom = visual?.geometry;
  const isModel = geom?.type === 'model';
  const assetId = geom?.assetId || visual?.material?.textureAssetId;
  const assetMetadata = assetId ? manager.getAssetRegistry().getMetadataSync(assetId) : null;
  const realFaces = assetMetadata?.modelStats?.faces;
  const imgWidth = assetMetadata?.textureMetadata?.width;
  const imgHeight = assetMetadata?.textureMetadata?.height;

  return (
    <>
      <div className="flex justify-between text-[10px]">
        <span className="text-gray-500">几何类型 (Geometry)</span>
        <span className="text-cyan-400 font-mono uppercase">{geom?.type || 'Unknown'}</span>
      </div>
      <div className="flex justify-between text-[10px]">
        <span className="text-gray-500">{realFaces ? '多边形总数 (Faces)' : '多边形估算 (Polygons)'}</span>
        <span className="text-cyan-400 font-mono">
          {realFaces ? realFaces.toLocaleString() : (isModel || geom?.type === 'custom' ? '~42.5k' : '24')}
        </span>
      </div>
      {(imgWidth && imgHeight) && (
        <div className="flex justify-between text-[10px]">
          <span className="text-gray-500">原始规格 (Image Stats)</span>
          <span className="text-cyan-400 font-mono">{imgWidth} x {imgHeight}</span>
        </div>
      )}
      <div className="flex justify-between text-[10px]">
        <span className="text-gray-500">材质插槽 (Materials)</span>
        <span className="text-cyan-400 font-mono">{visual?.material ? '1' : '0'}</span>
      </div>

      {geom?.type === 'plane' && visual?.material?.textureAssetId && (
        <div className="flex items-center justify-between p-2 mt-2 bg-blue-950/30 border border-blue-500/30 rounded-lg animate-in fade-in zoom-in-95 duration-300">
          <div className="flex flex-col">
            <span className="text-[9px] text-blue-400 font-bold uppercase tracking-tight">显示模式 (Mode)</span>
            <span className="text-[7px] text-blue-600 font-mono italic">IMAGE MODALITY</span>
          </div>
          <select
            value={placement?.mode || 'billboard'}
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => {
              dispatch(EngineCommandType.SET_IMAGE_MODE, {
                entityId: selectedEntity,
                mode: (e.target.value as any)
              });
            }}
            className="bg-black/40 text-blue-400 text-[10px] border border-blue-900 rounded p-1 outline-none focus:border-blue-400 transition-all cursor-pointer hover:bg-black/60 font-bold"
          >
            <option value="billboard"> 看板 (Billboard)</option>
            <option value="standee"> 立牌 (Standee)</option>
            <option value="sticker"> 贴纸 (Sticker)</option>
          </select>
        </div>
      )}
    </>
  );
}, (prev, next) => {
  return prev.selectedEntity === next.selectedEntity && prev.revision === next.revision;
});

/**
 * 🔥 Optimization: Global Audio Hub (Isolated)
 * Handles high-frequency playback progress (100ms) without re-rendering the whole panel.
 */
interface AudioHubProps {
  playingAudioId: string;
  assetList: AssetMetadata[];
  manager: IArchitectureFacade;
  dispatch: (type: EngineCommandType, payload?: any) => void;
  setPlayingAudioId: (id: string | null) => void;
  playbackVolume: number;
  setPlaybackVolume: (v: number) => void;
  isMuted: boolean;
  setIsMuted: (m: boolean) => void;
  playbackRate: number;
  setPlaybackRate: (r: number) => void;
  lastVolume: number;
  setLastVolume: (v: number) => void;
  isLooping: boolean;
  setIsLooping: (v: boolean) => void;
}

const AudioHub = React.memo(({
  playingAudioId,
  assetList,
  manager,
  dispatch,
  setPlayingAudioId,
  playbackVolume,
  setPlaybackVolume,
  isMuted,
  setIsMuted,
  playbackRate,
  setPlaybackRate,
  lastVolume,
  setLastVolume,
  isLooping,
  setIsLooping
}: AudioHubProps) => {
  const [playbackStatus, setPlaybackStatus] = useState<{ currentTime: number; duration: number; isPlaying: boolean } | null>(null);

  // Drag & Position Persistence
  const hubRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const positionRef = useRef<{ x: number, y: number }>((() => {
    try {
      const saved = localStorage.getItem('polyforge_audiohub_pos');
      return saved ? JSON.parse(saved) : { x: window.innerWidth / 2 - 180, y: 32 };
    } catch {
      return { x: window.innerWidth / 2 - 180, y: 32 };
    }
  })());

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !hubRef.current) return;
      const newX = e.clientX - dragOffsetRef.current.x;
      const newY = e.clientY - dragOffsetRef.current.y;
      hubRef.current.style.transform = `translate(${newX}px, ${newY}px)`;
      positionRef.current = { x: newX, y: newY };
    };
    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        localStorage.setItem('polyforge_audiohub_pos', JSON.stringify(positionRef.current));
      }
      isDraggingRef.current = false;
      if (hubRef.current) {
        hubRef.current.style.cursor = 'move';
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Internal Polling - Only this component re-renders at 10Hz
  useEffect(() => {
    const interval = setInterval(() => {
      const status = manager.getAudioPlaybackState(playingAudioId);
      if (status) setPlaybackStatus(status);
    }, 100);
    return () => clearInterval(interval);
  }, [playingAudioId, manager]);

  const asset = useMemo(() => {
    return assetList.find(a => a.id === playingAudioId || a.id === playingAudioId?.split('_').pop());
  }, [assetList, playingAudioId]);

  const progress = (playbackStatus && playbackStatus.duration > 0) ? (playbackStatus.currentTime / playbackStatus.duration) * 100 : 0;
  const isPlaying = !!playbackStatus?.isPlaying; // 🔥 Precise check from system

  return (
    <div
      ref={hubRef}
      className="absolute border border-cyan-500/20 rounded-2xl pl-1 pr-2 py-1 flex items-center gap-3 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] z-[9999] animate-in fade-in slide-in-from-top-2 duration-500 cursor-move select-none group/hub"
      style={{
        transform: `translate(${positionRef.current.x}px, ${positionRef.current.y}px)`,
        top: 0, left: 0,
        backgroundColor: 'rgba(10, 15, 25, 0.7)',
        boxShadow: '0 0 20px rgba(6, 182, 212, 0.1), inset 0 0 0 1px rgba(255, 255, 255, 0.05)'
      }}
      onMouseDown={(e) => {
        if (!hubRef.current || (e.target as HTMLElement).closest('button, input')) return;
        isDraggingRef.current = true;
        dragOffsetRef.current = {
          x: e.clientX - positionRef.current.x,
          y: e.clientY - positionRef.current.y
        };
      }}
    >
      {/* 📀 Spinning Record (Play/Pause Toggle) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          dispatch(EngineCommandType.TOGGLE_PAUSE_AUDIO, { assetId: playingAudioId });
        }}
        className="relative w-10 h-10 group/record outline-none"
      >
        <div className={`w-full h-full rounded-full bg-gray-900 border-2 border-gray-800 flex items-center justify-center transition-all duration-700 shadow-lg ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : 'rotate-45 scale-95 opacity-80'}`}>
          <div className="w-1/3 h-1/3 rounded-full bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center">
            <div className="w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"></div>
          </div>
          {/* Vinyl Grooves Mockup */}
          <div className="absolute inset-1 rounded-full border border-white/5 pointer-events-none"></div>
          <div className="absolute inset-2 rounded-full border border-white/5 pointer-events-none"></div>
        </div>
        {/* Play/Pause Hover Icon */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/record:opacity-100 transition-opacity">
          <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} text-white text-[10px] drop-shadow-md`}></i>
        </div>
      </button>

      <div className="flex flex-col min-w-[100px] gap-0.5">
        <div className="flex items-center gap-1.5 overflow-hidden">
          <span className="text-[7px] font-black text-cyan-500/60 uppercase tracking-widest animate-pulse">Live</span>
          <span className="text-[9px] text-gray-200 font-bold truncate max-w-[140px] tracking-tight">
            {asset ? asset.name : (playingAudioId.split('_').pop() || 'Unknown Track')}
          </span>
        </div>

        {/* 📊 Progress Bar */}
        <div className="w-full flex flex-col gap-1 pr-2">
          <div className="relative w-full h-[2px] bg-white/5 rounded-full overflow-hidden self-center">
            <div
              className={`h-full bg-gradient-to-r from-cyan-600 to-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)] transition-all duration-300 ${isPlaying ? '' : 'opacity-40 grayscale'}`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="flex justify-between font-mono text-[6px] text-gray-500 font-bold tabular-nums">
            <span>{playbackStatus ? `${Math.floor(playbackStatus.currentTime / 60)}:${Math.floor(playbackStatus.currentTime % 60).toString().padStart(2, '0')}` : '--:--'}</span>
            <span className="opacity-50 tracking-widest">{playbackStatus ? `${Math.floor(playbackStatus.duration / 60)}:${Math.floor(playbackStatus.duration % 60).toString().padStart(2, '0')}` : '--:--'}</span>
          </div>
        </div>
      </div>

      <div className="h-8 w-[1px] bg-white/5 mx-1"></div>

      {/* 🕹️ Controls Section */}
      <div className="flex items-center gap-0.5 pr-1" onMouseDown={(e) => e.stopPropagation()}>
        {/* 🔁 Loop Button */}
        <button
          onClick={() => {
            const next = !isLooping;
            setIsLooping(next);
            dispatch(EngineCommandType.SET_AUDIO_LOOPING, { assetId: playingAudioId, isLooping: next });
          }}
          className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${isLooping ? 'bg-cyan-500/20 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)]' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
          title="循环播放 (Toggle Loop)"
        >
          <i className="fas fa-redo-alt text-[10px]"></i>
        </button>

        {/* 🔊 Volume (Compact) */}
        <div className="flex items-center gap-1.5 px-1.5 h-7 bg-black/20 rounded-lg group/vol border border-white/5">
          <button
            onClick={() => {
              if (isMuted) {
                setIsMuted(false);
                setPlaybackVolume(lastVolume);
                dispatch(EngineCommandType.SET_MASTER_VOLUME, { volume: lastVolume });
              } else {
                setIsMuted(true);
                setLastVolume(playbackVolume);
                setPlaybackVolume(0);
                dispatch(EngineCommandType.SET_MASTER_VOLUME, { volume: 0 });
              }
            }}
            className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-cyan-400 transition-colors"
          >
            <i className={`fas ${isMuted || playbackVolume === 0 ? 'fa-volume-mute text-red-500' : 'fa-volume-up'} text-[9px]`}></i>
          </button>
          <input
            type="range" min="0" max="1" step="0.05"
            value={playbackVolume}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setPlaybackVolume(val);
              if (val > 0 && isMuted) setIsMuted(false);
              dispatch(EngineCommandType.SET_MASTER_VOLUME, { volume: val });
            }}
            className="w-10 accent-cyan-500 h-[2px] cursor-pointer bg-white/10 rounded-full appearance-none flex self-center transition-all group-hover/vol:w-16"
          />
        </div>

        {/* ⚡ Playback Rate (Restored) */}
        <div className="flex items-center gap-1 bg-black/20 rounded-lg p-0.5 border border-white/5 mx-1">
          {[0.5, 1.0, 1.5, 2.0].map(rate => (
            <button
              key={rate}
              onClick={() => {
                setPlaybackRate(rate);
                dispatch(EngineCommandType.SET_PLAYBACK_RATE, { rate });
              }}
              className={`text-[7px] font-mono px-1.5 py-0.5 rounded transition-all ${playbackRate === rate ? 'bg-cyan-500 text-white shadow-[0_0_8px_rgba(6,182,212,0.4)]' : 'text-gray-500 hover:text-cyan-200'}`}
            >
              x{rate}
            </button>
          ))}
        </div>

        <div className="w-[1px] h-4 bg-white/5 mx-1"></div>

        {/* ✖️ Explicit Close Button */}
        <button
          onClick={() => {
            dispatch(EngineCommandType.STOP_PREVIEW_AUDIO);
            setPlayingAudioId(null);
          }}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:bg-red-500/20 hover:text-red-400 transition-all border border-transparent hover:border-red-500/20"
          title="关闭播放器 (Dismiss)"
        >
          <i className="fas fa-times text-[10px]"></i>
        </button>
      </div>
    </div>
  );
});

/**
 * 🔥 Optimization: Individual Asset Item (Memoized)
 * Prevents re-rendering 50+ assets when a unrelated state (like Stats) changes.
 */
interface AssetItemProps {
  asset: AssetMetadata;
  assetViewMode: string;
  playingAudioId: string | null;
  onAssetClick: (asset: AssetMetadata) => void;
  onContextMenu: (e: React.MouseEvent, asset: AssetMetadata) => void;
  onDelete: (id: string) => void;
  onExport: (asset: AssetMetadata) => void;
  setPlayingAudioId: (id: string | null) => void;
  dispatch: any;
  isLooping: boolean; // Added for PREVIEW_AUDIO
  manager: IArchitectureFacade; // Refined type
  revision: number; // 🔥 Added to force re-render on engine state change
}

const AssetItem = React.memo(({
  asset,
  assetViewMode,
  playingAudioId,
  onAssetClick,
  onContextMenu,
  onDelete,
  onExport,
  setPlayingAudioId,
  dispatch,
  isLooping,
  manager,
  revision
}: AssetItemProps) => {
  return (
    <div
      onClick={() => onAssetClick(asset)}
      onContextMenu={(e) => onContextMenu(e, asset)}
      className={`group transition-all duration-300 cursor-pointer relative ${assetViewMode === 'grid' ? 'bg-gray-900/40 border border-gray-800 rounded-2xl p-3 flex flex-col gap-2 hover:border-cyan-500/40 hover:bg-gray-800/50 hover:-translate-y-1 shadow-lg' :
        assetViewMode === 'compact' ? 'bg-gray-900/30 border border-gray-800/50 rounded-lg p-1 aspect-square hover:border-cyan-500/50 transition-all' :
          'bg-gray-900/20 hover:bg-gray-800/40 border border-gray-800/20 hover:border-cyan-900/30 rounded-lg px-3 py-2 flex items-center justify-between group'
        }`}
    >
      {/* Visual Content */}
      {(assetViewMode === 'grid' || assetViewMode === 'compact') && (
        <div className={`w-full bg-gray-950 rounded-xl flex items-center justify-center relative overflow-hidden ring-1 ring-gray-800/50 group-hover:ring-cyan-900/40 transition-all ${assetViewMode === 'grid' ? 'aspect-square' : 'h-full'}`}>
          {asset.thumbnail ? (
            <img src={asset.thumbnail} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700" alt="" />
          ) : (
            <div className="flex flex-col items-center justify-center opacity-10 group-hover:opacity-40 transition-opacity">
              {(() => {
                const cat = (asset.category || '').toLowerCase();
                const sub = asset.subCategory;
                if (cat === 'audio' || cat === 'music' || cat === 'sound' || cat === 'mp3' || asset.type === 'audio' || sub) {
                  if (sub === 'bgm') return <i className={`fas fa-compact-disc ${assetViewMode === 'grid' ? 'text-4xl' : 'text-xl'} text-purple-400`}></i>;
                  if (sub === 'sfx') return <i className={`fas fa-bolt ${assetViewMode === 'grid' ? 'text-4xl' : 'text-xl'} text-orange-400`}></i>;
                  if (sub === 'voice') return <i className={`fas fa-microphone ${assetViewMode === 'grid' ? 'text-4xl' : 'text-xl'} text-pink-400`}></i>;
                  if (sub === 'ambient') return <i className={`fas fa-tree ${assetViewMode === 'grid' ? 'text-4xl' : 'text-xl'} text-green-400`}></i>;
                  return <i className={`fas fa-music ${assetViewMode === 'grid' ? 'text-4xl' : 'text-xl'} text-cyan-400`}></i>;
                }
                return <i className={`fas ${cat === 'models' ? 'fa-cube' : cat === 'textures' ? 'fa-image' : cat === 'environments' ? 'fa-mountain' : 'fa-box'} ${assetViewMode === 'grid' ? 'text-4xl' : 'text-xl'}`}></i>;
              })()}
            </div>
          )}
          {assetViewMode === 'grid' && (
            <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-gray-950/90 rounded-md text-[7px] text-cyan-400 font-bold uppercase border border-cyan-500/20 backdrop-blur-sm z-10 shadow-xl pointer-events-none">
              {asset.category === 'environments' ? 'HDR' : (asset.subCategory || asset.category.replace(/s$/, '')).toUpperCase()}
            </div>
          )}

          {/* 🔥 音频卡片信息增强：在网格模式下显示名称与类型预览 */}
          {(assetViewMode === 'grid' || assetViewMode === 'compact') && (asset.category === 'audio' || asset.type === 'audio') && (
            <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
              <div className="text-[8px] text-cyan-300 font-bold truncate">{asset.name}</div>
              <div className="text-[6px] text-gray-500 font-mono uppercase tracking-widest">{asset.subCategory || 'General'}</div>
            </div>
          )}

          {(asset.category === 'audio' || asset.category === 'music' || asset.category === 'sound' || asset.type === 'audio') && (
            <div
              className={`absolute inset-0 z-[15] flex items-center justify-center transition-all duration-300 backdrop-blur-[1px] ${playingAudioId === asset.id ? 'bg-cyan-900/40 opacity-100 ring-2 ring-inset ring-cyan-500/50' : 'bg-black/50 opacity-0 group-hover:opacity-100'}`}
              onClick={(e) => {
                e.stopPropagation();
                if (playingAudioId === asset.id) {
                  // 🔥 此处逻辑修改：点击列表中的预览按钮，改为触发引擎侧的 TogglePause
                  // 这样可以利用断点续播，而不是目前简单的 Stop/Play
                  dispatch(EngineCommandType.TOGGLE_PAUSE_AUDIO, { assetId: asset.id });
                } else {
                  dispatch(EngineCommandType.PREVIEW_AUDIO, { assetId: asset.id, looping: isLooping });
                  setPlayingAudioId(asset.id);
                }
              }}
            >
              <div className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all ${playingAudioId === asset.id ? 'bg-cyan-500 text-white border-cyan-400 scale-110 shadow-[0_0_15px_rgba(6,182,212,0.6)]' : 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200 hover:scale-110'}`}>
                <i className={`fas ${playingAudioId === asset.id && manager.getAudioPlaybackState(asset.id)?.isPlaying ? 'fa-pause' : 'fa-play'} text-sm ml-0.5`}></i>
              </div>
            </div>
          )}
          <div className="absolute top-1 left-1 flex gap-1 z-20 opacity-0 group-hover:opacity-100 transition-all">
            {(asset.category === 'models' || asset.category === 'model') && (
              <button onClick={(e) => { e.stopPropagation(); onExport(asset); }} className="w-5 h-5 bg-cyan-950/80 text-cyan-400 rounded-md flex items-center justify-center text-[7px] border border-cyan-500/20"><i className="fas fa-file-export"></i></button>
            )}
            <button onClick={(e) => { e.stopPropagation(); onDelete(asset.id); }} className="w-5 h-5 bg-red-950/80 text-red-400 rounded-md flex items-center justify-center text-[7px] border border-red-500/20"><i className="fas fa-trash"></i></button>
          </div>
        </div>
      )}
      {/* Name & ID */}
      {assetViewMode === 'grid' && (
        <div className="flex flex-col px-0.5 mt-1">
          <span className="text-[9px] text-gray-300 font-bold truncate group-hover:text-cyan-400 transition-colors" title={asset.name}>{asset.name}</span>
          <div className="flex justify-between items-center mt-0.5">
            <span className="text-[7px] text-gray-600 font-mono truncate uppercase tracking-widest">{asset.id.split('_').pop()}</span>
            {asset.type === 'audio' && <span className="text-[6px] text-cyan-900 border border-cyan-900/30 px-1 rounded uppercase font-black">{asset.subCategory || 'Audio'}</span>}
          </div>
        </div>
      )}
      {assetViewMode === 'list' && (
        <>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-gray-900 flex items-center justify-center text-cyan-700 relative overflow-hidden group/audio-list">
              <i className={`fas ${asset.category === 'models' ? 'fa-cube' : (asset.category === 'audio' ? 'fa-music' : 'fa-image')} text-[10px]`}></i>

              {(asset.category === 'audio' || asset.category === 'music' || asset.category === 'sound' || asset.type === 'audio') && (
                <div
                  className={`absolute inset-0 flex items-center justify-center cursor-pointer transition-all duration-300 ${playingAudioId === asset.id ? 'bg-cyan-500 text-white' : 'bg-black/60 text-cyan-400 opacity-0 group-hover/audio-list:opacity-100'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (playingAudioId === asset.id) {
                      // 🔥 Use TogglePause instead of Stop for better continuity
                      dispatch(EngineCommandType.TOGGLE_PAUSE_AUDIO, { assetId: asset.id });
                    } else {
                      setPlayingAudioId(asset.id);
                      dispatch(EngineCommandType.PREVIEW_AUDIO, { assetId: asset.id, looping: isLooping });
                    }
                  }}
                >
                  <i className={`fas ${playingAudioId === asset.id ? 'fa-pause' : 'fa-play'} text-[10px]`}></i>
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-200 font-bold group-hover:text-cyan-400 transition-colors cursor-pointer" onClick={() => onAssetClick(asset)}>{asset.name}</span>
                {asset.type === 'audio' && <span className="text-[6px] text-cyan-600/60 border border-cyan-600/20 px-1 rounded uppercase font-mono">{asset.subCategory || 'General'}</span>}
              </div>
              <span className="text-[6px] text-gray-600 font-mono uppercase truncate max-w-[150px] tracking-tight">{asset.id}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[7px] bg-gray-950 px-1.5 py-0.5 rounded border border-gray-800 text-gray-500 uppercase font-bold tracking-tighter">{asset.category}</span>
            <button onClick={(e) => { e.stopPropagation(); onDelete(asset.id); }} className="text-[10px] text-gray-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><i className="fas fa-trash-alt"></i></button>
          </div>
        </>
      )}
    </div>
  );
}, (prev, next) => {
  // Only re-render if its play state or view mode changes
  return prev.playingAudioId === next.playingAudioId &&
    prev.assetViewMode === next.assetViewMode &&
    prev.asset === next.asset &&
    prev.isLooping === next.isLooping &&
    prev.revision === next.revision; // 🔥 Critical: sync with engine state
});

export const ArchitectureValidationPanel: React.FC<ArchitectureValidationPanelProps> = ({
  manager,
  onBloomStrengthChange,
  onBloomThresholdChange,
  onGrassScaleChange,
  onWindStrengthChange,
  onGrassColorChange
}) => {
  // --- State ---
  const [activeTab, setActiveTab] = useState<TabType>('world');
  const [currentContext, setCurrentContext] = useState<string>(ValidationContext.CREATION);
  const [stats, setStats] = useState({
    entityCount: 0,
    systemCount: 0,
    vegetationCount: 0,
    terrainVertices: 0,
    undoCount: 0,
    redoCount: 0,
    lastCommand: '' as string | null,
    hasSave: false,
    physicsInitialized: false,
    physicsBodies: 0,
    assetCount: 0,
    undoHistory: [] as any[],
  });

  const [assetList, setAssetList] = useState<AssetMetadata[]>([]);

  // 导演控制状态
  const [bloomStrength, setBloomStrength] = useState(0.5);
  const [bloomThreshold, setBloomThreshold] = useState(0.85);
  const [physicsDebugEnabled, setPhysicsDebugEnabled] = useState(false);
  const [audioDebugEnabled, setAudioDebugEnabled] = useState(false);
  // 🔥 Shadow Tuning State
  const [shadowBias, setShadowBias] = useState(-0.00002);
  const [shadowNormalBias, setShadowNormalBias] = useState(0);
  const [shadowOpacity, setShadowOpacity] = useState(0.8);
  const [shadowRadius, setShadowRadius] = useState(1);
  const [shadowColor, setShadowColor] = useState('#3f423e');
  const [shadowDistance, setShadowDistance] = useState(-1);

  // 🔥 Camera Presets
  const [activePreset, setActivePreset] = useState<string | null>(null);

  // 🔥 Spawn Button State (Spawn -> Bind -> Unbind)
  const [spawnButtonState, setSpawnButtonState] = useState<'Spawn' | 'Bind' | 'Unbind'>('Spawn');
  const [timeOfDay, setTimeOfDay] = useState(12);
  const [sunIntensity, setSunIntensity] = useState(1.0);
  const [cameraMode, setCameraMode] = useState<CameraMode>('orbit');
  const [fov, setFov] = useState(60);
  const [smaaEnabled, setSmaaEnabled] = useState(true);
  const [exposure, setExposure] = useState(1.0);
  const [moveSpeed, setMoveSpeed] = useState(10.0);
  const [forceMultiplier, setForceMultiplier] = useState(25.0);
  const [camPitch, setCamPitch] = useState(45);
  const [camYaw, setCamYaw] = useState(45);
  const [camDistance, setCamDistance] = useState(15);
  const [flightMode, setFlightMode] = useState(false); // 🔥 Added State

  // World Controls
  const [grassScale, setGrassScale] = useState(1.0);
  const [windStrength, setWindStrength] = useState(0.1);
  const [grassColor, setGrassColor] = useState('#7cba3d');
  const [flowerColor, setFlowerColor] = useState('#ff69b4');
  const [activeVegType, setActiveVegType] = useState<'grass' | 'flower'>('grass');
  const [gravityY, setGravityY] = useState(-9.8);
  /* New: Audio State & Drag Logic (Optimized) */
  /* New: Audio State (Isolated in Sub-component) */
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [playbackVolume, setPlaybackVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [lastVolume, setLastVolume] = useState(1.0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isLooping, setIsLooping] = useState(false); // 🔥 Moved to global for persistence

  // Drag Refs - No Re-renders!
  /* Removed global drag refs - isolated in AudioHub */

  /* New: Terrain Gen State */
  const [isGenerating, setIsGenerating] = useState(false);
  const [terrainWidth, setTerrainWidth] = useState(50);
  const [terrainDepth, setTerrainDepth] = useState(50);
  const [colliderScale, setColliderScale] = useState(1.0); // 🔥 Physics compensation
  const [isEditingCollider, setIsEditingCollider] = useState(false); // 🧱 MVP: Collider Edit Mode State
  const [colliderOffsetY, setColliderOffsetY] = useState(0.0); // 🧱 Collider Vertical Offset

  // 🔥 Revision to force-sync UI with Engine State (Audio Icons, etc.)
  const [refreshRevision, setRefreshRevision] = useState(0);

  useEffect(() => {
    const handleStateChange = () => {
      setRefreshRevision(prev => prev + 1);
    };
    eventBus.on('ENGINE_STATE_CHANGED', handleStateChange);
    return () => {
      eventBus.off('ENGINE_STATE_CHANGED', handleStateChange);
    };
  }, []);
  const [colliderRotation, setColliderRotation] = useState(0.0); // 🧱 Collider Y-Axis Rotation


  // Asset Controls
  const [activeAssetTab, setActiveAssetTab] = useState<any>('all'); // 资产相关状态
  const [audioSubFilter, setAudioSubFilter] = useState<string>('all'); // 🔥 新增：音频子分类筛选
  const [assetViewMode, setAssetViewMode] = useState<'grid' | 'list' | 'compact'>('grid');
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, assetId: string } | null>(null); // 🔥 新增：右键菜单状态

  // 🔥 Optimization: Memoize asset filtering to prevent frame drops during audio playback or rapid re-renders
  const visibleAssets = useMemo(() => {
    return assetList.filter(a => {
      if (activeAssetTab === 'all') return true;

      const cat = (a.category || '').toLowerCase().trim();
      const tab = activeAssetTab.toLowerCase();

      // 🔥 终极兼容: 归一化比较 + 别名支持
      if (tab === 'textures') {
        return cat === 'textures' || cat === 'texture' || cat === 'image' || cat === 'images' || cat === 'png' || cat === 'jpg';
      }
      if (tab === 'models') {
        return cat === 'models' || cat === 'model' || cat === 'glb' || cat === 'gltf';
      }
      if (tab === 'audio') {
        if (!(cat === 'audio' || cat === 'sound' || cat === 'music' || cat === 'mp3')) return false;
        // 🔥 子分类筛选
        if (audioSubFilter !== 'all') {
          return a.subCategory === audioSubFilter;
        }
        return true;
      }

      return cat === tab || cat.includes(tab);
    });
  }, [assetList, activeAssetTab, audioSubFilter]);

  // 🔥 UX Polish States
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Processing...');
  const [showConfirm, setShowConfirm] = useState<{ message: string, onConfirm: () => void } | null>(null);
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'info' | 'error' } | null>(null);
  const [bundleProgress, setBundleProgress] = useState<BundleProgress | null>(null);

  // 🔥 Placement & Rhythm States
  const [placementState, setPlacementState] = useState({ isPlacing: false, mode: 'model' as any, assetName: null as string | null });
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [revision, setRevision] = useState(0); // 🔥 UI 刷新脉冲

  const exportService = useRef(new ModelExportService());

  // Auto-dismiss notification
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);
  // --- Event Listeners ---
  useEffect(() => {
    const onEngineStateChanged = () => {
      setRevision(prev => prev + 1);
    };

    const onPresetChanged = () => {
      // Force immediate update from system state
      if (manager && manager.getCameraSystem()) {
        const entities = manager.getEntityManager().getEntitiesWithComponents(['Camera']);
        const cam = entities[0]?.getComponent<CameraComponent>('Camera');
        if (cam) {
          setActivePreset(cam.activePreset);
          setCameraMode(cam.mode);
        }
      }
    };

    const onPresetFallback = () => {
      // Force UI update when fallback happens (e.g. player deleted)
      onPresetChanged();
    };

    const onError = (evt: any) => {
      // TODO: Show Toast
      console.warn('Camera Preset Error:', evt);
    };

    eventBus.on('camera:preset:changed', onPresetChanged);
    eventBus.on('camera:preset:fallback', onPresetFallback);
    eventBus.on('camera:preset:error', onError);

    // 🔥 Bundle & Export Listeners
    const onBundleProgress = (data: BundleProgress | null) => setBundleProgress(data);
    const onExportComplete = (data: any) => {
      if (data.success) {
        setNotification({
          message: data.isLarge ? `导出成功 (带容量警告): ${data.filename}` : `导出成功: ${data.filename}`,
          type: data.isLarge ? 'info' : 'success'
        });
      } else {
        setNotification({ message: `导出失败: ${data.error}`, type: 'error' });
      }
    };

    eventBus.on('BUNDLE_PROGRESS', onBundleProgress);
    eventBus.on('MODEL_EXPORT_COMPLETE', onExportComplete);

    eventBus.on('ENGINE_STATE_CHANGED', onEngineStateChanged);

    return () => {
      eventBus.off('camera:preset:changed', onPresetChanged);
      eventBus.off('camera:preset:fallback', onPresetFallback);
      eventBus.off('camera:preset:error', onError);
      eventBus.off('BUNDLE_PROGRESS', onBundleProgress);
      eventBus.off('MODEL_EXPORT_COMPLETE', onExportComplete);
      eventBus.off('ENGINE_STATE_CHANGED', onEngineStateChanged);
    };
  }, [manager]); // Re-bind if manager changes (usually once)

  // 🔥 Physics Config Sync Listener
  useEffect(() => {
    const handleSync = (e: CustomEvent) => {
      const { scale, offsetY, rotationY } = e.detail;
      if (scale !== undefined) setColliderScale(scale);
      if (offsetY !== undefined) setColliderOffsetY(offsetY);
      if (rotationY !== undefined) setColliderRotation(rotationY);
    };
    window.addEventListener('PHYSICS_CONFIG_UPDATED', handleSync as EventListener);
    return () => window.removeEventListener('PHYSICS_CONFIG_UPDATED', handleSync as EventListener);
  }, []);

  const fpsRef = useRef<HTMLSpanElement>(null);
  const lastTimeRef = useRef(performance.now());
  const frameCountRef = useRef(0);

  // --- Sync Loop ---
  useEffect(() => {
    if (!manager) return;

    const interval = setInterval(() => {
      // 1. Pull Stats
      const coreStats = manager.getStats();
      const cmdMgr = manager.getCommandManager();
      const storageMgr = manager.getStorageManager();
      const registry = manager.getAssetRegistry();

      setStats({
        ...coreStats,
        undoCount: cmdMgr.getStats().undoStackSize,
        redoCount: cmdMgr.getStats().redoStackSize,
        lastCommand: cmdMgr.getStats().lastCommand,
        hasSave: storageMgr.hasSave(),
        assetCount: registry.isInitialized() ? registry.getCacheStats().size : 0,
        undoHistory: cmdMgr.getHistory().undo.slice(-20).reverse(),
      });

      // 2. Pull Asset List (Async) - Moved to Event-Driven logic below for performance

      // 3. Pull World State
      const state = manager.getEnvironmentState();
      setTimeOfDay(state.timeOfDay);
      setBloomStrength(state.bloomStrength);
      setBloomThreshold(state.bloomThreshold);
      setGravityY(state.gravityY);
      setSunIntensity(state.lightIntensity);
      setSmaaEnabled(state.smaaEnabled);
      setExposure(state.toneMappingExposure);
      setPhysicsDebugEnabled(state.physicsDebugEnabled);
      setAudioDebugEnabled(state.audioDebugEnabled);
      setShadowBias(state.shadowBias);
      setShadowNormalBias(state.shadowNormalBias);
      setShadowOpacity(state.shadowOpacity ?? 0.8);
      setShadowRadius(state.shadowRadius ?? 1);
      setShadowColor(state.shadowColor ?? '#3f423e');
      setShadowDistance(state.shadowDistance ?? -1);

      // 3.5 Pull Terrain State (🔥 UI同步)
      const terrainEntity = manager.getEntityManager().getEntitiesWithComponents(['Terrain'])[0];
      const terrainComp = terrainEntity?.getComponent<TerrainComponent>('Terrain');
      if (terrainComp) {
        setTerrainWidth(terrainComp.config.width);
        setTerrainDepth(terrainComp.config.depth);
      }

      // 4. Pull Context
      setCurrentContext(manager.getContext());

      // 5. Pull Spawn Button State
      setSpawnButtonState(manager.getSpawnButtonState());

      // 6. Pull Camera Mode (🔥 UI同步：确保UI始终反映真实相机状态)
      const camSystem = manager.getCameraSystem();
      const currentCamMode = camSystem.getMode();
      setCameraMode(currentCamMode);

      // 7. Pull Camera Preset (🔒 健壮性：需传入 camera 参数，并检查 null)
      try {
        const cameraEntity = manager.getEntityManager().getEntitiesWithComponents(['Camera'])[0];
        const cameraComp = cameraEntity?.getComponent<CameraComponent>('Camera');
        if (cameraComp && camSystem.presetManager) {
          const currentPreset = camSystem.presetManager.getActivePresetId(cameraComp);
          setActivePreset(currentPreset);

          // 8. Pull Camera Parameters (🔥 Sync for custom sliders)
          setCamPitch(cameraComp.pitch);
          setCamYaw(cameraComp.yaw);
          setCamDistance(cameraComp.distance);

          // 9. Pull Flight Mode (🔥 UI同步：解决飞行模式开关失位问题)
          setFlightMode(manager.isFlightModeEnabled());
        }

        // 10. Pull Collider Scale (🔥 物理微调同步)
        const selId = manager.getSelectedEntityId();
        if (selId) {
          const entity = manager.getEntityManager().getEntity(selId);
          const phys = entity?.getComponent<any>('Physics');
          if (phys) {
            setColliderScale(phys.colliderScale ?? 1.0);
            setColliderOffsetY(phys.colliderLocalOffset?.[1] ?? 0.0);
            setColliderRotation(phys.colliderLocalRotation?.[1] ?? 0.0);
          }
        }
      } catch (e) {
        // Silent fail - preset system may not be fully initialized
      }

      if (manager.getPlacementState) {
        setPlacementState(manager.getPlacementState());
      }

      // 11. Pull Selection State
      if (manager.getSelectedEntityId) {
        setSelectedEntity(manager.getSelectedEntityId());
      }

      // 12. Pull Collider Editing State
      if (manager.isColliderEditingEnabled) {
        setIsEditingCollider(manager.isColliderEditingEnabled());
      }
    }, 500); // 2Hz Sync


  }, [manager]);

  // 8. Handle Pointer Lock (FPS/TPS) - Dedicated Effect to avoid closure stale state
  useEffect(() => {
    const handleCanvasClick = (e: MouseEvent) => {
      // 🚫 Filter out clicks on UI elements (Button, Input, etc)
      const target = e.target as HTMLElement;
      const isCanvas = target.tagName === 'CANVAS' || target.closest('canvas');

      // Strict Check: Only Experience Tab && Only Click on Canvas
      if (activeTab !== 'experience' || !isCanvas) return;

      if (manager) {
        const cam = manager.getEntityManager().getEntitiesWithComponents(['Camera'])[0]?.getComponent<CameraComponent>('Camera');
        if (cam && (cam.mode === 'firstPerson' || cam.mode === 'thirdPerson')) {
          const canvas = document.querySelector('canvas');
          if (canvas && document.pointerLockElement !== canvas) {
            canvas.requestPointerLock();
            console.log('🔒 Pointer Lock Requested');
          }
        }
      }
    };

    window.addEventListener('click', handleCanvasClick);
    return () => window.removeEventListener('click', handleCanvasClick);
  }, [activeTab, manager]);

  // 资产变更监听 (Performance Fix)
  useEffect(() => {
    if (!manager) return;
    const registry = manager.getAssetRegistry();

    const refreshAssets = () => {
      if (registry.isInitialized()) {
        registry.getAllMetadata().then(list => setAssetList(list));
      } else {
        // 如果还未初始化，尝试初始化并刷新（兜底逻辑）
        registry.initialize().then(() => {
          registry.getAllMetadata().then(list => setAssetList(list));
        });
      }
    };

    // 初始加载
    refreshAssets();

    eventBus.on('ASSET_REGISTRY_CHANGED', refreshAssets);
    return () => eventBus.off('ASSET_REGISTRY_CHANGED', refreshAssets);
  }, [manager]);

  // Sync Flight Mode UI State
  useEffect(() => {
    const handleFlightReset = () => setFlightMode(false);
    eventBus.on('gameplay:flight_mode:reset', handleFlightReset);
    return () => eventBus.off('gameplay:flight_mode:reset', handleFlightReset);
  }, []);

  // 🔥 监听 Transform 保存成功事件
  useEffect(() => {
    const handleTransformSaved = (e: CustomEvent) => {
      console.log('✅ [UI] Transform saved:', e.detail);
      // Toast 已在按钮点击时触发，这里可以做额外处理（如刷新资产列表）
    };

    window.addEventListener('ASSET_TRANSFORM_SAVED', handleTransformSaved as EventListener);
    return () => window.removeEventListener('ASSET_TRANSFORM_SAVED', handleTransformSaved as EventListener);
  }, []);

  // 🎹 交互输入核心 (Refactored Interaction Core)
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (!manager) return;

      // 1. 过滤 UI 点击 (防止点击按钮时误触发场景操作)
      // 如果点击目标是按钮、输入框或具有 'data-ui-ignore' 属性的元素，则忽略
      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('input') || target.closest('.no-click-through')) return;

      // 2. 转发给管理器
      if (e.button === 0) { // Left Click
        manager.handleInteraction('click', { x: e.clientX, y: e.clientY });
      } else if (e.button === 2) { // Right Click
        manager.handleInteraction('rightClick', { x: e.clientX, y: e.clientY });
      }
    };

    // 禁用右键菜单 (Context Menu) 以允许右键取消
    const handleContextMenu = (e: MouseEvent) => {
      // 仅在创造模式或放置状态下禁用右键菜单
      if (currentContext === ValidationContext.CREATION) {
        e.preventDefault();
      }
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [manager, currentContext]);

  // FPS Loop
  useEffect(() => {
    const updateFPS = () => {
      frameCountRef.current++;
      const now = performance.now();
      const delta = now - lastTimeRef.current;
      if (delta >= 1000) {
        const fps = Math.round((frameCountRef.current * 1000) / delta);
        if (fpsRef.current) fpsRef.current.textContent = `${fps}`;
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }
      requestAnimationFrame(updateFPS);
    };
    const animId = requestAnimationFrame(updateFPS);
    return () => cancelAnimationFrame(animId);
  }, []);


  // --- Dispatch Handlers ---

  const dispatch = (type: EngineCommandType, payload?: any) => {
    if (manager) {
      manager.dispatch({ type, ...payload });
    }
  };

  // Environment
  const handleTimeOfDayChange = (val: number) => {
    setTimeOfDay(val);
    dispatch(EngineCommandType.SET_TIME_OF_DAY, { hour: val });
  };
  const handleSunIntensityChange = (val: number) => {
    setSunIntensity(val);
    dispatch(EngineCommandType.SET_LIGHT_INTENSITY, { intensity: val });
  };
  const handleBloomStrengthChange = (val: number) => {
    setBloomStrength(val);
    dispatch(EngineCommandType.SET_BLOOM_STRENGTH, { strength: val });
    if (onBloomStrengthChange) onBloomStrengthChange(val);
  };
  const handleBloomThresholdChange = (val: number) => {
    setBloomThreshold(val);
    dispatch(EngineCommandType.SET_BLOOM_THRESHOLD, { threshold: val });
    if (onBloomThresholdChange) onBloomThresholdChange(val);
  };
  const handleGravityChange = (val: number) => {
    setGravityY(val);
    dispatch(EngineCommandType.SET_GRAVITY, { value: val });
  };
  const handlePhysicsDebugChange = (val: boolean) => {
    setPhysicsDebugEnabled(val);
    dispatch(EngineCommandType.TOGGLE_PHYSICS_DEBUG, { enabled: val });
  };
  const handleAudioDebugChange = (val: boolean) => {
    setAudioDebugEnabled(val);
    dispatch(EngineCommandType.TOGGLE_AUDIO_DEBUG, { enabled: val });
  };
  const handleShadowBiasChange = (val: number) => {
    setShadowBias(val);
    if (manager) manager.setShadowBias(val);
  };
  const handleShadowNormalBiasChange = (val: number) => {
    setShadowNormalBias(val);
    if (manager) manager.setShadowNormalBias(val);
  };
  const handleShadowOpacityChange = (val: number) => {
    setShadowOpacity(val);
    if (manager) manager.setShadowOpacity(val);
  };
  const handleShadowRadiusChange = (val: number) => {
    setShadowRadius(val);
    if (manager) manager.setShadowRadius(val);
  };
  const handleShadowColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setShadowColor(val);
    if (manager) manager.setShadowColor(val);
  };
  const handleShadowDistanceChange = (val: number) => {
    setShadowDistance(val);
    if (manager) manager.setShadowDistance(val);
  };

  // Camera
  // 🔒 仅用于切换到创造模式 (Orbit)
  const handleOrbitModeSwitch = () => {
    setCameraMode('orbit');
    dispatch(EngineCommandType.SET_CAMERA_MODE, { mode: 'orbit' });
    setActiveTab('world');
  };

  const handleContextSwitch = (ctx: string) => {
    setCurrentContext(ctx);
    // 📡 同步引擎上下文
    dispatch(EngineCommandType.SET_CONTEXT, { context: ctx === ValidationContext.CREATION ? 'CREATION' : 'EXPERIENCE' });

    if (ctx === ValidationContext.CREATION) {
      // 🔒 创造模式：切换到 Orbit
      handleOrbitModeSwitch();
    } else {
      // 🆕 体验模式：切换模式并应用预设
      setCameraMode('isometric');
      dispatch(EngineCommandType.SET_CAMERA_MODE, { mode: 'isometric' });
      handlePresetChange('iso');
      setActiveTab('experience');
    }
  };

  // 🆕 体验模式：使用预设系统切换相机
  const handlePresetChange = (presetId: string) => {
    if (!manager) return;

    // Dispatch command to apply preset
    // Note: The Manager will handle the logic via CameraSystem.presetManager
    dispatch(EngineCommandType.APPLY_CAMERA_PRESET, { presetId });

    // UI selection optimization (optimistic update)
    setActivePreset(presetId);
  };
  const handleFovChange = (val: number) => {
    setFov(val);
    dispatch(EngineCommandType.SET_CAMERA_FOV, { fov: val });
  };
  const handleSMAAChange = (val: boolean) => {
    setSmaaEnabled(val);
    dispatch(EngineCommandType.SET_SMAA_ENABLED, { enabled: val });
  };
  const handleExposureChange = (val: number) => {
    setExposure(val);
    dispatch(EngineCommandType.SET_TONE_MAPPING_EXPOSURE, { exposure: val });
  };
  const handleMoveSpeedChange = (val: number) => {
    setMoveSpeed(val);
    dispatch(EngineCommandType.SET_MOVE_SPEED, { speed: val });
  };
  const handleForceMultiplierChange = (val: number) => {
    setForceMultiplier(val);
    dispatch(EngineCommandType.SET_FORCE_MULTIPLIER, { multiplier: val });
  };

  // Vegetation
  const handleGrassScaleChange = (val: number) => {
    setGrassScale(val);
    dispatch(EngineCommandType.SET_GRASS_SCALE, { scale: val });
    if (onGrassScaleChange) onGrassScaleChange(val);
  };
  const handleWindStrengthChange = (val: number) => {
    setWindStrength(val);
    dispatch(EngineCommandType.SET_WIND_STRENGTH, { strength: val });
    if (onWindStrengthChange) onWindStrengthChange(val);
  };
  const handleVegetationColorChange = (color: string) => {
    if (activeVegType === 'grass') {
      setGrassColor(color);
      dispatch(EngineCommandType.SET_GRASS_COLOR, { color });
      if (onGrassColorChange) onGrassColorChange(color);
    } else {
      setFlowerColor(color);
      dispatch(EngineCommandType.SET_FLOWER_COLOR, { color }); // The Missing Link
    }
  };
  const handleSpawnVegetation = () => {
    if (isGenerating) return;
    setIsGenerating(true);
    // 5000 for grass, 500 for flowers
    const count = activeVegType === 'grass' ? 5000 : 500;
    const color = activeVegType === 'grass' ? grassColor : flowerColor; // 🔥 Capture current color
    setTimeout(() => {
      dispatch(EngineCommandType.SPAWN_VEGETATION, { count, vegType: activeVegType, color }); // ✅ Pass color
      setIsGenerating(false);
    }, 0);
  };
  const handleClearVegetation = () => {
    if (confirm('确定要清除所有植被吗？ (Are you sure to clear all vegetation?)')) {
      dispatch(EngineCommandType.CLEAR_VEGETATION);
    }
  };

  // Action Buttons
  const handleCreateMountain = () => dispatch(EngineCommandType.CREATE_MOUNTAIN);
  const handleCreateValley = () => dispatch(EngineCommandType.CREATE_VALLEY);
  const handleFlattenTerrain = () => dispatch(EngineCommandType.FLATTEN_TERRAIN);
  const handleSpawnPhysicsCube = () => dispatch(EngineCommandType.SPAWN_PHYSICS_BOX);
  const handleExplosionTest = () => dispatch(EngineCommandType.APPLY_PHYSICS_EXPLOSION, { position: [0, 5, 0], force: 200, radius: 20 });

  // System
  const handleUndo = () => dispatch(EngineCommandType.UNDO);
  const handleRedo = () => dispatch(EngineCommandType.REDO);
  const handleSave = () => dispatch(EngineCommandType.SAVE_SCENE);
  const handleReset = () => dispatch(EngineCommandType.RESET_SCENE);
  // --- Bundling with Safety & UX ---
  const handleExportBundle = async () => {
    const name = prompt('捆绑包名称 (Bundle Name):', 'MySceneLevel');
    if (!name) return;

    // 不再使用全屏加载，改用 HUD 进度条 (由 Manager 的 EventBus 驱动)
    try {
      await dispatch(EngineCommandType.EXPORT_BUNDLE, { name });
      // 成功通知由 MODEL_EXPORT_COMPLETE 监听器处理 (见 useEffect)
    } catch (err) {
      console.error(err);
      setNotification({ message: '导出失败 (Export Failed)', type: 'error' });
    }
  };

  const handleImportBundle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = '';

    setShowConfirm({
      message: '确定要导入该生态包吗？当前场景将被覆盖。\n(Import this bundle? Current scene will be overwritten.)',
      onConfirm: async () => {
        try {
          await dispatch(EngineCommandType.IMPORT_BUNDLE, { file });
          // Force refresh world state UI
          if (manager) {
            const state = manager.getEnvironmentState();
            setGravityY(state.gravityY);
          }
        } catch (err) {
          console.error(err);
          setNotification({ message: '导入失败 (Import Failed)', type: 'error' });
        }
      }
    });
  };

  // New Asset Imports (using registry)
  const handleAssetImport = (e: React.ChangeEvent<HTMLInputElement>, category: any) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !manager) return;
    const registry = manager.getAssetRegistry();

    // 🔥 Batch: Iterate ALL selected files
    Array.from(files).forEach((file) => {
      if (category === 'models') registry.importModel(file, { category: 'models' });
      else if (category === 'audio') registry.importAudio(file, { category: 'audio' });
      else if (category === 'environments') registry.importHDR(file, { category: 'environments' });
      else if (category === 'textures') registry.importTexture(file, { category: 'textures' });
      else {
        // 🔥 Auto-detect by extension for 'all' tab
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        if (['glb', 'gltf'].includes(ext)) registry.importModel(file, { category: 'models' });
        else if (['mp3', 'wav', 'ogg'].includes(ext)) registry.importAudio(file, { category: 'audio' });
        else if (['hdr', 'exr'].includes(ext)) registry.importHDR(file, { category: 'environments' });
        else if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) registry.importTexture(file, { category: 'textures' });
      }
    });

    // Reset input value to allow re-import of same files
    e.target.value = '';
  };

  const handleBatchImport = async (e?: React.ChangeEvent<HTMLInputElement>) => {
    if (!manager) return;
    const registry = manager.getAssetRegistry();

    try {
      if (e) {
        // Simple file select (if used via input)
        const file = e.target.files?.[0];
        if (file) {
          const type = FileSystemService.getFileType(file.name);
          if (type === 'model') registry.importModel(file, { category: 'models' });
          else if (type === 'audio') registry.importAudio(file, { category: 'audio' });
          else if (type === 'hdr') registry.importHDR(file, { category: 'environments' });
          else if (type === 'texture') registry.importTexture(file, { category: 'textures' });
        }
      } else {
        // Modern Directory Picker (Power Feature)
        const dirHandle = await FileSystemService.selectDirectory();
        if (dirHandle) {
          const files = await FileSystemService.scanDirectory(dirHandle);
          if (files.length > 0) {
            await FileSystemService.batchImport(files, registry);
            console.log(`[ArchitectureValidationPanel] Batch import of ${files.length} assets completed`);
          }
        }
      }
    } catch (err) {
      console.error('[ArchitectureValidationPanel] Import Error:', err);
    }
  };

  const handleAssetDelete = (id: string) => {
    if (confirm(`确定要删除资产 ${id} 吗？ (Delete this asset?)`)) {
      if (manager) {
        manager.getAssetRegistry().deleteAsset(id);
      }
    }
  };

  const handleAssetContextMenu = (e: React.MouseEvent, asset: any) => {
    e.preventDefault();
    if (asset.category === 'audio' || asset.category === 'music' || (asset.subCategory && asset.category !== 'models')) {
      setContextMenu({ x: e.clientX, y: e.clientY, assetId: asset.id });
    }
  };

  const handleReclassify = async (assetId: string, subCategory: string) => {
    if (!manager) return;
    try {
      await manager.getAssetRegistry().updateAssetMetadata(assetId, { subCategory });
      setNotification({ message: '分类已更新', type: 'success' });
      setContextMenu(null);
    } catch (err) {
      console.error('Reclassify Error:', err);
    }
  };

  const handleModelExport = async (asset: any) => {
    if (!manager) return;

    // 1. 从资源库获取模型数据 (Blob -> URL -> GLTFLoader -> Object)
    // 注意：这里为了简化，我们先直接下载 PFB 已有的 Blob，
    // 或者通过 Manager 重新导出当前场景中的 Entity (如果是已实例化的)
    // 这里的实现选择：将当前选中的资源库模型导出
    const registry = manager.getAssetRegistry();
    const blob = await registry.getAsset(asset.id);
    if (!blob) return;

    // 触发全局进度感 (伪进度，因为是单体导出)
    setBundleProgress({ step: '正在进行单体模型导出...', assetName: asset.name, progress: 0.5 });

    try {
      // 逻辑：直接分发原始资产数据，保留全部模型细节 (如制作人的 41MB 手枪)
      const buffer = await blob.arrayBuffer();
      await exportService.current.exportBuffer(buffer, asset.name);
    } catch (err) {
      console.error('[handleModelExport] Export failed:', err);
    }

    setBundleProgress(null);
  };

  const handleAssetClick = (asset: any) => {
    const cat = (asset.category || '').toLowerCase();
    const type = (cat === 'models' || cat === 'model') ? 'model' :
      (cat === 'textures' || cat === 'texture' || cat === 'image') ? 'image' : null;

    // 🎨 增强逻辑：如果当前已选中实体且资源类型匹配，执行“一键应用”
    if (selectedEntity && type) {
      dispatch(EngineCommandType.APPLY_ASSET_TO_SELECTION, { assetId: asset.id, assetType: type as any });
      setNotification({ message: `资产已应用至选中项: ${asset.name}`, type: 'success' });
      return;
    }

    if (cat === 'environments' || cat === 'environment') {
      dispatch(EngineCommandType.SET_HDR, { assetId: asset.id });
      setNotification({ message: `已切换天空盒: ${asset.name}`, type: 'success' });
      return;
    }

    if (type === 'model') {
      dispatch(EngineCommandType.ENTER_PLACEMENT_MODE, { assetId: asset.id, assetName: asset.name });
      return;
    }

    if (type === 'image') {
      dispatch(EngineCommandType.ENTER_IMAGE_PLACEMENT_MODE, { assetId: asset.id, assetName: asset.name });
      return;
    }

    if (cat === 'audio' || cat === 'music' || cat === 'sound' || asset.type === 'audio') {
      // 预览逻辑
      if (playingAudioId === asset.id) {
        setPlayingAudioId(null);
        dispatch(EngineCommandType.STOP_PREVIEW_AUDIO);
      } else {
        setPlayingAudioId(asset.id);
        dispatch(EngineCommandType.PREVIEW_AUDIO, { assetId: asset.id, looping: isLooping });
      }
      return;
    }
  };

  // Audio Progress Polling - Removed from global (Isolated in AudioHub)
  // ... Render ...
  if (!manager) {
    return <div className="w-96 h-full bg-gray-950 flex items-center justify-center text-gray-500 italic font-mono">
      <i className="fas fa-circle-notch fa-spin mr-2"></i> 正在连接至轨道指令中心...
    </div>;
  }

  return (
    <div className="w-96 h-full bg-gray-950 border-l border-gray-800 flex flex-col overflow-hidden font-sans text-xs select-none shadow-2xl z-50">

      <style>
        {`
          .no-scrollbar::-webkit-scrollbar, .custom-scrollbar::-webkit-scrollbar {
            display: none !important;
          }
          .no-scrollbar, .custom-scrollbar {
            -ms-overflow-style: none !important;
            scrollbar-width: none !important;
          }
        `}
      </style>

      {/* 1. HUD */}
      <div className="h-[60px] bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 shrink-0 shadow-md z-10">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">FPS</span>
            <span ref={fpsRef} className="text-xl font-bold text-green-400 font-mono leading-none">60</span>
          </div>
          <div className="h-6 w-px bg-gray-800"></div>
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">ENTITIES</span>
            <span className="text-xl font-bold text-white font-mono leading-none">{stats.entityCount}</span>
          </div>
        </div>

        <button onClick={handleReset} className="w-8 h-8 rounded flex items-center justify-center text-red-500 hover:bg-red-900/30"><i className="fas fa-trash-alt"></i></button>
      </div>

      {/* 🔥 Audio Hub (Isolated Component) */}
      {playingAudioId && manager && (
        <AudioHub
          playingAudioId={playingAudioId}
          assetList={assetList}
          dispatch={dispatch}
          manager={manager}
          setPlayingAudioId={setPlayingAudioId}
          playbackVolume={playbackVolume}
          setPlaybackVolume={setPlaybackVolume}
          playbackRate={playbackRate}
          setPlaybackRate={setPlaybackRate}
          isMuted={isMuted}
          setIsMuted={setIsMuted}
          lastVolume={lastVolume}
          setLastVolume={setLastVolume}
          isLooping={isLooping}
          setIsLooping={setIsLooping}
        />
      )}

      {/* 1.1 Context Switch */}
      <div className="bg-gray-950 p-2 shrink-0">
        <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-800">
          <button onClick={() => handleContextSwitch(ValidationContext.CREATION)} className={`flex-1 py-2 rounded-md font-bold uppercase tracking-wider text-[10px] ${currentContext === ValidationContext.CREATION ? 'bg-blue-600 text-white' : 'text-gray-500'}`}><i className="fas fa-tools mr-1"></i> 创造模式</button>
          <button onClick={() => handleContextSwitch(ValidationContext.EXPERIENCE)} className={`flex-1 py-2 rounded-md font-bold uppercase tracking-wider text-[10px] ${currentContext === ValidationContext.EXPERIENCE ? 'bg-indigo-600 text-white' : 'text-gray-500'}`}><i className="fas fa-play mr-1"></i> 体验模式</button>
        </div>
      </div>

      {/* 2. Tabs */}
      <div className="flex bg-gray-950 border-b border-gray-800 shrink-0">
        {currentContext === ValidationContext.CREATION ? (
          <>
            <button onClick={() => setActiveTab('world')} className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider ${activeTab === 'world' ? 'text-green-400 bg-gray-900/50 border-b-2 border-green-500' : 'text-gray-500'}`}><i className="fas fa-globe mr-1"></i> 世界</button>
            <button onClick={() => setActiveTab('director')} className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider ${activeTab === 'director' ? 'text-purple-400 bg-gray-900/50 border-b-2 border-purple-500' : 'text-gray-500'}`}><i className="fas fa-video mr-1"></i> 导演</button>
            <button onClick={() => setActiveTab('assets')} className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider ${activeTab === 'assets' ? 'text-cyan-400 bg-gray-900/50 border-b-2 border-cyan-500' : 'text-gray-500'}`}><i className="fas fa-boxes mr-1"></i> 资产</button>
          </>
        ) : (
          <>
            <button onClick={() => setActiveTab('experience')} className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider ${activeTab === 'experience' ? 'text-indigo-400 bg-gray-900/50 border-b-2 border-indigo-500' : 'text-gray-500'}`}><i className="fas fa-gamepad mr-1"></i> 游玩</button>
            <button onClick={() => setActiveTab('stats')} className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider ${activeTab === 'stats' ? 'text-orange-400 bg-gray-900/50 border-b-2 border-orange-500' : 'text-gray-500'}`}><i className="fas fa-chart-line mr-1"></i> 统计</button>
          </>
        )}
      </div>

      {/* 3. Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-6">

        {/* === WORLD === */}
        {activeTab === 'world' && (
          <>
            <section className="space-y-3">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest"><i className="fas fa-mountain text-orange-500 mr-2"></i> 地形编辑 (Terraform)</h3>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={handleCreateMountain} disabled={isGenerating} className="py-3 bg-gray-800 text-gray-300 rounded border border-gray-700 hover:bg-gray-700"><i className="fas fa-chevron-up mr-2"></i> 隆起 (Raise)</button>
                <button onClick={handleCreateValley} disabled={isGenerating} className="py-3 bg-gray-800 text-gray-300 rounded border border-gray-700 hover:bg-gray-700"><i className="fas fa-chevron-down mr-2"></i> 凹陷 (Lower)</button>
              </div>

              {/* Terrain Dimensions */}
              <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-800 space-y-4">
                <div>
                  <label className="text-gray-500 block mb-1 flex justify-between">
                    <span>宽度 (Width)</span>
                    <span className="text-cyan-400 font-mono">{terrainWidth}m</span>
                  </label>
                  <input
                    type="range" min="10" max="500" step="10"
                    value={terrainWidth}
                    onChange={(e) => dispatch(EngineCommandType.SET_TERRAIN_SIZE, { width: parseFloat(e.target.value), depth: terrainDepth })}
                    className="w-full accent-orange-500"
                  />
                </div>
                <div>
                  <label className="text-gray-500 block mb-1 flex justify-between">
                    <span>深度 (Depth)</span>
                    <span className="text-cyan-400 font-mono">{terrainDepth}m</span>
                  </label>
                  <input
                    type="range" min="10" max="500" step="10"
                    value={terrainDepth}
                    onChange={(e) => dispatch(EngineCommandType.SET_TERRAIN_SIZE, { width: terrainWidth, depth: parseFloat(e.target.value) })}
                    className="w-full accent-orange-500"
                  />
                </div>
              </div>

              <button onClick={handleFlattenTerrain} disabled={isGenerating} className="w-full py-2 bg-gray-800 text-gray-400 text-[10px] rounded border border-gray-700 hover:bg-gray-700">平整地形 (Flatten)</button>
            </section>

            <section className="space-y-3">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest"><i className="fas fa-seedling text-green-500 mr-2"></i> 生态系统 (Ecosystem)</h3>
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-500 block mb-1">缩放 (Scale)</label>
                    <input type="range" min="0.1" max="3" step="0.1" value={grassScale} onChange={(e) => handleGrassScaleChange(parseFloat(e.target.value))} className="w-full accent-green-500" />
                  </div>
                  <div>
                    <label className="text-gray-500 block mb-1">风力 (Wind)</label>
                    <input type="range" min="0" max="1" step="0.01" value={windStrength} onChange={(e) => handleWindStrengthChange(parseFloat(e.target.value))} className="w-full accent-green-500" />
                  </div>
                </div>

                <div className="flex bg-gray-900 rounded-lg p-0.5">
                  <button onClick={() => setActiveVegType('grass')} className={`flex-1 py-1 text-[9px] uppercase font-bold rounded ${activeVegType === 'grass' ? 'bg-green-600 text-white' : 'text-gray-500'}`}>草丛 (Grass)</button>
                  <button onClick={() => setActiveVegType('flower')} className={`flex-1 py-1 text-[9px] uppercase font-bold rounded ${activeVegType === 'flower' ? 'bg-pink-600 text-white' : 'text-gray-500'}`}>花朵 (Flowers)</button>
                </div>

                <div className="flex gap-2">
                  {(activeVegType === 'grass' ? ['#7cba3d', '#a8d96e', '#d4b86a', '#3f6b2b'] : ['#ff69b4', '#ff1493', '#da70d6', '#ffb6c1']).map(c => (
                    <button key={c} onClick={() => handleVegetationColorChange(c)} className={`flex-1 h-6 rounded border ${(activeVegType === 'grass' ? grassColor : flowerColor) === c ? 'border-white' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                  ))}
                </div>

                <button onClick={handleSpawnVegetation} disabled={isGenerating} className={`w-full py-2 font-bold rounded shadow-lg text-white ${activeVegType === 'grass' ? 'bg-green-600 hover:bg-green-500' : 'bg-pink-600 hover:bg-pink-500'}`}>
                  {isGenerating ? '生成中...' : (activeVegType === 'grass' ? '生成草丛 (Spawn Grass - 5000)' : '种植花朵 (Plant Flowers - 500)')}
                </button>
                <button onClick={handleClearVegetation} className="w-full text-red-400 text-[10px] uppercase font-bold hover:text-red-300">清除所有植被 (Clear All)</button>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest"><i className="fas fa-cubes text-blue-500 mr-2"></i> 物理系统 (Physics)</h3>
              <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-800 space-y-4">
                <div className="space-y-2">
                  <button onClick={handleSpawnPhysicsCube} className="w-full py-2 bg-blue-900/30 rounded border border-blue-500/30 text-blue-300 font-bold hover:bg-blue-900/50 shadow-lg shadow-blue-500/10">
                    <i className="fas fa-cube mr-2"></i> 生成蓝色重力方块 (Gravity Cube)
                  </button>
                  <button onClick={handleExplosionTest} className="w-full py-2 bg-red-900/30 rounded border border-red-900/50 text-red-400 hover:bg-red-900/50">测试爆炸 (Test Explosion)</button>
                </div>
                <div>
                  <label className="text-gray-500 block mb-1">重力 (Gravity Y)</label>
                  <input type="range" min="-20" max="0" step="0.1" value={gravityY} onChange={(e) => handleGravityChange(parseFloat(e.target.value))} className="w-full accent-blue-500" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">物理调试 (Physics Debug)</span>
                  <input type="checkbox" checked={physicsDebugEnabled} onChange={(e) => handlePhysicsDebugChange(e.target.checked)} className="accent-blue-500" />
                </div>
              </div>
            </section>

            {/* 4. Hierarchy (Entity Selection) */}
            <section className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">实体层级 (Hierarchy)</h3>
                <span className="text-[9px] font-mono text-gray-600">{manager.getEntityManager().getAllEntities().length} ACTIVE</span>
              </div>
              <div className="bg-gray-900/30 border border-gray-800/50 rounded-xl max-h-[200px] overflow-y-auto no-scrollbar p-1">
                {manager.getEntityManager().getAllEntities().map(e => (
                  <div
                    key={e.id}
                    onClick={() => {
                      setSelectedEntity(e.id);
                      dispatch(EngineCommandType.SELECT_ENTITY, { entityId: e.id });
                    }}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all mb-1 ${selectedEntity === e.id ? 'bg-cyan-600/20 border border-cyan-500/40 text-cyan-400' : 'text-gray-500 hover:bg-gray-800'}`}
                  >
                    <div className="flex items-center gap-2">
                      <i className={`fas ${e.name.includes('Ghost') ? 'fa-ghost' : 'fa-cube'} text-[10px] opacity-50`}></i>
                      <span className="text-[10px] font-bold truncate max-w-[120px]">{e.name}</span>
                    </div>
                    <span className="text-[8px] font-mono opacity-30">{e.id.split('_').pop()}</span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* === DIRECTOR === */}
        {activeTab === 'director' && (
          <div className="space-y-6">
            <section className="space-y-3">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">大气环境 (Atmosphere)</h3>
              <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-800 space-y-4">
                <div>
                  <label className="text-gray-500 block mb-1 flex justify-between"><span>时间 (Time)</span> <span className="text-white font-mono">{timeOfDay.toFixed(1)}h</span></label>
                  <input type="range" min="0" max="24" step="0.1" value={timeOfDay} onChange={(e) => handleTimeOfDayChange(parseFloat(e.target.value))} className="w-full accent-orange-500" />
                </div>
                <div>
                  <label className="text-gray-500 block mb-1">光照强度 (Sun Intensity)</label>
                  <input type="range" min="0" max="5" step="0.1" value={sunIntensity} onChange={(e) => handleSunIntensityChange(parseFloat(e.target.value))} className="w-full accent-yellow-500" />
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest"><i className="fas fa-ghost text-purple-500 mr-2"></i> 阴影调优 (Shadow Tuning)</h3>
              <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-800 space-y-4">
                <div>
                  <label className="text-gray-500 block mb-1 flex justify-between">
                    <span>覆盖范围 (Range)</span>
                    <span className="text-purple-400 font-mono text-[9px]">{shadowDistance <= 0 ? 'AUTO (ASA)' : `${shadowDistance}m`}</span>
                  </label>
                  <input
                    type="range" min="-100" max="2000" step="100" // -100 to 0 is Auto Zone
                    value={shadowDistance < 0 ? -100 : shadowDistance}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      handleShadowDistanceChange(v <= 0 ? -1 : v);
                    }}
                    className="w-full accent-purple-500"
                  />
                  <div className="text-[8px] text-gray-600 mt-1">拉到最左开启自适应 (Auto)，向右强制扩大范围</div>
                </div>
                <div>
                  <label className="text-gray-500 block mb-1 flex justify-between"><span>偏移 (Bias)</span> <span className="text-purple-400 font-mono text-[9px]">{shadowBias.toFixed(6)}</span></label>
                  <input type="range" min="-0.001" max="0.001" step="0.00001" value={shadowBias} onChange={(e) => handleShadowBiasChange(parseFloat(e.target.value))} className="w-full accent-purple-500" />
                  <div className="text-[8px] text-gray-600 mt-1">解决悬浮 (Too High) 或 波纹 (Too Low)</div>
                </div>
                <div>
                  <label className="text-gray-500 block mb-1 flex justify-between"><span>法线偏移 (Normal Bias)</span> <span className="text-purple-400 font-mono text-[9px]">{shadowNormalBias.toFixed(4)}</span></label>
                  <input type="range" min="0" max="0.2" step="0.001" value={shadowNormalBias} onChange={(e) => handleShadowNormalBiasChange(parseFloat(e.target.value))} className="w-full accent-purple-500" />
                </div>
                <div>
                  <label className="text-gray-500 block mb-1 flex justify-between"><span>不透明度 (Opacity)</span> <span className="text-purple-400 font-mono text-[9px]">{Math.round(shadowOpacity * 100)}%</span></label>
                  <input type="range" min="0" max="1" step="0.05" value={shadowOpacity} onChange={(e) => handleShadowOpacityChange(parseFloat(e.target.value))} className="w-full accent-purple-500" />
                </div>
                <div>
                  <label className="text-gray-500 block mb-1 flex justify-between"><span>模糊 (Blur Radius)</span> <span className="text-purple-400 font-mono text-[9px]">{shadowRadius}</span></label>
                  <input type="range" min="0" max="10" step="0.5" value={shadowRadius} onChange={(e) => handleShadowRadiusChange(parseFloat(e.target.value))} className="w-full accent-purple-500" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">颜色倾向 (Tint)</span>
                  <input type="color" value={shadowColor} onChange={handleShadowColorChange} className="w-8 h-4 rounded cursor-pointer border-none" />
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">后处理 (Post Processing)</h3>
              <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-800 space-y-4">
                <div>
                  <label className="text-gray-500 block mb-1">辉光强度 (Bloom Strength)</label>
                  <input type="range" min="0" max="3" step="0.1" value={bloomStrength} onChange={(e) => handleBloomStrengthChange(parseFloat(e.target.value))} className="w-full accent-pink-500" />
                </div>
                <div>
                  <label className="text-gray-500 block mb-1">辉光阈值 (Bloom Threshold)</label>
                  <input type="range" min="0" max="1" step="0.05" value={bloomThreshold} onChange={(e) => handleBloomThresholdChange(parseFloat(e.target.value))} className="w-full accent-pink-500" />
                </div>
                <div>
                  <label className="text-gray-500 block mb-1">曝光 (Exposure)</label>
                  <input type="range" min="0" max="5" step="0.1" value={exposure} onChange={(e) => handleExposureChange(parseFloat(e.target.value))} className="w-full accent-gray-500" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">SMAA 抗锯齿 (Anti-Aliasing)</span>
                  <input type="checkbox" checked={smaaEnabled} onChange={(e) => handleSMAAChange(e.target.checked)} className="accent-green-500" />
                </div>
              </div>
            </section>
          </div>
        )}

        {/* === ASSETS === */}
        {activeTab === 'assets' && (
          <div className="space-y-6">
            {/* 1. Asset Navigation Header (Tabs + Dynamic Import + View Switches) */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {/* Categorized Tabs */}
                <div className="flex-grow flex bg-gray-900/50 rounded-xl p-1 border border-gray-800 backdrop-blur-md">
                  {(['all', 'models', 'textures', 'audio', 'environments'] as const).map(tab => (
                    <div key={tab} className="relative flex-1">
                      <button
                        onClick={() => setActiveAssetTab(tab)}
                        className={`w-full py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all duration-300 flex items-center justify-center ${activeAssetTab === tab ? 'text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/40'}`}
                      >
                        <i className={`fas ${tab === 'all' ? 'fa-folder-open' :
                          tab === 'models' ? 'fa-cube' :
                            tab === 'textures' ? 'fa-image' :
                              tab === 'audio' ? 'fa-music' : 'fa-mountain'
                          } text-cyan-500 mr-2`}></i>
                        <span className="font-bold tracking-widest text-[9px] uppercase hidden sm:inline">
                          {tab === 'all' ? '全部' :
                            tab === 'models' ? '模型' :
                              tab === 'textures' ? '贴图' :
                                tab === 'audio' ? '音频' : '环境'}
                        </span>
                      </button>
                      {/* Active Indicator */}
                      {activeAssetTab === tab && (
                        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.8)]"></div>
                      )}
                    </div>
                  ))}
                </div>

                {/* View Mode Switches */}
                <div className="flex bg-gray-900/80 rounded-xl p-1 border border-gray-800">
                  {(['grid', 'compact', 'list'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setAssetViewMode(mode)}
                      className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${assetViewMode === mode ? 'text-cyan-400 bg-cyan-950/30' : 'text-gray-600 hover:text-gray-400'}`}
                      title={`${mode.charAt(0).toUpperCase() + mode.slice(1)} View`}
                    >
                      <i className={`fas ${mode === 'grid' ? 'fa-th-large' : mode === 'list' ? 'fa-list' : 'fa-th'} text-[10px]`}></i>
                    </button>
                  ))}
                </div>
              </div>

              {/* Asset Import Controls (Adaptive & Restoration) */}
              <div className="flex gap-2 items-center">
                <div className="flex-grow">
                  {activeAssetTab === 'all' ? (
                    /* 📁 文件夹/批量导入 (Merged Restoration) */
                    <button
                      onClick={async () => {
                        if (!manager) return;
                        setIsLoading(true);
                        setLoadingText('Scanning Folder...');
                        try {
                          const dirHandle = await FileSystemService.selectDirectory();
                          if (dirHandle) {
                            const files = await FileSystemService.scanDirectory(dirHandle);
                            if (files.length > 0) {
                              setLoadingText(`Importing ${files.length} assets...`);
                              await FileSystemService.batchImport(files, manager.getAssetRegistry(), (p) => {
                                setLoadingText(`Importing... ${p.current}/${p.total}`);
                              });
                              setNotification({ message: `成功导入 ${files.length} 个资产`, type: 'success' });
                            }
                          }
                        } catch (err) {
                          console.error('Folder Import Error:', err);
                          setNotification({ message: '文件夹导入失败', type: 'error' });
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                      className="w-full py-2 bg-indigo-900/30 rounded border border-indigo-500/30 text-[10px] text-indigo-300 font-bold hover:bg-indigo-900/50 shadow-lg shadow-indigo-500/10 flex items-center justify-center cursor-pointer transition-all"
                    >
                      <i className="fas fa-folder-plus mr-2"></i> 文件夹批量导入 (Batch Folder Import)
                    </button>
                  ) : (
                    /* 📄 单选导入 (Adaptive) */
                    <label htmlFor="asset_upload" className="w-full py-2 bg-cyan-900/30 rounded border border-cyan-500/30 text-[10px] text-cyan-300 font-bold hover:bg-cyan-900/50 shadow-lg shadow-cyan-500/10 flex items-center justify-center cursor-pointer transition-all">
                      <i className="fas fa-upload mr-2"></i>
                      {activeAssetTab === 'models' ? '导入模型 (Import Model)' :
                        activeAssetTab === 'audio' ? '导入音频 (Import Audio)' :
                          activeAssetTab === 'environments' ? '导入 HDR (Import HDR)' : '导入贴图 (Import Texture)'}
                      <input
                        type="file"
                        id="asset_upload"
                        className="hidden"
                        multiple
                        accept={
                          activeAssetTab === 'models' ? '.glb,.gltf' :
                            activeAssetTab === 'textures' ? '.png,.jpg,.jpeg,.webp' :
                              activeAssetTab === 'audio' ? '.mp3,.wav,.ogg' :
                                activeAssetTab === 'environments' ? '.hdr' : '*'
                        }
                        onChange={(e) => handleAssetImport(e, activeAssetTab)}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* 🔥 Audio Sub-Category Filter (Restoration) */}
              {activeAssetTab === 'audio' && (
                <div className="flex flex-wrap gap-1 mt-2 animate-in fade-in slide-in-from-top-1 duration-300">
                  {['all', 'bgm', 'sfx', 'voice', 'ambient', 'general'].map(sub => (
                    <button
                      key={sub}
                      onClick={() => setAudioSubFilter(sub)}
                      className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-tight transition-all border ${audioSubFilter === sub
                        ? 'bg-cyan-500 text-white border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                        : 'bg-gray-900/50 text-gray-500 border-gray-800 hover:text-gray-300 hover:border-gray-700'
                        }`}
                    >
                      {sub === 'all' ? '全部 (ALL)' :
                        sub === 'bgm' ? '音乐 (BGM)' :
                          sub === 'sfx' ? '音效 (SFX)' :
                            sub === 'voice' ? '配音 (VOICE)' :
                              sub === 'ambient' ? '环境 (AMB)' : '通用 (GEN)'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Asset Registry Dashboard */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-[10px] text-gray-500 px-1">
                <div className="flex items-center gap-2">
                  <span className="font-black uppercase tracking-[0.2em] leading-none text-gray-700">Registry</span>
                  <div className="h-2 w-2 rounded-full bg-cyan-500/50 animate-pulse"></div>
                </div>
                <div className="flex items-center gap-2 font-mono text-[9px]">
                  <span className="opacity-30">SNAPSHOT_SYNC_0.8s</span>
                  <span className="bg-gray-900 px-2 py-0.5 rounded border border-gray-800 text-cyan-400">{stats.assetCount}</span>
                </div>
              </div>

              <div className={`max-h-[480px] overflow-y-auto no-scrollbar pr-1 pb-10 transition-all duration-500 ${assetViewMode === 'grid' ? 'grid grid-cols-2 gap-3' :
                assetViewMode === 'compact' ? 'grid grid-cols-4 gap-2' :
                  'flex flex-col gap-1'
                }`}>
                {/* 🔥 Optimization: Use memoized sub-component to isolate item rendering */}
                {visibleAssets.map((asset) => (
                  <AssetItem
                    key={asset.id}
                    asset={asset}
                    assetViewMode={assetViewMode}
                    playingAudioId={playingAudioId}
                    onAssetClick={handleAssetClick}
                    onContextMenu={handleAssetContextMenu}
                    onDelete={handleAssetDelete}
                    onExport={handleModelExport}
                    setPlayingAudioId={setPlayingAudioId}
                    dispatch={dispatch}
                    isLooping={isLooping}
                    manager={manager}
                    revision={refreshRevision}
                  />
                ))}

                {visibleAssets.length === 0 && (
                  <div className={`${assetViewMode === 'grid' ? 'col-span-2' : assetViewMode === 'compact' ? 'col-span-4' : ''} py-20 flex flex-col items-center justify-center text-gray-700 bg-gray-950/40 rounded-3xl border-2 border-dashed border-gray-900/50 backdrop-blur-sm`}>
                    <div className="relative mb-4">
                      <i className="fas fa-ghost text-4xl opacity-10"></i>
                      <div className="absolute -top-1 -right-1 h-3 w-3 bg-cyan-500/20 rounded-full animate-ping"></div>
                    </div>
                    <span className="text-[10px] uppercase font-black tracking-[0.4em] opacity-30">Registry Empty</span>
                    <span className="text-[8px] mt-2 opacity-10 italic">SYNC_STATUS: IDLE // SCANNING_FAIL</span>
                  </div>
                )}
              </div>

              {/* 4. Global Scene Actions (Refined) */}
              <div className="pt-6 border-t border-gray-900/50 grid grid-cols-2 gap-4" >
                <button
                  onClick={() => document.getElementById('import_pfb')?.click()}
                  className="group relative py-3 bg-indigo-950/20 border border-indigo-500/20 text-indigo-400 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-900/30 transition-all flex items-center justify-center overflow-hidden"
                >
                  <div className="absolute inset-x-0 h-[1px] top-0 bg-indigo-400/20"></div>
                  <i className="fas fa-dna mr-2 group-hover:rotate-180 transition-transform duration-700"></i> 生态包导入 (.pfb)
                </button>
                <button
                  onClick={handleExportBundle}
                  className="group relative py-3 bg-gray-900/40 border border-gray-800 text-gray-500 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:text-white hover:bg-gray-800/60 transition-all flex items-center justify-center"
                >
                  <i className="fas fa-download mr-2 group-hover:translate-y-0.5 transition-transform"></i> 全量导出
                </button>
                <input type="file" id="import_pfb" accept=".pfb" className="hidden" onChange={handleImportBundle} />
              </div>
            </div>
          </div>
        )}

        {/* === EXPERIENCE === */}
        {
          activeTab === 'experience' && (
            <div className="space-y-6">
              <section className="space-y-3">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">相机预设 (Camera Presets)</h3>
                <div className="grid grid-cols-2 gap-2">
                  {manager?.getCameraSystem().presetManager?.getAllPresets().map(p => {
                    // Check if preset requires target and if target exists
                    const requiresTarget = p.bindTarget;
                    const hasTarget = !!manager?.getEntityManager().getAllEntities().find(e => e.name === 'Player');
                    const isDisabled = requiresTarget && !hasTarget;

                    return (
                      <button
                        key={p.id}
                        disabled={isDisabled}
                        title={isDisabled ? "需先生成角色 (Spawn Character First)" : p.description}
                        onClick={() => handlePresetChange(p.id)}
                        className={`py-3 rounded border font-bold text-[9px] uppercase flex flex-col items-center gap-1 transition-all ${activePreset === p.id
                          ? 'bg-cyan-600 text-white border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                          : isDisabled
                            ? 'bg-gray-900 text-gray-700 border-gray-800 cursor-not-allowed opacity-50'
                            : 'bg-gray-800 text-gray-500 border-gray-700 hover:bg-gray-750 hover:text-gray-300'}`}
                      >
                        {/* Icon Mapping based on ID */}
                        <i className={`fas ${p.id === 'iso' ? 'fa-cube' :
                          p.id === 'fps' ? 'fa-eye' :
                            p.id === 'tps' ? 'fa-user' :
                              'fa-arrows-alt-h'} text-[10px]`}></i>
                        {p.displayName}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">玩法配置 (Gameplay Config)</h3>
                <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-800 space-y-4">
                  <div>
                    <label className="text-gray-500 block mb-1">视场角 (FOV)</label>
                    <input type="range" min="30" max="120" value={fov} onChange={(e) => handleFovChange(parseFloat(e.target.value))} className="w-full accent-indigo-500" />
                  </div>
                  <div>
                    <label className="text-gray-500 block mb-1">俯仰角 (Pitch)</label>
                    <input type="range" min="-90" max="90" step="1" value={camPitch} onChange={(e) => dispatch(EngineCommandType.SET_CAMERA_PITCH, { pitch: parseFloat(e.target.value) })} className="w-full accent-indigo-500" />
                  </div>
                  <div>
                    <label className="text-gray-500 block mb-1">偏航角 (Yaw)</label>
                    <input type="range" min="-180" max="180" step="1" value={camYaw} onChange={(e) => dispatch(EngineCommandType.SET_CAMERA_YAW, { yaw: parseFloat(e.target.value) })} className="w-full accent-indigo-500" />
                  </div>
                  <div>
                    <label className="text-gray-500 block mb-1">距离 (Distance)</label>
                    <input type="range" min="0.1" max="100" step="0.5" value={camDistance} onChange={(e) => dispatch(EngineCommandType.SET_CAMERA_DISTANCE, { distance: parseFloat(e.target.value) })} className="w-full accent-indigo-500" />
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">角色参数 (Character Config)</h3>
                <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-800 space-y-4">
                  {/* Spawn/Despawn Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => dispatch(EngineCommandType.SPAWN_CHARACTER)}
                      className={`flex-1 py-2 border rounded transition-colors font-bold text-[10px] uppercase flex items-center justify-center gap-2 ${spawnButtonState === 'Bind'
                        ? 'bg-blue-900/40 border-blue-500/30 text-blue-400 hover:bg-blue-800/40'
                        : spawnButtonState === 'Unbind'
                          ? 'bg-yellow-900/40 border-yellow-500/30 text-yellow-400 hover:bg-yellow-800/40' // Yellow for Unbind (Release)
                          : 'bg-green-900/40 border-green-500/30 text-green-400 hover:bg-green-800/40' // Green for Spawn
                        }`}
                    >
                      <i className={`fas ${spawnButtonState === 'Bind' ? 'fa-link' :
                        spawnButtonState === 'Unbind' ? 'fa-unlink' :
                          'fa-user-plus'
                        }`}></i>
                      {spawnButtonState === 'Spawn' ? '生成 (Spawn)' : spawnButtonState === 'Bind' ? '锁定 (Bind)' : '释放 (Unbind)'}
                    </button>
                    <button
                      onClick={() => dispatch(EngineCommandType.DESPAWN_CHARACTER)}
                      className="flex-1 py-2 bg-red-900/40 border border-red-500/30 text-red-400 rounded hover:bg-red-800/40 transition-colors font-bold text-[10px] uppercase flex items-center justify-center gap-2"
                    >
                      <i className="fas fa-user-times"></i> 删除 (Delete)
                    </button>
                  </div>

                  {/* Flight Mode Toggle */}
                  <div className="flex items-center justify-between bg-gray-950/50 p-2 rounded">
                    <span className="text-gray-400 text-[10px] font-bold uppercase">飞行模式 (Flight Mode)</span>
                    <button
                      onClick={() => {
                        const newState = !flightMode;
                        setFlightMode(newState);
                        dispatch(EngineCommandType.TOGGLE_FLIGHT_MODE, { enabled: newState });
                      }}
                      className={`w-8 h-4 rounded-full transition-colors relative ${flightMode ? 'bg-cyan-600' : 'bg-gray-700'}`}
                    >
                      <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${flightMode ? '1.1rem' : '0.125rem'}`} style={{ left: flightMode ? '1.1rem' : '0.125rem' }}></div>
                    </button>
                  </div>

                  <div>
                    <label className="text-gray-500 block mb-1">移动速度 (Speed)</label>
                    <input type="range" min="1" max="50" value={moveSpeed} onChange={(e) => handleMoveSpeedChange(parseFloat(e.target.value))} className="w-full accent-green-500" />
                  </div>
                  <div>
                    <label className="text-gray-500 block mb-1">力度倍率 (Force Multiplier)</label>
                    <input type="range" min="1" max="100" value={forceMultiplier} onChange={(e) => handleForceMultiplierChange(parseFloat(e.target.value))} className="w-full accent-red-500" />
                  </div>
                </div>
              </section>
            </div>
          )
        }

        {/* === STATS === */}
        {
          activeTab === 'stats' && (
            <div className="space-y-4 font-mono text-gray-400">
              <div className="bg-gray-900 p-3 rounded border border-gray-800">
                <div className="text-white font-bold mb-2 border-b border-gray-700 pb-1">核心指标 (Core Metrics)</div>
                <div className="grid grid-cols-2 gap-y-1">
                  <span>实体 (Entities):</span> <span className="text-right text-green-400">{stats.entityCount}</span>
                  <span>系统 (Systems):</span> <span className="text-right text-green-400">{stats.systemCount}</span>
                  <span>植被 (Veg):</span> <span className="text-right text-green-400">{stats.vegetationCount}</span>
                  <span>顶点 (Verts):</span> <span className="text-right text-green-400">{stats.terrainVertices.toLocaleString()}</span>
                  <span>刚体 (Bodies):</span> <span className="text-right text-green-400">{stats.physicsBodies}</span>
                </div>
              </div>

              <div className="bg-gray-900 p-3 rounded border border-gray-800">
                <div className="text-white font-bold mb-2 border-b border-gray-700 pb-1">指令日志 (Command Log)</div>
                <div className="space-y-1 opacity-70">
                  {stats.undoHistory.length === 0 ? <div className="italic text-gray-600">无记录 (No history)</div> : stats.undoHistory.map((cmd, i) => (
                    <div key={i} className="text-[10px] truncate border-l-2 border-blue-500 pl-2 mb-1">
                      {cmd.type}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        }

      </div>

      {/* Footer Log (Collapsed by default, maybe show last command) */}
      <div className="h-6 bg-gray-950 border-t border-gray-900 text-[10px] text-gray-600 px-2 flex items-center select-none" >
        <span className="font-bold mr-2">最新指令 (LAST CMD):</span> {stats.lastCommand || '就绪 (READY)'}
      </div>

      {/* --- UX Overlays --- */}

      {/* 1. Loading Overlay */}
      {
        isLoading && (
          <div className="absolute inset-0 bg-gray-950/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-fadeIn">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <span className="text-indigo-400 font-bold tracking-widest text-[10px] uppercase animate-pulse">{loadingText}</span>
          </div>
        )
      }

      {/* 2. Confirmation Modal */}
      {
        showConfirm && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-fadeIn">
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 shadow-2xl max-w-sm w-full">
              <h3 className="text-orange-500 font-bold uppercase tracking-wider mb-2 flex items-center">
                <i className="fas fa-exclamation-triangle mr-2"></i> 警告 (Warning)
              </h3>
              <p className="text-gray-300 text-[11px] mb-6 whitespace-pre-line leading-relaxed">
                {showConfirm?.message}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowConfirm(null)}
                  className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded text-[10px] font-bold uppercase"
                >
                  取消 (Cancel)
                </button>
                <button
                  onClick={() => {
                    showConfirm?.onConfirm();
                    setShowConfirm(null);
                  }}
                  className="flex-1 py-2 bg-red-900/50 hover:bg-red-800/50 border border-red-500/30 text-red-400 rounded text-[10px] font-bold uppercase"
                >
                  确认 (Confirm)
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* 3. Notification Toast */}
      {
        notification && (
          <div className={`absolute top-16 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full shadow-xl border backdrop-blur-md flex items-center gap-2 animate-slideDown z-50 ${notification?.type === 'success' ? 'bg-green-900/80 border-green-500/50 text-green-300' :
            notification?.type === 'error' ? 'bg-red-900/80 border-red-500/50 text-red-300' :
              'bg-blue-900/80 border-blue-500/50 text-blue-300'
            }`}>
            <i className={`fas ${notification?.type === 'success' ? 'fa-check-circle' :
              notification?.type === 'error' ? 'fa-times-circle' : 'fa-info-circle'
              }`}></i>
            <span className="text-[10px] font-bold">{notification?.message}</span>
          </div>
        )
      }

      {/* 🔥 Universal HUD Progress Overlay (The Neural Sync) */}
      {
        bundleProgress && (
          <div className="absolute inset-x-0 bottom-6 px-4 py-3 bg-black/80 backdrop-blur-md border-t border-cyan-500/30 flex flex-col gap-2 z-[100] animate-in fade-in slide-in-from-bottom-5 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
            <div className="flex justify-between items-end">
              <div className="flex flex-col">
                <span className="text-[8px] text-cyan-400 font-black uppercase tracking-[0.2em]">{bundleProgress?.step}</span>
                <span className="text-[10px] text-white font-bold opacity-80">{bundleProgress?.assetName}</span>
              </div>
              <span className="text-[10px] font-mono text-cyan-400">{Math.round((bundleProgress?.progress || 0) * 100)}%</span>
            </div>
            <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-500 transition-all duration-300 shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                style={{ width: `${(bundleProgress?.progress || 0) * 100}%` }}
              ></div>
            </div>
          </div>
        )
      }

      {/* 🚀 Placement HUD removed as requested - pure composition view enabled */}



      {/* 📊 Model Audit Card (WYSIWYG Inspector) */}
      {
        selectedEntity && currentContext === ValidationContext.CREATION && !placementState.isPlacing && (
          <div className={`absolute right-[400px] bottom-6 w-64 bg-gray-950/90 border ${isEditingCollider ? 'border-orange-500/50 shadow-orange-500/10' : 'border-blue-500/30'} rounded-2xl p-4 shadow-2xl backdrop-blur-xl animate-fadeIn z-40 transition-all duration-500`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl ${isEditingCollider ? 'bg-orange-500/10 border-orange-500/20' : 'bg-blue-500/10 border-blue-500/20'} border flex items-center justify-center transition-colors`}>
                <i className={`fas ${isEditingCollider ? 'fa-pen-ruler text-orange-400' : 'fa-microchip text-blue-400'}`}></i>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center justify-between w-[160px]">
                  <span className={`text-[10px] ${isEditingCollider ? 'text-orange-400' : 'text-blue-400'} font-black uppercase tracking-widest transition-colors`}>
                    {isEditingCollider ? '碰撞编辑 (Collider)' : '模型审计 (Audit)'}
                  </span>
                  <button
                    onClick={() => {
                      setSelectedEntity(null);
                      dispatch(EngineCommandType.SELECT_ENTITY, { entityId: null });
                    }}
                    className="text-gray-600 hover:text-white transition-colors"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
                <span className="text-white font-bold text-xs truncate max-w-[140px] transition-all">{selectedEntity}</span>
              </div>
            </div>

            {/* 🔥 Collider Editing Mode Switch */}
            <div className={`flex items-center justify-between p-2 rounded-lg mb-3 border transition-all ${isEditingCollider ? 'bg-orange-950/20 border-orange-500/30' : 'bg-gray-900/50 border-gray-800'}`}>
              <div className="flex flex-col">
                <span className={`text-[9px] font-black uppercase ${isEditingCollider ? 'text-orange-400' : 'text-gray-500'}`}>编辑碰撞盒 (Edit)</span>
                <span className="text-[7px] text-gray-600 font-mono tracking-tighter">GRAB/ROT TARGET: COLLIDER</span>
              </div>
              <button
                onClick={() => {
                  const next = !isEditingCollider;
                  setIsEditingCollider(next);
                  dispatch(EngineCommandType.TOGGLE_COLLIDER_EDITING, { enabled: next });
                }}
                className={`w-10 h-5 rounded-full relative transition-all duration-300 ${isEditingCollider ? 'bg-orange-600 shadow-[0_0_10px_rgba(234,88,12,0.5)]' : 'bg-gray-800'}`}
              >
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300 ${isEditingCollider ? 'left-6' : 'left-1'}`}></div>
              </button>
            </div>

            <div className="space-y-2">
              {manager && (
                <EntityDetailsSection
                  selectedEntity={selectedEntity}
                  manager={manager}
                  dispatch={dispatch}
                  revision={revision}
                />
              )}

              {/* 🔥 isEditingCollider: Advanced Controls */}

              {isEditingCollider && (
                <div className="space-y-3 mt-2 pt-2 border-t border-dashed border-gray-800 animate-in fade-in slide-in-from-top-1 duration-200">

                  {/* Quick Actions */}
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        dispatch(EngineCommandType.AUTO_FIT_COLLIDER, { entityId: selectedEntity });
                      }}
                      className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-[9px] font-bold border border-gray-700 transition-colors"
                    >
                      <i className="fas fa-magic mr-1"></i> 一键贴合 (Auto-Fit)
                    </button>
                    <span className="text-[8px] text-gray-500 italic">
                      按 <span className="text-orange-400 font-bold">G</span> 后用 <span className="text-white font-bold">W/S</span> 调整高度
                    </span>
                  </div>

                  {/* Scale */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-orange-400 font-bold uppercase tracking-tight">整体缩放 (Scale)</span>
                      <span className="text-orange-400 font-mono text-[10px]">{colliderScale.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="5.0"
                      step="0.05"
                      value={colliderScale}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setColliderScale(val);
                        dispatch(EngineCommandType.SET_COLLIDER_SCALE, { scale: val });
                      }}
                      className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                    />
                  </div>

                  {/* Offset Y */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-orange-400 font-bold uppercase tracking-tight">垂直偏移 (Offset Y)</span>
                      <span className="text-orange-400 font-mono text-[10px]">{colliderOffsetY.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="-10.0"
                      max="10.0"
                      step="0.05"
                      value={colliderOffsetY}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setColliderOffsetY(val);
                        dispatch(EngineCommandType.SET_COLLIDER_OFFSET_Y, { offset: val });
                      }}
                      className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                    />
                  </div>

                  {/* Rotation Y */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-orange-400 font-bold uppercase tracking-tight">Y轴旋转 (Rotation Y)</span>
                      <span className="text-orange-400 font-mono text-[10px]">{Math.round(colliderRotation * 57.29)}°</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="6.28"
                      step="0.1"
                      value={colliderRotation}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setColliderRotation(val);
                        dispatch(EngineCommandType.SET_COLLIDER_ROTATION_Y, { rotation: val });
                      }}
                      className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                    />
                  </div>

                  {/* Save Button */}
                  <button
                    onClick={() => {
                      if (confirm('确认保存此物理配置为默认设置？这将影响未来放置的所有相同资产。')) {
                        dispatch(EngineCommandType.SAVE_ASSET_PHYSICS_CONFIG, {});
                        setNotification({ message: '物理配置已保存', type: 'success' });
                      }
                    }}
                    className="w-full py-1.5 bg-orange-900/40 hover:bg-orange-800/60 border border-orange-500/30 text-orange-200 rounded text-[9px] font-bold uppercase transition-all flex items-center justify-center gap-2 group"
                  >
                    <i className="fas fa-save group-hover:scale-110 transition-transform"></i>
                    保存为默认 (Save Defaults)
                  </button>

                </div>
              )}

              {/* 🔥 Transform 编辑区 - 新增 */}
              {!isEditingCollider && (
                <div className="space-y-3 mt-2 pt-2 border-t border-dashed border-gray-800 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-tight">变换配置 (Transform)</span>
                    <span className="text-[7px] text-gray-500 font-mono italic">SCALE & ROTATION</span>
                  </div>

                  {/* Transform Info Display */}
                  <div className="space-y-1 bg-gray-900/50 p-2 rounded">
                    <div className="flex justify-between text-[9px]">
                      <span className="text-gray-500">缩放 (Scale)</span>
                      <span className="text-cyan-400 font-mono">{manager?.getEntityManager().getEntity(selectedEntity!)?.getComponent<TransformComponent>('Transform')?.scale[0].toFixed(2)}x</span>
                    </div>
                    <div className="flex justify-between text-[9px]">
                      <span className="text-gray-500">旋转 X (Rotation X)</span>
                      <span className="text-cyan-400 font-mono">{Math.round(manager?.getEntityManager().getEntity(selectedEntity!)?.getComponent<TransformComponent>('Transform')?.rotation[0] || 0)}°</span>
                    </div>
                    <div className="flex justify-between text-[9px]">
                      <span className="text-gray-500">旋转 Y (Rotation Y)</span>
                      <span className="text-cyan-400 font-mono">{Math.round(manager?.getEntityManager().getEntity(selectedEntity!)?.getComponent<TransformComponent>('Transform')?.rotation[1] || 0)}°</span>
                    </div>
                    <div className="flex justify-between text-[9px]">
                      <span className="text-gray-500">旋转 Z (Rotation Z)</span>
                      <span className="text-cyan-400 font-mono">{Math.round(manager?.getEntityManager().getEntity(selectedEntity!)?.getComponent<TransformComponent>('Transform')?.rotation[2] || 0)}°</span>
                    </div>
                  </div>

                  {/* Save Button */}
                  <button
                    onClick={() => {
                      if (confirm('确认保存此变换配置为默认设置？这将影响未来放置的所有相同资产。')) {
                        dispatch(EngineCommandType.SAVE_ASSET_TRANSFORM, {});
                        setNotification({ message: '变换配置已保存', type: 'success' });
                      }
                    }}
                    className="w-full py-1.5 bg-cyan-900/40 hover:bg-cyan-800/60 border border-cyan-500/30 text-cyan-200 rounded text-[9px] font-bold uppercase transition-all flex items-center justify-center gap-2 group"
                  >
                    <i className="fas fa-save group-hover:scale-110 transition-transform"></i>
                    保存变换配置 (Save Transform)
                  </button>

                  <div className="text-[7px] text-gray-500 italic leading-relaxed">
                    💡 提示：使用 E/Q 键调整缩放，R 键旋转
                  </div>
                </div>
              )}

              <div className="h-px bg-gray-800 my-2"></div>

              {manager && (
                <button
                  onClick={() => {
                    if (confirm('确定要从世界中移除此实体吗？')) {
                      manager.handleDeleteSelectedEntity();
                      setSelectedEntity(null);
                    }
                  }}
                  className="w-full py-2 bg-red-900/30 hover:bg-red-800/50 border border-red-500/30 text-red-500 rounded text-[10px] font-bold uppercase transition-all mb-2"
                >
                  <i className="fas fa-trash-alt mr-2"></i> 物理移除 (Delete Entity)
                </button>
              )}

              <div className="text-[8px] text-gray-400 leading-relaxed italic opacity-60">
                "引擎审计通过。资产已就绪，可进行高保真部署。"
              </div>
            </div>
          </div>
        )
      }

      {/* 🚀 Context Menu for Reclassification */}
      {
        contextMenu && (
          <>
            <div className="fixed inset-0 z-[1000]" onClick={() => setContextMenu(null)}></div>
            <div
              className="fixed z-[1001] bg-gray-950/95 border border-cyan-500/30 rounded-lg shadow-2xl backdrop-blur-xl py-1 min-w-[120px] animate-in fade-in zoom-in duration-200"
              style={{ left: contextMenu?.x ?? 0, top: contextMenu?.y ?? 0 }}
            >
              <div className="px-3 py-1.5 border-b border-gray-800 mb-1">
                <span className="text-[7px] text-cyan-500 font-bold uppercase tracking-widest opacity-50">移动至 (MOVE TO)</span>
              </div>
              {[
                { id: 'bgm', label: '音乐 (BGM)', icon: 'fa-compact-disc' },
                { id: 'sfx', label: '音效 (SFX)', icon: 'fa-bolt' },
                { id: 'voice', label: '配音 (VOICE)', icon: 'fa-microphone' },
                { id: 'ambient', label: '环境 (AMBIENT)', icon: 'fa-tree' },
                { id: 'general', label: '通用 (GENERAL)', icon: 'fa-music' }
              ].map(item => (
                <button
                  key={item.id}
                  onClick={(e) => { e.stopPropagation(); handleReclassify(contextMenu.assetId, item.id); }}
                  className="w-full text-left px-3 py-1.5 text-[9px] text-gray-300 hover:bg-cyan-500/10 hover:text-cyan-400 flex items-center gap-2 transition-all"
                >
                  <i className={`fas ${item.icon} w-3 text-center`}></i>
                  {item.label}
                </button>
              ))}
              <div className="border-t border-gray-800 mt-1 pt-1">
                <button
                  onClick={(e) => { e.stopPropagation(); handleAssetDelete(contextMenu.assetId); setContextMenu(null); }}
                  className="w-full text-left px-3 py-1.5 text-[9px] text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                >
                  <i className="fas fa-trash w-3 text-center"></i>
                  删除资产 (Delete)
                </button>
              </div>
            </div>
          </>
        )
      }

    </div>
  );
};

