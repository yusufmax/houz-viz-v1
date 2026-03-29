import React from 'react';
import { Node, RenderStyle, AspectRatio, Atmosphere, CameraAngle, CameraLens } from '../types';
import { Layers, Zap, Film, Box, Maximize2, Camera, User, TreePine, X, Plus, Sun, Building2, Trees, Combine, Map, Users, Car, Wind, Component } from 'lucide-react';
import ImageUpload from './ImageUpload';
import SunPositionSelector from './SunPositionSelector';

export const VideoNodePanel = ({ node, setNodes }: { node: Node, setNodes: any }) => {
    return (
        <div className="space-y-4 overflow-y-auto custom-scrollbar" style={{ maxHeight: '400px' }}>
            <div className="space-y-2 pt-1 relative">
                <label className="text-[10px] font-black text-cyan-400 uppercase tracking-widest block flex items-center gap-1">
                    <Film size={10} /> Kling V3 Synthesis
                </label>
                <div className="bg-black/50 border border-white/5 rounded p-2">
                    <div className="grid grid-cols-2 gap-2 text-left mb-2">
                        <label className="text-[8px] text-zinc-500 font-bold uppercase flex items-center h-full">Duration</label>
                        <select
                            className="w-full bg-zinc-950 border border-white/10 rounded px-1.5 py-1 text-[9px] text-zinc-300 outline-none focus:border-cyan-500"
                            value={node.data.videoSettings?.duration || '5'}
                            onChange={(e) => {
                                setNodes((prev: Node[]) => prev.map(n => n.id === node.id ? {
                                    ...n, data: { ...n.data, videoSettings: { ...n.data.videoSettings!, duration: e.target.value } }
                                } : n));
                            }}
                        >
                            <option value="5">5s (Standard)</option>
                            <option value="10">10s (Extended)</option>
                        </select>
                    </div>
                </div>
                
                <textarea
                    className="w-full h-24 bg-black border border-white/10 rounded p-2 text-xs text-zinc-300 resize-none focus:border-cyan-500 outline-none"
                    placeholder="Motion instructions (e.g. 'cinematic pan left, slow motion, leaves falling')"
                    value={node.data.videoSettings?.prompt || ''}
                    onChange={(e) => {
                        setNodes((prev: Node[]) => prev.map(n => n.id === node.id ? { ...n, data: { ...n.data, videoSettings: { ...n.data.videoSettings!, prompt: e.target.value } } } : n));
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                />
            </div>
            {/* Generate Action added via InfinityCanvas natively */}
        </div>
    );
};

export const AdvancedRefNodePanel = ({ node, setNodes }: { node: Node, setNodes: any }) => {
    return (
        <div className="space-y-4 overflow-y-auto custom-scrollbar" style={{ maxHeight: '400px' }}>
            <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-yellow-400 uppercase tracking-widest flex items-center gap-1"><Layers size={10} /> Context Refs</label>
                    <div className="text-[8px] font-bold text-zinc-500 bg-black px-1.5 py-0.5 rounded border border-white/10">Max 10</div>
                </div>
                
                <div className="text-[9px] text-zinc-400 leading-tight">
                    Strict categorical references for Nano Banana AI payload injection.
                </div>

                <div className="space-y-2">
                    {node.data.customReferences?.map((ref, i) => (
                        <div key={i} className="bg-neutral-900 border border-white/10 rounded overflow-hidden flex flex-col group">
                            <div className="flex bg-black px-2 py-1 items-center justify-between border-b border-white/5">
                                <span className="text-[8px] text-zinc-500 uppercase font-black">{ref.category}</span>
                            </div>
                            <div className="p-2 gap-2 flex">
                                <div className="w-12 h-12 flex-shrink-0 border border-white/10 rounded bg-black">
                                     <img src={ref.image || ''} className="w-full h-full object-cover rounded opacity-80" />
                                </div>
                                <div className="flex-1 text-[9px] text-zinc-400 line-clamp-3 leading-tight font-mono">
                                    {ref.prompt || 'No instruction.'}
                                </div>
                            </div>
                        </div>
                    ))}
                    {(node.data.customReferences?.length || 0) === 0 && (
                        <div className="p-3 text-center border border-white/5 border-dashed rounded text-[10px] text-zinc-500">
                            No active reference overrides.
                        </div>
                    )}
                </div>
                <div className="pt-2 border-t border-white/5 text-[9px] text-zinc-500 italic">
                    Configure these globally in the sidebar. This node injects them into the chain.
                </div>
            </div>
        </div>
    );
};

export const UpscaleNodePanel = ({ node, setNodes }: { node: Node, setNodes: any }) => {
    return (
        <div className="space-y-4 overflow-y-auto custom-scrollbar" style={{ maxHeight: '400px' }}>
             <div className="space-y-2 pt-1">
                <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1"><Maximize2 size={10} /> Up-Res Engine</label>
                
                <div className="bg-black/50 border border-white/5 rounded p-2 space-y-2">
                    <div className="flex justify-between items-center group">
                        <label className="text-[8px] text-zinc-500 font-bold uppercase w-1/3">Scale Factor</label>
                        <select
                            className="bg-black border border-white/10 rounded px-1 min-w-0 flex-1 py-1 text-[9px] text-zinc-300 outline-none focus:border-emerald-500"
                            value={node.data.upscaleSettings?.scale_factor || '2x'}
                            onChange={(e) => {
                                setNodes((prev: Node[]) => prev.map(n => n.id === node.id ? {
                                    ...n, data: { ...n.data, upscaleSettings: { ...n.data.upscaleSettings!, scale_factor: e.target.value as any } }
                                } : n));
                            }}
                        >
                            <option value={'2x'}>2x Scale (Ultra Clear)</option>
                            <option value={'4x'}>4x Scale (Extreme)</option>
                        </select>
                    </div>

                    <div className="flex justify-between items-center">
                        <label className="text-[8px] text-zinc-500 font-bold uppercase w-1/3">Detailing</label>
                        <select
                            className="bg-black border border-white/10 rounded px-1 flex-1 min-w-0 py-1 text-[9px] text-zinc-300 outline-none focus:border-emerald-500"
                            value={node.data.upscaleSettings?.optimized_for || 'photography'}
                            onChange={(e) => {
                                setNodes((prev: Node[]) => prev.map(n => n.id === node.id ? {
                                    ...n, data: { ...n.data, upscaleSettings: { ...n.data.upscaleSettings!, optimized_for: e.target.value as any } }
                                } : n));
                            }}
                        >
                            <option value="photography">Photography</option>
                            <option value="art">Digital Art</option>
                            <option value="architecture">Architecture CGI</option>
                        </select>
                    </div>
                </div>

                <textarea
                    className="w-full h-16 bg-black border border-white/10 rounded p-2 text-[10px] text-zinc-300 resize-none focus:border-emerald-500 outline-none"
                    placeholder="Refinement Prompt (e.g. 'highly detailed photorealistic textures')"
                    value={node.data.upscaleSettings?.prompt || ''}
                    onChange={(e) => {
                        setNodes((prev: Node[]) => prev.map(n => n.id === node.id ? { ...n, data: { ...n.data, upscaleSettings: { ...n.data.upscaleSettings!, prompt: e.target.value } } } : n));
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                />
             </div>
        </div>
    );
};

export const ArchProcessorNodePanel = ({ node, setNodes, customReferenceImages }: { node: Node, setNodes: any, customReferenceImages: any[] }) => {
    
    // Toggle atmosphere micro-pills
    const toggleNodeAtmosphere = (atm: Atmosphere) => {
        setNodes((prev: Node[]) => prev.map(n => {
            if (n.id === node.id && n.data.settings) {
                const current = n.data.settings.atmosphere || [];
                if (current.includes(atm)) {
                    return { ...n, data: { ...n.data, settings: { ...n.data.settings, atmosphere: current.filter(a => a !== atm) } } };
                }
                if (current.length >= 3) return n;
                return { ...n, data: { ...n.data, settings: { ...n.data.settings, atmosphere: [...current, atm] } } };
            }
            return n;
        }));
    };

    return (
        <div className="space-y-3">
            {/* Model Selector Top Bar */}
            <div className="flex justify-between items-center bg-zinc-950 border border-white/5 rounded-lg px-2 py-1.5 shadow-lg shadow-black/50">
                <label className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest flex items-center gap-1.5"><Zap size={10} className="text-purple-400" /> AI Engine</label>
                <select
                    className="bg-transparent text-[9px] text-zinc-200 outline-none font-medium appearance-none cursor-pointer pl-2 pr-1"
                    value={node.data.settings?.model || 'gemini-3.1-flash-image-preview'}
                    onChange={(e) => setNodes((prev: Node[]) => prev.map(n => n.id === node.id ? { ...n, data: { ...n.data, settings: { ...n.data.settings!, model: e.target.value } } } : n))}
                >
                    <option value="gemini-2.5-flash-image" className="bg-zinc-900">Gemini 2.5 Flash</option>
                    <option value="gemini-3-pro-image-preview" className="bg-zinc-900">Gemini 3 Pro</option>
                    <option value="gemini-3.1-flash-image-preview" className="bg-zinc-900">Nano Banana 2</option>
                </select>
            </div>

            <textarea
                className="w-full min-h-[50px] bg-black/60 border border-white/5 rounded-lg p-2 text-[10px] text-zinc-300 resize-none focus:border-indigo-500 outline-none leading-relaxed transition-colors custom-scrollbar"
                placeholder="Describe your scene in detail..."
                value={node.data.settings?.prompt || ''}
                onChange={(e) => {
                    const v = e.target.value;
                    setNodes((prev: Node[]) => prev.map(n => n.id === node.id ? { ...n, data: { ...n.data, settings: { ...n.data.settings!, prompt: v } } } : n));
                }}
                onMouseDown={(e) => e.stopPropagation()}
            />


            {/* Direct Multi-Uploads */}
            <div className="space-y-1">
                <label className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block">Explicit References</label>
                <div className="grid grid-cols-3 gap-1.5">
                    {[
                        { k: 'styleReferenceImage', l: 'Style', icon: <Combine size={10} /> },
                        { k: 'architectureReferenceImage', l: 'Arch', icon: <Building2 size={10} /> },
                        { k: 'atmosphereReferenceImage', l: 'Atmosphere', icon: <Wind size={10} /> }
                    ].map(u => (
                        <div key={u.k} className="aspect-square bg-black/40 border border-white/5 rounded-lg overflow-hidden flex flex-col items-center justify-center p-0.5 group hover:border-indigo-500/50 transition-colors">
                            <div className="flex-1 w-full relative">
                                <ImageUpload
                                    selectedImage={(node.data.settings as any)?.[u.k]}
                                    onImageSelected={(img) => setNodes((prev: Node[]) => prev.map(n => n.id === node.id ? { ...n, data: { ...n.data, settings: { ...n.data.settings!, [u.k]: img } } } : n))}
                                    compact
                                    label={u.l}
                                />
                            </div>
                            <span className="text-[7px] font-bold uppercase text-slate-500 mt-1 mb-0.5 flex items-center justify-center gap-0.5 w-full truncate px-1">
                                {u.icon} {u.l}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5 min-h-[40px] pt-1">
                {/* Minimal Grid: Camera, Lens & Style */}
                <div className="space-y-1">
                    <label className="text-[7px] text-slate-500 font-bold uppercase block tracking-wider">Angle</label>
                    <select
                        className="w-full bg-black border border-white/5 rounded px-1.5 py-1 text-[8.5px] text-zinc-300 outline-none focus:border-indigo-500"
                        value={node.data.settings?.camera}
                        onChange={(e) => { setNodes((prev: Node[]) => prev.map(n => n.id === node.id ? { ...n, data: { ...n.data, settings: { ...n.data.settings!, camera: e.target.value as CameraAngle } } } : n)) }}
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        {Object.values(CameraAngle).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                <div className="space-y-1">
                    <label className="text-[7px] text-slate-500 font-bold uppercase block tracking-wider">Lens</label>
                    <select
                        className="w-full bg-black border border-white/5 rounded px-1.5 py-1 text-[8.5px] text-zinc-300 outline-none focus:border-indigo-500"
                        value={node.data.settings?.lens || CameraLens.Standard}
                        onChange={(e) => { setNodes((prev: Node[]) => prev.map(n => n.id === node.id ? { ...n, data: { ...n.data, settings: { ...n.data.settings!, lens: e.target.value as CameraLens } } } : n)) }}
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        {Object.values(CameraLens).map(l => <option key={l} value={l}>{l.replace('mm', '')}mm</option>)}
                    </select>
                </div>
                
                <div className="space-y-1">
                    <label className="text-[7px] text-slate-500 font-bold uppercase block tracking-wider">Style</label>
                    <select
                        className="w-full bg-black border border-white/5 rounded px-1.5 py-1 text-[8.5px] text-zinc-300 outline-none focus:border-indigo-500"
                        value={node.data.settings?.style}
                        onChange={(e) => { setNodes((prev: Node[]) => prev.map(n => n.id === node.id ? { ...n, data: { ...n.data, settings: { ...n.data.settings!, style: e.target.value as RenderStyle } } } : n)) }}
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        {Object.values(RenderStyle).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>

        {/* Ultra-compact Aspect Ratio Box */}
            <div className="bg-black/40 border border-white/5 rounded-lg p-1.5 flex items-center justify-between mt-0.5">
                <span className="text-[8px] text-zinc-500 font-bold uppercase pl-1 tracking-wider">Aspect</span>
                <div className="flex gap-0.5">
                    {['16:9', '1:1', '9:16', '4:3', '3:4'].map(r => (
                        <button
                            key={r}
                            onClick={(e) => { e.stopPropagation(); setNodes((prev: Node[]) => prev.map(n => n.id === node.id ? { ...n, data: { ...n.data, settings: { ...n.data.settings!, aspectRatio: r as AspectRatio } } } : n)) }}
                            className={`px-1.5 py-0.5 text-[8px] rounded font-mono transition-colors ${node.data.settings?.aspectRatio === r ? 'bg-indigo-600 text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
                        >
                            {r}
                        </button>
                    ))}
                </div>
            </div>

            {/* Atmosphere Redesign: Live Micro-Pills + Dropdown */}
            <div className="space-y-1.5 pt-1">
                <div className="flex justify-between items-center">
                    <label className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Filters {(node.data.settings?.atmosphere?.length || 0)}/3</label>
                    <div className="relative group">
                        <select
                            className="bg-transparent text-[8px] font-bold uppercase tracking-wider text-indigo-400 hover:text-indigo-300 outline-none cursor-pointer appearance-none text-right"
                            value=""
                            onChange={(e) => {
                                if(e.target.value) toggleNodeAtmosphere(e.target.value as Atmosphere);
                            }}
                        >
                            <option value="" disabled className="bg-black text-slate-500">＋ Add Filter</option>
                            {Object.values(Atmosphere).filter(a => !(node.data.settings?.atmosphere || []).includes(a)).map(atm => (
                                <option key={atm} value={atm} className="bg-zinc-950 text-zinc-300">{atm}</option>
                            ))}
                        </select>
                    </div>
                </div>
                
                <div className="flex flex-wrap gap-1 min-h-[16px]">
                    {(node.data.settings?.atmosphere || []).map(atm => (
                        <div key={atm} className="flex items-center gap-1 bg-indigo-900/40 border border-indigo-500/30 rounded pl-1.5 pr-0.5 py-0.5 group/pill">
                            <span className="text-[8px] text-indigo-200 uppercase truncate max-w-[80px]">{atm}</span>
                            <button
                                onClick={(e) => { e.stopPropagation(); toggleNodeAtmosphere(atm); }}
                                className="text-indigo-400/50 hover:text-white hover:bg-red-500/20 rounded p-0.5 transition-colors"
                            >
                                <X size={8} />
                            </button>
                        </div>
                    ))}
                    {(node.data.settings?.atmosphere?.length || 0) === 0 && (
                        <div className="text-[8px] text-zinc-600 italic mt-0.5">None added.</div>
                    )}
                </div>
            </div>

            {/* Advanced Mechanics Accordion */}
            <details className="group border-t border-white/5 pt-2 mt-2 group-open:pb-2">
                <summary className="text-[9px] font-black text-slate-400 hover:text-white uppercase tracking-widest cursor-pointer list-none flex items-center gap-1.5 select-none transition-colors">
                    <div className="w-3 h-3 border border-white/20 rounded-sm flex items-center justify-center bg-black/50 overflow-hidden shrink-0 group-hover:border-indigo-500/50">
                        <span className="group-open:hidden leading-none block transform translate-y-[-0.5px]">+</span>
                        <span className="hidden group-open:block leading-none transform translate-y-[-1px]">-</span>
                    </div>
                    Advanced Physics & Elements
                </summary>

                <div className="pt-3 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    
                    {/* Lighting Mechanics Block */}
                    <div className="p-3 bg-black border border-white/5 rounded-xl space-y-3">
                         <div className="flex justify-between items-start gap-4">
                            <div className="scale-75 origin-top-left -mb-6 mt-1 ml-1 cursor-pointer" onMouseDown={(e) => e.stopPropagation()}>
                                <SunPositionSelector
                                    value={node.data.settings?.sunPosition || 135}
                                    onChange={(v) => setNodes((prev: Node[]) => prev.map(n => n.id === node.id ? { ...n, data: { ...n.data, settings: { ...n.data.settings!, sunPosition: v } } } : n)) }
                                />
                            </div>
                            <div className="space-y-1 text-right flex-1 min-w-[70px]">
                                <label className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block">Time of Day</label>
                                <div className="text-[14px] font-mono font-black text-indigo-400 tracking-tighter">
                                    {(node.data.settings?.timeOfDay || 12).toString().padStart(2, '0')}:00
                                </div>
                                <input
                                    type="range"
                                    min="0" max="23" step="1"
                                    className="w-full accent-indigo-500 cursor-pointer opacity-80 hover:opacity-100"
                                    value={node.data.settings?.timeOfDay || 12}
                                    onChange={(e) => setNodes((prev: Node[]) => prev.map(n => n.id === node.id ? { ...n, data: { ...n.data, settings: { ...n.data.settings!, timeOfDay: Number(e.target.value) } } } : n))}
                                    onMouseDown={(e) => e.stopPropagation()}
                                />
                            </div>
                         </div>
                    </div>

                    {/* Scene Elements Toggles */}
                    <div className="space-y-1.5 px-1 pb-1">
                        <label className="text-[8px] text-slate-500 font-bold uppercase tracking-wider mb-1 block">Context Inclusions</label>
                        <div className="grid grid-cols-2 gap-1.5">
                            {[
                                { k: 'people', l: 'People', icon: <Users size={10} /> },
                                { k: 'cars', l: 'Cars', icon: <Car size={10} /> },
                                { k: 'vegetation', l: 'Greenery', icon: <Trees size={10} /> },
                                { k: 'city', l: 'City BG', icon: <Map size={10} /> },
                            ].map(el => {
                                const active = (node.data.settings?.sceneElements as any)?.[el.k] === true;
                                return (
                                    <button
                                        key={el.k}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setNodes((prev: Node[]) => prev.map(n => n.id === node.id ? {
                                                ...n, data: { ...n.data, settings: { ...n.data.settings!, sceneElements: { ...(n.data.settings?.sceneElements || {}), [el.k]: !active } as any } }
                                            } : n));
                                        }}
                                        className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border text-[8px] font-bold uppercase transition-all select-none ${
                                            active ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40 shadow-inner' : 'bg-black/40 text-slate-500 border-white/5 hover:bg-white/5 hover:text-slate-300'
                                        }`}
                                    >
                                        {el.icon} {el.l}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </details>

        </div>
    );
};
