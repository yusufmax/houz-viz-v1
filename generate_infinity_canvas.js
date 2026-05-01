const fs = require('fs');

const code = `import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
    Plus, Minus, Move, Hand, MousePointer2, Settings, Image as ImageIcon, 
    Type, Play, Download, Trash2, Zap, Loader2, Maximize, Layers, FolderOpen
} from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { generateImage } from '../services/geminiService';
import ImageUpload from './ImageUpload';
import { RenderStyle, Atmosphere, CameraAngle, AspectRatio } from '../types';

// --- COMFY UI NODE DEFINITIONS ---
type PortId = string;
type NodeId = string;

interface Port {
    id: PortId;
    label: string;
    type: string; // e.g. 'IMAGE', 'CONDITIONING', 'MODEL', 'LATENT'
}

interface ComfyNodeDef {
    type: string;
    category: string;
    label: string;
    inputs: Port[];
    outputs: Port[];
    width: number;
    render: (props: { node: ComfyNode; updateData: (id: string, data: any) => void }) => React.ReactNode;
    evaluate: (node: ComfyNode, inputs: Record<string, any>) => Promise<any>;
}

export interface ComfyNode {
    id: NodeId;
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
    data: Record<string, any>;
}

export interface ComfyConnection {
    id: string;
    fromNode: NodeId;
    fromPort: PortId;
    toNode: NodeId;
    toPort: PortId;
}

const PORT_COLORS: Record<string, string> = {
    IMAGE: '#3b82f6', // blue
    CONDITIONING: '#f59e0b', // amber
    MODEL: '#8b5cf6', // purple
    LATENT: '#ec4899', // pink
    STYLE: '#10b981', // emerald
    DEFAULT: '#94a3b8' // slate
};

// --- REGISTRY ---
export const NODE_REGISTRY: Record<string, ComfyNodeDef> = {
    LoadImage: {
        type: 'LoadImage',
        category: 'image',
        label: 'Load Image',
        inputs: [],
        outputs: [{ id: 'IMAGE', label: 'IMAGE', type: 'IMAGE' }],
        width: 280,
        render: ({ node, updateData }) => (
            <div className="p-2 bg-black/20 rounded-b-xl">
                <ImageUpload 
                    selectedImage={node.data.image} 
                    onImageSelected={(img) => updateData(node.id, { image: img })} 
                    label="Upload Base Image" 
                />
            </div>
        ),
        evaluate: async (node) => ({ IMAGE: node.data.image })
    },
    TextEncode: {
        type: 'TextEncode',
        category: 'conditioning',
        label: 'CLIP Text Encode (Prompt)',
        inputs: [],
        outputs: [{ id: 'CONDITIONING', label: 'CONDITIONING', type: 'CONDITIONING' }],
        width: 320,
        render: ({ node, updateData }) => (
            <div className="p-3 bg-black/20 rounded-b-xl">
                <textarea 
                    value={node.data.text || ''} 
                    onChange={(e) => updateData(node.id, { text: e.target.value })}
                    className="w-full h-32 bg-slate-950/80 border border-white/10 text-slate-200 p-2 rounded-lg text-xs focus:border-indigo-500 outline-none resize-none shadow-inner"
                    placeholder="Enter prompt instructions..."
                />
            </div>
        ),
        evaluate: async (node) => ({ CONDITIONING: node.data.text })
    },
    ModelLoader: {
        type: 'ModelLoader',
        category: 'loaders',
        label: 'Checkpoint Loader',
        inputs: [],
        outputs: [{ id: 'MODEL', label: 'MODEL', type: 'MODEL' }],
        width: 280,
        render: ({ node, updateData }) => (
            <div className="p-3 bg-black/20 rounded-b-xl flex flex-col gap-3">
                <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400">Model Name</label>
                    <select 
                        value={node.data.model || 'gemini-3-pro-image-preview'}
                        onChange={(e) => updateData(node.id, { model: e.target.value })}
                        className="w-full bg-slate-950/80 border border-white/10 text-slate-200 p-2 rounded-lg text-xs outline-none"
                    >
                        <option value="gpt-image-2">GPT Image 2</option>
                        <option value="gemini-2.5-flash-image">Gemini Flash (Fast)</option>
                        <option value="gemini-3-pro-image-preview">Gemini Pro (HQ)</option>
                        <option value="gemini-3.1-flash-image-preview">Nano Banana 2</option>
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400">Aspect Ratio</label>
                    <select 
                        value={node.data.ratio || '16:9'}
                        onChange={(e) => updateData(node.id, { ratio: e.target.value })}
                        className="w-full bg-slate-950/80 border border-white/10 text-slate-200 p-2 rounded-lg text-xs outline-none"
                    >
                        <option value="16:9">16:9 Landscape</option>
                        <option value="1:1">1:1 Square</option>
                        <option value="9:16">9:16 Portrait</option>
                        <option value="4:3">4:3 Standard</option>
                    </select>
                </div>
            </div>
        ),
        evaluate: async (node) => ({ MODEL: { model: node.data.model || 'gemini-3-pro-image-preview', ratio: node.data.ratio || '16:9' } })
    },
    StyleConfig: {
        type: 'StyleConfig',
        category: 'conditioning',
        label: 'Style Configuration',
        inputs: [],
        outputs: [{ id: 'STYLE', label: 'STYLE', type: 'STYLE' }],
        width: 250,
        render: ({ node, updateData }) => (
            <div className="p-3 bg-black/20 rounded-b-xl flex flex-col gap-3">
                <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400">Render Style</label>
                    <select 
                        value={node.data.style || RenderStyle.Photorealistic}
                        onChange={(e) => updateData(node.id, { style: e.target.value })}
                        className="w-full bg-slate-950/80 border border-white/10 text-slate-200 p-2 rounded-lg text-xs outline-none"
                    >
                        {Object.values(RenderStyle).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>
        ),
        evaluate: async (node) => ({ STYLE: node.data.style || RenderStyle.Photorealistic })
    },
    KSampler: {
        type: 'KSampler',
        category: 'sampling',
        label: 'KSampler',
        inputs: [
            { id: 'MODEL', label: 'model', type: 'MODEL' },
            { id: 'POSITIVE', label: 'positive', type: 'CONDITIONING' },
            { id: 'LATENT_IMAGE', label: 'latent_image', type: 'IMAGE' },
            { id: 'STYLE_REF', label: 'style_ref', type: 'IMAGE' },
            { id: 'STYLE', label: 'style_config', type: 'STYLE' }
        ],
        outputs: [{ id: 'LATENT', label: 'LATENT', type: 'LATENT' }],
        width: 260,
        render: ({ node }) => (
            <div className="p-3 bg-black/20 rounded-b-xl">
                <div className="text-[10px] text-slate-400">
                    <p>Seed: random</p>
                    <p>Steps: 20</p>
                    <p>CFG: 7.0</p>
                    <p>Sampler: euler_a</p>
                </div>
                {node.data.isExecuting && (
                    <div className="mt-3 flex items-center justify-center gap-2 text-indigo-400 font-bold text-xs bg-indigo-500/10 p-2 rounded animate-pulse">
                        <Loader2 size={14} className="animate-spin" /> Sampling...
                    </div>
                )}
            </div>
        ),
        evaluate: async (node, inputs) => {
            if (!inputs.POSITIVE) throw new Error("KSampler requires positive conditioning (prompt).");
            
            const settings = {
                prompt: inputs.POSITIVE,
                model: inputs.MODEL?.model || 'gemini-2.5-flash-image',
                aspectRatio: inputs.MODEL?.ratio || '16:9',
                style: inputs.STYLE || RenderStyle.Photorealistic,
                atmosphere: [],
                camera: CameraAngle.Default,
                sceneElements: { people: false, cars: false, clouds: true, vegetation: true, city: false, motionBlur: false, enhanceFacade: true }
            };

            const result = await generateImage(
                inputs.LATENT_IMAGE || null,
                settings as any,
                inputs.STYLE_REF || null,
                null,
                null
            );
            return { LATENT: result };
        }
    },
    VAEDecode: {
        type: 'VAEDecode',
        category: 'latent',
        label: 'VAE Decode',
        inputs: [{ id: 'SAMPLES', label: 'samples', type: 'LATENT' }],
        outputs: [{ id: 'IMAGE', label: 'IMAGE', type: 'IMAGE' }],
        width: 200,
        render: ({ node }) => (
            <div className="p-3 bg-black/20 rounded-b-xl">
                {node.data.isExecuting ? (
                    <div className="flex items-center gap-2 text-pink-400 text-xs font-bold animate-pulse">
                        <Loader2 size={14} className="animate-spin"/> Decoding...
                    </div>
                ) : (
                    <div className="text-[10px] text-slate-500">Decodes latent to pixel space</div>
                )}
            </div>
        ),
        evaluate: async (node, inputs) => ({ IMAGE: inputs.SAMPLES })
    },
    SaveImage: {
        type: 'SaveImage',
        category: 'image',
        label: 'Save Image',
        inputs: [{ id: 'IMAGE', label: 'images', type: 'IMAGE' }],
        outputs: [],
        width: 320,
        render: ({ node }) => (
            <div className="p-2 bg-black/20 rounded-b-xl flex flex-col gap-2">
                {node.data.result ? (
                    <div className="relative group rounded-lg overflow-hidden ring-1 ring-white/10">
                        <img src={node.data.result} className="w-full h-auto object-contain bg-slate-900" alt="Generated" />
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <a href={node.data.result} download="houz_generation.png" className="p-1.5 bg-black/70 backdrop-blur text-white rounded hover:bg-indigo-600 transition-colors">
                                <Download size={14} />
                            </a>
                        </div>
                    </div>
                ) : (
                    <div className="w-full h-48 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-center text-xs text-slate-600 border-dashed">
                        Awaiting Image Data...
                    </div>
                )}
            </div>
        ),
        evaluate: async (node, inputs) => {
            return { result: inputs.IMAGE };
        }
    }
};

// --- CORE COMPONENT ---
const InfinityCanvas: React.FC = () => {
    const { t } = useLanguage();
    
    // Viewport
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const canvasRef = useRef<HTMLDivElement>(null);
    const [tool, setTool] = useState<'select' | 'pan'>('select');

    // Graph State
    const [nodes, setNodes] = useState<ComfyNode[]>([
        { id: '1', type: 'ModelLoader', x: 50, y: 50, width: 280, height: 150, data: {} },
        { id: '2', type: 'TextEncode', x: 50, y: 250, width: 320, height: 200, data: { text: "A modern architectural villa, photorealistic, beautiful lighting" } },
        { id: '3', type: 'KSampler', x: 450, y: 150, width: 260, height: 200, data: {} },
        { id: '4', type: 'VAEDecode', x: 750, y: 150, width: 200, height: 100, data: {} },
        { id: '5', type: 'SaveImage', x: 1000, y: 150, width: 320, height: 300, data: {} }
    ]);
    const [connections, setConnections] = useState<ComfyConnection[]>([
        { id: 'c1', fromNode: '1', fromPort: 'MODEL', toNode: '3', toPort: 'MODEL' },
        { id: 'c2', fromNode: '2', fromPort: 'CONDITIONING', toNode: '3', toPort: 'POSITIVE' },
        { id: 'c3', fromNode: '3', fromPort: 'LATENT', toNode: '4', toPort: 'SAMPLES' },
        { id: 'c4', fromNode: '4', fromPort: 'IMAGE', toNode: '5', toPort: 'IMAGE' }
    ]);

    // Drag & Connect State
    const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
    const [dragNodeOffset, setDragNodeOffset] = useState({ x: 0, y: 0 });
    
    const [connectingStart, setConnectingStart] = useState<{ nodeId: string, portId: string, isOutput: boolean } | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [nodeMenuOpen, setNodeMenuOpen] = useState<{x: number, y: number} | null>(null);
    const [isExecuting, setIsExecuting] = useState(false);

    // Helpers
    const getMouseWorldPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (!canvasRef.current) return { x: 0, y: 0 };
        const rect = canvasRef.current.getBoundingClientRect();
        let clientX, clientY;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }
        return {
            x: (clientX - rect.left - pan.x) / zoom,
            y: (clientY - rect.top - pan.y) / zoom
        };
    }, [pan, zoom]);

    const updateNodeData = useCallback((id: string, newData: any) => {
        setNodes(prev => prev.map(n => n.id === id ? { ...n, data: { ...n.data, ...newData } } : n));
    }, []);

    // Evaluator
    const runWorkflow = async () => {
        setIsExecuting(true);
        const cache: Record<string, any> = {};
        
        const resolveNode = async (nodeId: string): Promise<any> => {
            if (cache[nodeId]) return cache[nodeId];
            
            const node = nodes.find(n => n.id === nodeId);
            if (!node) throw new Error("Node not found");
            
            const def = NODE_REGISTRY[node.type];
            const inputs: Record<string, any> = {};
            
            for (const port of def.inputs) {
                const conn = connections.find(c => c.toNode === nodeId && c.toPort === port.id);
                if (conn) {
                    const sourceOutputs = await resolveNode(conn.fromNode);
                    inputs[port.id] = sourceOutputs[conn.fromPort];
                }
            }
            
            updateNodeData(nodeId, { isExecuting: true });
            try {
                const outputs = await def.evaluate(node, inputs);
                cache[nodeId] = outputs;
                
                if (node.type === 'SaveImage' && outputs.result) {
                    updateNodeData(nodeId, { result: outputs.result, isExecuting: false });
                } else {
                    updateNodeData(nodeId, { isExecuting: false });
                }
                return outputs;
            } catch (e) {
                updateNodeData(nodeId, { isExecuting: false });
                console.error("Execution failed at node", node.id, e);
                throw e;
            }
        };

        try {
            // Find terminal nodes (SaveImage)
            const terminalNodes = nodes.filter(n => n.type === 'SaveImage');
            for (const tn of terminalNodes) {
                await resolveNode(tn.id);
            }
        } catch(e) {
            alert("Workflow execution failed. Check connections and prompts.");
        } finally {
            setIsExecuting(false);
        }
    };

    // Interaction Handlers
    const handleMouseDown = (e: React.MouseEvent) => {
        setNodeMenuOpen(null);
        if (e.button === 0 && tool === 'pan' || e.button === 1 || e.button === 2) {
            setIsDraggingCanvas(true);
            setDragStart({ x: e.clientX, y: e.clientY });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        const currentMousePos = getMouseWorldPos(e);
        setMousePos(currentMousePos);

        if (isDraggingCanvas) {
            const dx = e.clientX - dragStart.x;
            const dy = e.clientY - dragStart.y;
            setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
            setDragStart({ x: e.clientX, y: e.clientY });
        } else if (draggedNodeId) {
            setNodes(prev => prev.map(n => 
                n.id === draggedNodeId 
                ? { ...n, x: currentMousePos.x - dragNodeOffset.x, y: currentMousePos.y - dragNodeOffset.y } 
                : n
            ));
        }
    };

    const handleMouseUp = (e: React.MouseEvent) => {
        if (connectingStart) {
            // Did not drop on a valid port, show context menu to add node
            const rect = canvasRef.current!.getBoundingClientRect();
            setNodeMenuOpen({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }
        setIsDraggingCanvas(false);
        setDraggedNodeId(null);
        setConnectingStart(null);
    };

    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const zoomSensitivity = 0.002;
            const delta = -e.deltaY * zoomSensitivity;
            setZoom(z => Math.min(Math.max(0.1, z + delta), 3));
        } else {
            setPan(p => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
        }
    };

    const handleNodeMouseDown = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (e.button === 0) {
            // Bring to front
            setNodes(prev => {
                const idx = prev.findIndex(n => n.id === id);
                if (idx === -1 || idx === prev.length - 1) return prev;
                const newNodes = [...prev];
                const [node] = newNodes.splice(idx, 1);
                newNodes.push(node);
                return newNodes;
            });
            setDraggedNodeId(id);
            const worldPos = getMouseWorldPos(e);
            const node = nodes.find(n => n.id === id);
            if (node) setDragNodeOffset({ x: worldPos.x - node.x, y: worldPos.y - node.y });
        }
    };

    const handlePortMouseDown = (e: React.MouseEvent, nodeId: string, portId: string, isOutput: boolean) => {
        e.stopPropagation();
        setConnectingStart({ nodeId, portId, isOutput });
    };

    const handlePortMouseUp = (e: React.MouseEvent, nodeId: string, portId: string, isOutput: boolean) => {
        e.stopPropagation();
        if (connectingStart && connectingStart.nodeId !== nodeId && connectingStart.isOutput !== isOutput) {
            const fromNode = connectingStart.isOutput ? connectingStart.nodeId : nodeId;
            const fromPort = connectingStart.isOutput ? connectingStart.portId : portId;
            const toNode = connectingStart.isOutput ? nodeId : connectingStart.nodeId;
            const toPort = connectingStart.isOutput ? portId : connectingStart.portId;
            
            // Check type compatibility
            const fromDef = NODE_REGISTRY[nodes.find(n => n.id === fromNode)!.type];
            const toDef = NODE_REGISTRY[nodes.find(n => n.id === toNode)!.type];
            const outType = fromDef.outputs.find(p => p.id === fromPort)?.type;
            const inType = toDef.inputs.find(p => p.id === toPort)?.type;

            if (outType === inType || inType === '*' || outType === '*') {
                // Remove existing connection to this input port
                setConnections(prev => {
                    const filtered = prev.filter(c => !(c.toNode === toNode && c.toPort === toPort));
                    return [...filtered, { id: Date.now().toString(), fromNode, fromPort, toNode, toPort }];
                });
            } else {
                alert("Type mismatch!");
            }
        }
        setConnectingStart(null);
    };

    const addNode = (type: string, x: number, y: number) => {
        const def = NODE_REGISTRY[type];
        const newNode: ComfyNode = {
            id: Date.now().toString(),
            type,
            x: (x - pan.x) / zoom,
            y: (y - pan.y) / zoom,
            width: def.width,
            height: 150,
            data: {}
        };
        setNodes(prev => [...prev, newNode]);
        setNodeMenuOpen(null);

        // Auto connect if dropped from a wire
        if (connectingStart) {
            const isOut = connectingStart.isOutput;
            const targetPort = isOut ? def.inputs[0]?.id : def.outputs[0]?.id;
            if (targetPort) {
                setConnections(prev => [...prev, {
                    id: Date.now().toString(),
                    fromNode: isOut ? connectingStart.nodeId : newNode.id,
                    fromPort: isOut ? connectingStart.portId : targetPort,
                    toNode: isOut ? newNode.id : connectingStart.nodeId,
                    toPort: isOut ? targetPort : connectingStart.portId
                }]);
            }
            setConnectingStart(null);
        }
    };

    const deleteNode = (id: string) => {
        setNodes(prev => prev.filter(n => n.id !== id));
        setConnections(prev => prev.filter(c => c.fromNode !== id && c.toNode !== id));
    };

    // Rendering functions
    const renderConnectionLine = (start: {x: number, y: number}, end: {x: number, y: number}, color: string) => {
        const dx = Math.abs(end.x - start.x) * 0.5;
        const d = \`M \${start.x} \${start.y} C \${start.x + dx} \${start.y}, \${end.x - dx} \${end.y}, \${end.x} \${end.y}\`;
        return (
            <path 
                d={d} 
                fill="none" 
                stroke={color} 
                strokeWidth={3} 
                className="hover:stroke-white hover:stroke-[5px] transition-all cursor-pointer"
                opacity={0.8}
            />
        );
    };

    const getPortPosition = (nodeId: string, portIndex: number, isOutput: boolean, nodeHeight: number) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return { x: 0, y: 0 };
        const def = NODE_REGISTRY[node.type];
        const yOffset = 40 + (portIndex * 24) + 12; // header height + port index * spacing + half height
        return {
            x: node.x + (isOutput ? node.width : 0),
            y: node.y + yOffset
        };
    };

    return (
        <div className="relative w-full h-full bg-[#1e1e1e] overflow-hidden"
             onContextMenu={(e) => { e.preventDefault(); setNodeMenuOpen({ x: e.clientX, y: e.clientY }); }}
        >
            {/* Toolbar */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-zinc-950/70 backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_10px_30px_rgba(0,0,0,0.5)] p-1.5 rounded-2xl">
                <button onClick={() => setTool('select')} className={\`p-2 rounded-xl transition-all \${tool === 'select' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/10'}\`}>
                    <MousePointer2 size={16} />
                </button>
                <button onClick={() => setTool('pan')} className={\`p-2 rounded-xl transition-all \${tool === 'pan' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/10'}\`}>
                    <Hand size={16} />
                </button>
                <div className="w-px h-6 bg-white/10 mx-1"></div>
                <button onClick={() => setZoom(z => z * 1.1)} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl"><ZoomIn size={16}/></button>
                <button onClick={() => setZoom(z => z / 1.1)} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl"><ZoomOut size={16}/></button>
                <div className="w-px h-6 bg-white/10 mx-1"></div>
                <button 
                    onClick={runWorkflow} 
                    disabled={isExecuting}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                    {isExecuting ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} fill="currentColor"/>}
                    Queue Prompt
                </button>
            </div>

            {/* Canvas */}
            <div 
                ref={canvasRef}
                className={\`w-full h-full absolute inset-0 \${tool === 'pan' ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}\`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
                style={{
                    backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)',
                    backgroundSize: \`\${20 * zoom}px \${20 * zoom}px\`,
                    backgroundPosition: \`\${pan.x}px \${pan.y}px\`
                }}
            >
                <div style={{ transform: \`translate(\${pan.x}px, \${pan.y}px) scale(\${zoom})\`, transformOrigin: '0 0', width: '100%', height: '100%', position: 'absolute' }}>
                    
                    {/* Connections */}
                    <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none z-0">
                        {connections.map(c => {
                            const start = getPortPosition(c.fromNode, NODE_REGISTRY[nodes.find(n=>n.id===c.fromNode)?.type || '']?.outputs.findIndex(p=>p.id===c.fromPort) || 0, true, 0);
                            const end = getPortPosition(c.toNode, NODE_REGISTRY[nodes.find(n=>n.id===c.toNode)?.type || '']?.inputs.findIndex(p=>p.id===c.toPort) || 0, false, 0);
                            const type = NODE_REGISTRY[nodes.find(n=>n.id===c.fromNode)?.type || '']?.outputs.find(p=>p.id===c.fromPort)?.type || 'DEFAULT';
                            return <React.Fragment key={c.id}>{renderConnectionLine(start, end, PORT_COLORS[type])}</React.Fragment>;
                        })}
                        {connectingStart && (
                            renderConnectionLine(
                                connectingStart.isOutput 
                                    ? getPortPosition(connectingStart.nodeId, NODE_REGISTRY[nodes.find(n=>n.id===connectingStart.nodeId)?.type || '']?.outputs.findIndex(p=>p.id===connectingStart.portId) || 0, true, 0)
                                    : mousePos,
                                connectingStart.isOutput
                                    ? mousePos
                                    : getPortPosition(connectingStart.nodeId, NODE_REGISTRY[nodes.find(n=>n.id===connectingStart.nodeId)?.type || '']?.inputs.findIndex(p=>p.id===connectingStart.portId) || 0, false, 0),
                                '#ffffff80'
                            )
                        )}
                    </svg>

                    {/* Nodes */}
                    {nodes.map(node => {
                        const def = NODE_REGISTRY[node.type];
                        if (!def) return null;
                        
                        return (
                            <div 
                                key={node.id}
                                className={\`absolute rounded-xl border border-white/10 shadow-2xl z-10 \${node.data.isExecuting ? 'ring-2 ring-emerald-500 shadow-emerald-500/20' : ''}\`}
                                style={{ 
                                    left: node.x, top: node.y, width: node.width,
                                    backgroundColor: '#2a2a2a', // ComfyUI style dark node
                                }}
                                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                            >
                                {/* Header */}
                                <div className="h-10 bg-gradient-to-r from-zinc-800 to-zinc-900 border-b border-white/5 rounded-t-xl flex items-center justify-between px-3 cursor-grab active:cursor-grabbing">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                        <span className="text-xs font-bold text-slate-200">{def.label}</span>
                                    </div>
                                    <button onMouseDown={(e) => { e.stopPropagation(); deleteNode(node.id); }} className="text-slate-500 hover:text-red-400"><X size={14}/></button>
                                </div>

                                {/* Body with Ports */}
                                <div className="relative">
                                    {/* Input Ports */}
                                    <div className="absolute left-0 top-0 flex flex-col gap-2 pt-2 -translate-x-1.5 z-20">
                                        {def.inputs.map((port, i) => (
                                            <div key={port.id} className="flex items-center group relative h-[16px]">
                                                <div 
                                                    className="w-3 h-3 rounded-full border border-black/50 cursor-crosshair hover:scale-125 transition-transform"
                                                    style={{ backgroundColor: PORT_COLORS[port.type] }}
                                                    onMouseDown={(e) => handlePortMouseDown(e, node.id, port.id, false)}
                                                    onMouseUp={(e) => handlePortMouseUp(e, node.id, port.id, false)}
                                                />
                                                <span className="absolute left-4 text-[9px] font-bold text-slate-400 bg-black/80 px-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">{port.label}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Output Ports */}
                                    <div className="absolute right-0 top-0 flex flex-col gap-2 pt-2 translate-x-1.5 z-20">
                                        {def.outputs.map((port, i) => (
                                            <div key={port.id} className="flex items-center justify-end group relative h-[16px]">
                                                <span className="absolute right-4 text-[9px] font-bold text-slate-400 bg-black/80 px-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">{port.label}</span>
                                                <div 
                                                    className="w-3 h-3 rounded-full border border-black/50 cursor-crosshair hover:scale-125 transition-transform"
                                                    style={{ backgroundColor: PORT_COLORS[port.type] }}
                                                    onMouseDown={(e) => handlePortMouseDown(e, node.id, port.id, true)}
                                                    onMouseUp={(e) => handlePortMouseUp(e, node.id, port.id, true)}
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    {/* Custom Render */}
                                    <div className="min-h-[60px]" onMouseDown={e => e.stopPropagation()}>
                                        {def.render({ node, updateData: updateNodeData })}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Context Menu */}
            {nodeMenuOpen && (
                <div 
                    className="absolute z-50 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl p-2 w-48"
                    style={{ left: nodeMenuOpen.x, top: nodeMenuOpen.y }}
                >
                    <div className="text-[10px] font-bold text-slate-500 uppercase px-2 mb-2">Add Node</div>
                    {Object.values(NODE_REGISTRY).map(def => (
                        <button 
                            key={def.type}
                            onClick={() => addNode(def.type, nodeMenuOpen.x, nodeMenuOpen.y)}
                            className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-indigo-600 hover:text-white rounded-lg transition-colors"
                        >
                            {def.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default InfinityCanvas;
`

fs.writeFileSync('components/InfinityCanvas.tsx', code);
console.log('Successfully wrote the new ComfyUI-style InfinityCanvas.');
