import React from 'react';
import { Node, RenderStyle, AspectRatio } from '../types';
import { Layers, Zap, Film, Box, Maximize2, Camera, User, TreePine } from 'lucide-react';
import ImageUpload from './ImageUpload';

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
