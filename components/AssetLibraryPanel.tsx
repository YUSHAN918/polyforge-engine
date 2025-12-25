
import React, { useState, useRef } from 'react';
import { CustomModel, AssetCategory, SavedCharacter, AssetSubCategory } from '../types';

interface AssetLibraryPanelProps {
    customModels: CustomModel[];
    savedCharacters?: SavedCharacter[];
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
    onCreate: (category: AssetCategory, subCategory?: AssetSubCategory) => void;
    onLoadCharacter?: (id: string) => void;
    onDeleteCharacter?: (id: string) => void;
    onImportData: (models: CustomModel[]) => void;
}

interface Notification {
    id: number;
    type: 'success' | 'error' | 'info';
    message: string;
}

// Logic Grouping Types
type MainGroup = 'profile' | 'gear' | 'body' | 'world';
type SubGroup =
    | 'weapon' | 'shield' | 'head_gear' | 'upper' | 'lower' | 'shoulder' | 'hand' | 'foot' // Gear
    | 'face' | 'hair' // Body
    | 'mob' | 'object'; // World

export const AssetLibraryPanel: React.FC<AssetLibraryPanelProps> = ({ customModels, savedCharacters = [], onEdit, onDelete, onCreate, onLoadCharacter, onDeleteCharacter, onImportData }) => {

    // State
    const [activeGroup, setActiveGroup] = useState<MainGroup>('profile');
    const [activeSubGroup, setActiveSubGroup] = useState<SubGroup>('weapon'); // Default for gear
    const [weaponFilter, setWeaponFilter] = useState<'all' | 'one_handed' | 'two_handed'>('all');
    const [headFilter, setHeadFilter] = useState<'all' | 'helm' | 'mask'>('all');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [notification, setNotification] = useState<Notification | null>(null);

    const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setNotification({ id: Date.now(), type, message });
        setTimeout(() => setNotification(null), 3000);
    };

    // --- CONFIGURATION ---
    const MENU_STRUCTURE = {
        profile: { label: '角色档案', icon: 'fa-id-card', defaultSub: null },
        gear: { label: '装备库', icon: 'fa-khanda', defaultSub: 'weapon' as SubGroup },
        body: { label: '外观构造', icon: 'fa-user-edit', defaultSub: 'face' as SubGroup },
        world: { label: '世界生态', icon: 'fa-globe', defaultSub: 'mob' as SubGroup },
    };

    const SUB_MENUS: Record<string, { id: SubGroup, label: string, icon: string }[]> = {
        gear: [
            { id: 'weapon', label: '武器', icon: 'fa-swords' },
            { id: 'shield', label: '盾牌', icon: 'fa-shield-alt' },
            { id: 'head_gear', label: '头部', icon: 'fa-helmet-safety' },
            { id: 'shoulder', label: '肩甲', icon: 'fa-user-shield' },
            { id: 'upper', label: '上装', icon: 'fa-shirt' },
            { id: 'hand', label: '护手', icon: 'fa-mitten' },
            { id: 'lower', label: '下装', icon: 'fa-socks' }, // Pants icon alternative
            { id: 'foot', label: '鞋靴', icon: 'fa-boot' },
        ],
        body: [
            { id: 'face', label: '面部与头型', icon: 'fa-smile' },
            { id: 'hair', label: '发型', icon: 'fa-user-injured' }, // Hair icon approx
        ],
        world: [
            { id: 'mob', label: '生物与怪物', icon: 'fa-dragon' },
            { id: 'object', label: '场景物件', icon: 'fa-tree' },
        ]
    };

    // --- FILTER LOGIC ---
    const filterAssets = () => {
        if (activeGroup === 'profile') return []; // Handled separately

        return customModels.filter(m => {
            // 1. GEAR GROUP
            if (activeGroup === 'gear') {
                if (activeSubGroup === 'weapon') {
                    if (m.category !== 'weapon') return false;
                    if (weaponFilter === 'all') return true;
                    return m.subCategory === weaponFilter;
                }
                if (activeSubGroup === 'shield') return m.category === 'shield';

                if (activeSubGroup === 'head_gear') {
                    const isHelm = m.category === 'helm';
                    const isMask = m.category === 'mask';
                    if (headFilter === 'all') return isHelm || isMask;
                    if (headFilter === 'helm') return isHelm;
                    if (headFilter === 'mask') return isMask;
                    return false;
                }

                if (activeSubGroup === 'shoulder') return m.category === 'character_part' && m.subCategory === 'upper_arm';
                if (activeSubGroup === 'upper') return m.category === 'character_part' && m.subCategory === 'chest';
                if (activeSubGroup === 'hand') return m.category === 'character_part' && (m.subCategory === 'forearm' || m.subCategory === 'hand');
                if (activeSubGroup === 'lower') return m.category === 'character_part' && (m.subCategory === 'hips' || m.subCategory === 'thigh' || m.subCategory === 'calf');
                if (activeSubGroup === 'foot') return m.category === 'character_part' && m.subCategory === 'foot';
            }

            // 2. BODY GROUP
            if (activeGroup === 'body') {
                if (activeSubGroup === 'hair') return m.category === 'character_part' && m.subCategory === 'hair';
                if (activeSubGroup === 'face') return m.category === 'character_part' && (m.subCategory === 'head' || m.subCategory === 'eye' || m.subCategory === 'mouth');
            }

            // 3. WORLD GROUP
            if (activeGroup === 'world') {
                if (activeSubGroup === 'mob') return m.category === 'mob';
                if (activeSubGroup === 'object') return m.category === 'map_object';
            }

            return false;
        });
    };

    const displayAssets = filterAssets();
    const displayCharacters = activeGroup === 'profile' ? savedCharacters : [];

    // --- CREATE HANDLER ---
    const handleCreateNew = () => {
        if (activeGroup === 'gear') {
            switch (activeSubGroup) {
                case 'weapon': onCreate('weapon', weaponFilter !== 'all' ? weaponFilter as any : 'one_handed'); break;
                case 'shield': onCreate('shield', 'shield'); break;
                case 'head_gear':
                    if (headFilter === 'mask') onCreate('mask', 'mask');
                    else onCreate('helm', 'helm');
                    break;
                case 'shoulder': onCreate('character_part', 'upper_arm'); break;
                case 'upper': onCreate('character_part', 'chest'); break;
                case 'hand': onCreate('character_part', 'forearm'); break; // Default to Forearm (Gauntlet)
                case 'lower': onCreate('character_part', 'hips'); break; // Default to Hips
                case 'foot': onCreate('character_part', 'foot'); break;
            }
        } else if (activeGroup === 'body') {
            switch (activeSubGroup) {
                case 'hair': onCreate('character_part', 'hair'); break;
                case 'face': onCreate('character_part', 'head'); break;
            }
        } else if (activeGroup === 'world') {
            switch (activeSubGroup) {
                case 'mob': onCreate('mob', 'small'); break;
                case 'object': onCreate('map_object', 'prop'); break;
            }
        }
    };

    // Helper for context menu creation (Specific types)
    const CreateButton = () => {
        // Special Multi-choice for composite tabs
        if (activeGroup === 'gear' && activeSubGroup === 'head_gear') {
            if (headFilter === 'helm') return <button onClick={() => onCreate('helm', 'helm')} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg flex items-center gap-2"><i className="fas fa-plus"></i> 新建头盔</button>;
            if (headFilter === 'mask') return <button onClick={() => onCreate('mask', 'mask')} className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-lg flex items-center gap-2"><i className="fas fa-plus"></i> 新建面饰</button>;

            return (
                <div className="flex gap-2">
                    <button onClick={() => onCreate('helm', 'helm')} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg flex items-center gap-2"><i className="fas fa-plus"></i> 头盔</button>
                    <button onClick={() => onCreate('mask', 'mask')} className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-lg flex items-center gap-2"><i className="fas fa-plus"></i> 面饰</button>
                </div>
            )
        }
        if (activeGroup === 'gear' && activeSubGroup === 'hand') {
            return (
                <div className="flex gap-2">
                    <button onClick={() => onCreate('character_part', 'forearm')} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg flex items-center gap-2" title="小臂护甲"><i className="fas fa-plus"></i> 护腕</button>
                    <button onClick={() => onCreate('character_part', 'hand')} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg flex items-center gap-2" title="手部模型"><i className="fas fa-plus"></i> 手套</button>
                </div>
            )
        }
        if (activeGroup === 'gear' && activeSubGroup === 'lower') {
            return (
                <div className="flex gap-2">
                    <button onClick={() => onCreate('character_part', 'hips')} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg flex items-center gap-2"><i className="fas fa-plus"></i> 髋/裙甲</button>
                    <button onClick={() => onCreate('character_part', 'thigh')} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg flex items-center gap-2"><i className="fas fa-plus"></i> 腿甲</button>
                </div>
            )
        }

        // Default Single Button
        const labelMap: Record<string, string> = {
            'weapon': '武器', 'shield': '盾牌', 'shoulder': '肩甲', 'upper': '胸甲', 'foot': '战靴',
            'hair': '发型', 'face': '头型', 'mob': '生物', 'object': '物件'
        };
        const label = labelMap[activeSubGroup] || '资产';

        return (
            <button onClick={handleCreateNew} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20">
                <i className="fas fa-plus"></i> 新建{label}
            </button>
        );
    };


    // --- EXPORT/IMPORT UTILS ---
    const handleExportAll = () => {
        try {
            const json = JSON.stringify(customModels, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `polyforge_assets_${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showNotification("已导出并下载文件！", 'success');
        } catch (e) {
            showNotification("导出失败", 'error');
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                const json = JSON.parse(text);
                let modelsToImport: CustomModel[] = Array.isArray(json) ? json : (json.id && json.parts ? [json] : []);
                if (modelsToImport.length > 0 && (!modelsToImport[0].id || !modelsToImport[0].parts)) throw new Error("Invalid model data");
                onImportData(modelsToImport);
                showNotification(`成功导入 ${modelsToImport.length} 个资产`, 'success');
            } catch (err) {
                showNotification("文件格式错误", 'error');
            }
        };
        reader.readAsText(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const getTypeIcon = (cat: string) => {
        switch (cat) {
            case 'character': return 'fa-user-astronaut';
            case 'character_part': return 'fa-puzzle-piece';
            case 'weapon': return 'fa-khanda';
            case 'shield': return 'fa-shield-alt';
            case 'helm': return 'fa-hard-hat';
            case 'mask': return 'fa-mask';
            case 'map_object': return 'fa-tree';
            case 'mob': return 'fa-dragon';
            default: return 'fa-cube';
        }
    };

    const getSubCatLabel = (model: CustomModel) => {
        const sub = model.subCategory;
        if (!sub || sub === 'none') return model.category;
        const labels: Record<string, string> = {
            'one_handed': '单手', 'two_handed': '双手',
            'structure': '建筑', 'prop': '道具', 'nature': '自然',
            'small': '小型', 'medium': '中型', 'large': '大型',
            'head': '头型', 'eye': '眼睛', 'mouth': '嘴巴', 'hair': '发型', 'body': '躯干',
            'mask': '面饰', 'helm': '头盔',
            'chest': '胸甲', 'upper_arm': '肩甲', 'forearm': '护腕', 'hand': '手套',
            'hips': '腰/裙', 'thigh': '大腿', 'calf': '小腿', 'foot': '鞋靴'
        };
        return labels[sub] || sub;
    };

    return (
        <div className="absolute inset-0 z-20 flex bg-gray-950/95 backdrop-blur-sm font-sans animate-fade-in">

            {/* --- NOTIFICATION --- */}
            {notification && (
                <div className={`absolute top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in-down border ${notification.type === 'success' ? 'bg-green-900/90 border-green-500 text-white' :
                        notification.type === 'error' ? 'bg-red-900/90 border-red-500 text-white' :
                            'bg-blue-900/90 border-blue-500 text-white'
                    }`}>
                    <i className={`fas ${notification.type === 'success' ? 'fa-check-circle' :
                            notification.type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'
                        }`}></i>
                    <span className="font-bold text-xs">{notification.message}</span>
                </div>
            )}

            {/* --- LEFT SIDEBAR (MAIN GROUPS) --- */}
            <div className="w-20 bg-gray-900 border-r border-gray-800 flex flex-col items-center py-6 gap-6 pt-20">
                {(Object.keys(MENU_STRUCTURE) as MainGroup[]).map(key => {
                    const isActive = activeGroup === key;
                    const item = MENU_STRUCTURE[key];
                    return (
                        <button
                            key={key}
                            onClick={() => { setActiveGroup(key); if (item.defaultSub) setActiveSubGroup(item.defaultSub); }}
                            className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-110' : 'text-gray-500 hover:bg-gray-800 hover:text-gray-300'}`}
                            title={item.label}
                        >
                            <i className={`fas ${item.icon} text-lg`}></i>
                            {/* <span className="text-[9px] font-bold">{item.label}</span> */}
                        </button>
                    )
                })}
            </div>

            {/* --- MAIN CONTENT --- */}
            <div className="flex-grow flex flex-col h-full bg-gray-950/50">

                {/* TOP HEADER & SUB-NAVIGATION */}
                <div className="bg-gray-900/80 backdrop-blur-md border-b border-gray-800 p-6 flex flex-col gap-4">

                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                                <span className="text-gray-400 font-normal text-lg">{MENU_STRUCTURE[activeGroup].label}</span>
                                {activeGroup !== 'profile' && (
                                    <>
                                        <i className="fas fa-chevron-right text-xs text-gray-600"></i>
                                        <span className="text-blue-400">{SUB_MENUS[activeGroup]?.find(s => s.id === activeSubGroup)?.label}</span>
                                    </>
                                )}
                            </h1>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Dynamic Create Buttons */}
                            {activeGroup !== 'profile' && <CreateButton />}

                            <div className="h-6 w-px bg-gray-700 mx-2"></div>

                            <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".json" className="hidden" />
                            <button onClick={() => fileInputRef.current?.click()} className="w-8 h-8 rounded-lg bg-gray-800 border border-gray-700 hover:text-white text-gray-400 flex items-center justify-center transition-colors" title="导入">
                                <i className="fas fa-file-import"></i>
                            </button>
                            <button onClick={handleExportAll} className="w-8 h-8 rounded-lg bg-gray-800 border border-gray-700 hover:text-white text-gray-400 flex items-center justify-center transition-colors" title="导出全部">
                                <i className="fas fa-file-export"></i>
                            </button>
                        </div>
                    </div>

                    {/* Sub Tabs */}
                    {activeGroup !== 'profile' && (
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                            {SUB_MENUS[activeGroup].map(sub => (
                                <button
                                    key={sub.id}
                                    onClick={() => setActiveSubGroup(sub.id)}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeSubGroup === sub.id ? 'bg-gray-800 text-white border border-gray-600 shadow' : 'text-gray-500 hover:bg-gray-800/50 hover:text-gray-300'}`}
                                >
                                    <i className={`fas ${sub.icon} ${activeSubGroup === sub.id ? 'text-blue-400' : ''}`}></i>
                                    {sub.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Tertiary Filters (e.g. Weapons) */}
                    {activeGroup === 'gear' && activeSubGroup === 'weapon' && (
                        <div className="flex gap-2 pt-2 border-t border-gray-800/50 animate-fade-in">
                            {[{ id: 'all', l: '全部' }, { id: 'one_handed', l: '单手武器' }, { id: 'two_handed', l: '双手武器' }].map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => setWeaponFilter(f.id as any)}
                                    className={`px-3 py-1 rounded text-[10px] border transition-all ${weaponFilter === f.id ? 'bg-blue-900/30 border-blue-500 text-blue-200' : 'bg-transparent border-gray-700 text-gray-500 hover:border-gray-500'}`}
                                >
                                    {f.l}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Tertiary Filters (e.g. Head) */}
                    {activeGroup === 'gear' && activeSubGroup === 'head_gear' && (
                        <div className="flex gap-2 pt-2 border-t border-gray-800/50 animate-fade-in">
                            {[{ id: 'all', l: '全部' }, { id: 'helm', l: '头盔' }, { id: 'mask', l: '面饰' }].map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => setHeadFilter(f.id as any)}
                                    className={`px-3 py-1 rounded text-[10px] border transition-all ${headFilter === f.id ? 'bg-blue-900/30 border-blue-500 text-blue-200' : 'bg-transparent border-gray-700 text-gray-500 hover:border-gray-500'}`}
                                >
                                    {f.l}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* --- GRID CONTENT --- */}
                <div className="flex-grow p-6 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">

                        {/* 1. CHARACTER PROFILES */}
                        {activeGroup === 'profile' && displayCharacters.map(char => (
                            <div key={char.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-purple-500/50 transition-all group relative flex flex-col shadow-lg">
                                <div className="flex justify-between items-start mb-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg shadow-inner bg-purple-900/30 text-purple-400`}>
                                        <i className="fas fa-user-circle"></i>
                                    </div>
                                    <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded font-bold uppercase">{char.className || 'NPC'}</span>
                                </div>
                                <h3 className="text-sm font-bold text-gray-200 mb-1 truncate">{char.name}</h3>
                                <div className="flex gap-3 text-[10px] text-gray-500 mb-4">
                                    <span>STR {char.stats.strength}</span>
                                    <span>AGI {char.stats.agility}</span>
                                </div>
                                <div className="mt-auto grid grid-cols-5 gap-2">
                                    <button onClick={() => onLoadCharacter && onLoadCharacter(char.id!)} className="col-span-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-colors">
                                        <i className="fas fa-edit mr-1"></i> 编辑档案
                                    </button>
                                    <button onClick={() => onDeleteCharacter && onDeleteCharacter(char.id!)} className="py-2 bg-gray-800 hover:bg-red-600 hover:text-white text-gray-400 rounded-lg text-xs font-bold transition-colors border border-gray-700 hover:border-red-500" title="删除角色">
                                        <i className="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* 2. ASSETS */}
                        {activeGroup !== 'profile' && displayAssets.map(model => (
                            <div key={model.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-blue-500/50 transition-all group relative flex flex-col shadow-md hover:shadow-xl hover:-translate-y-1">
                                <div className="flex justify-between items-start mb-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg shadow-inner bg-gray-800 text-gray-400 group-hover:bg-blue-900/20 group-hover:text-blue-400 transition-colors`}>
                                        <i className={`fas ${getTypeIcon(model.category)}`}></i>
                                    </div>
                                    <div className="px-2 py-0.5 bg-gray-800 rounded text-[9px] text-gray-500 uppercase font-bold border border-gray-700">
                                        {getSubCatLabel(model)}
                                    </div>
                                </div>
                                <h3 className="text-sm font-bold text-gray-200 mb-1 truncate group-hover:text-white transition-colors">{model.name}</h3>
                                <p className="text-[10px] text-gray-600 mb-4 truncate font-mono">{model.id.split('_').pop()}</p>

                                <div className="mt-auto grid grid-cols-2 gap-2">
                                    <button onClick={() => onEdit(model.id)} className="py-1.5 bg-gray-800 hover:bg-blue-600 hover:text-white text-gray-400 rounded-lg text-xs font-bold transition-colors border border-gray-700 hover:border-blue-500"><i className="fas fa-edit"></i></button>
                                    <button onClick={() => onDelete(model.id)} className="py-1.5 bg-gray-800 hover:bg-red-600 hover:text-white text-gray-400 rounded-lg text-xs font-bold transition-colors border border-gray-700 hover:border-red-500"><i className="fas fa-trash"></i></button>
                                </div>
                            </div>
                        ))}

                        {/* EMPTY STATE */}
                        {((activeGroup === 'profile' && displayCharacters.length === 0) || (activeGroup !== 'profile' && displayAssets.length === 0)) && (
                            <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-600 border-2 border-dashed border-gray-800 rounded-2xl">
                                <i className="fas fa-wind text-4xl mb-4 opacity-50"></i>
                                <p className="text-xs font-bold">暂无相关资产</p>
                                {activeGroup !== 'profile' && <p className="text-[10px] mt-1">点击上方“新建”按钮开始创作</p>}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
