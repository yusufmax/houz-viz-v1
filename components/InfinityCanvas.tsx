
import React, { useState, useRef, useEffect } from 'react';
import {
    Plus, Minus, Move, Image as ImageIcon, Type, Settings, X,
    Download, Upload, Play, Save, Trash2, MousePointer2, Hand,
    ZoomIn, ZoomOut, Undo, Redo, Layers, Grid, Share2,
    Maximize2, Minimize2, ChevronRight, ChevronDown,
    Palette, Wand2, Zap, Layout, Box, Circle, Triangle,
    Eraser, Pencil, Eye, Loader2, History, FileDown,
    ChevronUp, History as HistoryIcon, Camera, FolderOpen, Film, GripHorizontal, Building
} from 'lucide-react';
import { Node, Connection, RenderStyle, Atmosphere, GenerationSettings, AspectRatio, CameraAngle, Project, SceneElements, HistoryItem } from '../types';
import ImageUpload from './ImageUpload';
import DrawEditor from './DrawEditor';
import FullScreenPreview from './FullScreenPreview';
import BeforeAfter from './BeforeAfter';
import { generateImage, editImage, upscaleImage } from '../services/geminiService';
import { upscaleImageReplicate } from '../services/replicateService';
import { useAuth } from '../contexts/AuthProvider';
import { useLanguage } from '../LanguageContext';
import { useSearchParams } from 'react-router-dom';

const InfinityCanvas: React.FC = () => {
    const { t } = useLanguage();
    // ---- State ----
    const [nodes, setNodes] = useState<Node[]>([
        { id: '1', type: 'input', x: 100, y: 100, data: { label: 'Source Image' }, inputs: [] },
        {
            id: '3', type: 'processor', x: 600, y: 100, data: {
                label: 'Arch Render', subtype: 'arch', settings: {
                    style: RenderStyle.Photorealistic,
                    atmosphere: [Atmosphere.Sunny],
                    camera: CameraAngle.Default,
                    aspectRatio: '16:9',
                    prompt: '',
                    sceneElements: {
                        people: false, cars: false, clouds: true, vegetation: true, city: false, motionBlur: false, enhanceFacade: true
                    }
                }
            }, inputs: ['1']
        },
    ]);

    const [connections, setConnections] = useState<Connection[]>([
        { id: 'c1', from: '1', to: '3' },
    ]);

    // Viewport
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const canvasRef = useRef<HTMLDivElement>(null);

    // Interaction
    const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
    const [dragNodeOffset, setDragNodeOffset] = useState({ x: 0, y: 0 });

    // Resizing
    const [resizingNodeId, setResizingNodeId] = useState<string | null>(null);

    // Connections
    const [connectingNodeId, setConnectingNodeId] = useState<string | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    // Context Menus
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, show: boolean, fromNodeId?: string } | null>(null);
    const [projectsMenu, setProjectsMenu] = useState(false);

    // Processing
    const [processingNodes, setProcessingNodes] = useState<Set<string>>(new Set());

    // Edit & Preview
    const [drawingNodeId, setDrawingNodeId] = useState<string | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [previewBeforeImage, setPreviewBeforeImage] = useState<string | undefined>(undefined);

    // History
    const [showHistory, setShowHistory] = useState(false);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const historyFileRef = useRef<HTMLInputElement>(null);
    const projectFileRef = useRef<HTMLInputElement>(null);

    // LocalStorage Projects
    const [projects, setProjects] = useState<Project[]>([]);

    // Supabase & Auth
    const { user } = useAuth(); // Assuming useAuth is available here via context or import
    const { supabase } = React.useMemo(() => import('../lib/supabaseClient').then(m => ({ supabase: m.supabase })), []); // Dynamic import or just import at top

    const [searchParams, setSearchParams] = useSearchParams();
    const projectId = searchParams.get('projectId');

    // ---- Initialization & Autosave ----
    useEffect(() => {
        const loadProject = async () => {
            if (projectId) {
                try {
                    const { supabase } = await import('../lib/supabaseClient');
                    const { data, error } = await supabase
                        .from('projects')
                        .select('*')
                        .eq('id', projectId)
                        .single();

                    if (error) throw error;

                    if (data && data.data) {
                        console.log("Loaded cloud project:", data);
                        const projectData = data.data;
                        setNodes(projectData.nodes || []);
                        setConnections(projectData.connections || []);
                        setPan(projectData.pan || { x: 0, y: 0 });
                        setZoom(projectData.zoom || 1);
                    }
                } catch (e) {
                    console.error("Failed to load cloud project:", e);
                    alert("Failed to load project.");
                }
                return; // Skip local storage check if loading from cloud
            }

            // Load project if passed via localStorage (Legacy/Fallback)
            const loadFromProfile = localStorage.getItem('arch_genius_projects');
            if (loadFromProfile) {
                try {
                    console.log("Loading project from profile redirect:", loadFromProfile);
                    const p = JSON.parse(loadFromProfile);
                    const keys = Object.keys(p);
                    if (keys.length > 0) {
                        const projectData = p[keys[0]]; // Get the first project
                        console.log("Parsed project data:", projectData);
                        if (projectData) {
                            setNodes(projectData.nodes || []);
                            setConnections(projectData.connections || []);
                            setPan(projectData.pan || { x: 0, y: 0 });
                            setZoom(projectData.zoom || 1);
                            console.log("State set with nodes:", projectData.nodes);
                        }
                    }
                    // Clear it so we don't reload it on refresh if we want fresh state
                    localStorage.removeItem('arch_genius_projects');
                } catch (e) {
                    console.warn("Failed to load project from profile redirect", e);
                }
            } else {
                // Try autosave
                const autosave = localStorage.getItem('arch_genius_autosave');
                if (autosave) {
                    try {
                        const p = JSON.parse(autosave);
                        setNodes(p.nodes);
                        setConnections(p.connections);
                        setPan(p.pan);
                        setZoom(p.zoom);
                    } catch (e) { }
                }
            }

            // Load history
            const savedHistory = localStorage.getItem('arch_genius_history');
            if (savedHistory) setHistory(JSON.parse(savedHistory));
        };

        loadProject();

    }, [projectId]);

    // Autosave effect (Disabled to prevent Quota Exceeded errors with large images)
    // TODO: Implement Supabase Autosave
    /*
    useEffect(() => {
        if (nodes.length > 0) {
            const projectData: Project = {
                id: 'autosave',
                name: 'Autosave',
                lastModified: Date.now(),
                nodes,
                connections,
                pan,
                zoom
            };
            try {
                localStorage.setItem('arch_genius_autosave', JSON.stringify(projectData));
            } catch (e) {
                console.warn("Autosave failed: Storage quota exceeded");
            }
        }
    }, [nodes, connections, pan, zoom]);
    */

    const saveProject = async () => {
        if (!user) {
            alert("Please sign in to save projects.");
            return;
        }

        const name = prompt("Enter project name:", `Project ${new Date().toLocaleDateString()} `);
        if (!name) return;

        try {
            // Dynamic import to avoid circular deps if any, or just standard import
            const { supabase } = await import('../lib/supabaseClient');

            // Deep clone nodes to avoid mutating state
            const nodesToSave = JSON.parse(JSON.stringify(nodes));

            // Helper to convert base64 to blob
            const base64ToBlob = async (url: string) => {
                const res = await fetch(url);
                return await res.blob();
            };

            // Upload images to Supabase Storage
            for (const node of nodesToSave) {
                if (node.data && node.data.imageSrc && node.data.imageSrc.startsWith('data:image')) {
                    const blob = await base64ToBlob(node.data.imageSrc);
                    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.png`;

                    const { error: uploadError } = await supabase.storage
                        .from('project-images')
                        .upload(fileName, blob);

                    if (uploadError) {
                        console.error("Image upload failed", uploadError);
                        // Continue? Or fail? Let's warn and maybe keep base64 if upload fails? 
                        // No, better to fail or skip. For now, let's throw to be safe.
                        throw new Error("Failed to upload image");
                    }

                    const { data: { publicUrl } } = supabase.storage
                        .from('project-images')
                        .getPublicUrl(fileName);

                    node.data.imageSrc = publicUrl;
                }
            }

            const projectData = {
                nodes: nodesToSave,
                connections,
                pan,
                zoom
            };

            console.log("Saving project data (optimized):", projectData);

            const currentProjectId = searchParams.get('projectId');

            if (currentProjectId) {
                // Update existing project
                const { error } = await supabase
                    .from('projects')
                    .update({
                        name,
                        data: projectData,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', currentProjectId);

                if (error) throw error;
                alert("Project updated successfully!");
            } else {
                // Create new project
                const { data, error } = await supabase.from('projects').insert({
                    name,
                    description: 'Created via Infinity Canvas',
                    user_id: user.id,
                    data: projectData
                }).select().single();

                if (error) throw error;

                // Update URL with new project ID so subsequent saves are updates
                if (data && data.id) {
                    setSearchParams(prev => {
                        prev.set('projectId', data.id);
                        return prev;
                    });
                }
                alert("New project saved successfully!");
            }
        } catch (e) {
            console.error("Save failed", e);
            alert("Failed to save project. Check console for details.");
        }
    };

    const exportProject = () => {
        const projectData: Project = {
            id: Date.now().toString(),
            name: 'Exported Project',
            lastModified: Date.now(),
            nodes,
            connections,
            pan,
            zoom
        };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(projectData));
        const el = document.createElement('a');
        el.setAttribute("href", dataStr);
        el.setAttribute("download", "arch_genius_project.json");
        document.body.appendChild(el);
        el.click();
        el.remove();
    };

    const importProject = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const p = JSON.parse(event.target?.result as string);
                if (p.nodes && p.connections) {
                    setNodes(p.nodes);
                    setConnections(p.connections);
                    setPan(p.pan || { x: 0, y: 0 });
                    setZoom(p.zoom || 1);
                    setProjectsMenu(false);
                }
            } catch (err) { alert("Invalid Project File"); }
        };
        reader.readAsText(file);
    };

    // Deprecated: deleteProject (handled in Profile), loadProject (handled via redirect)
    // We can keep them if we want an in-canvas menu, but for now let's rely on Profile Page.
    // Or we can fetch from DB here too.

    const [dbProjects, setDbProjects] = useState<any[]>([]);

    const fetchDbProjects = async () => {
        if (!user) return;
        const { supabase } = await import('../lib/supabaseClient');
        const { data } = await supabase.from('projects').select('id, name, updated_at, data').order('updated_at', { ascending: false });
        if (data) setDbProjects(data);
    };

    useEffect(() => {
        if (projectsMenu && user) {
            fetchDbProjects();
        }
    }, [projectsMenu, user]);

    const loadDbProject = (p: any) => {
        if (p.data) {
            setNodes(p.data.nodes || []);
            setConnections(p.data.connections || []);
            setPan(p.data.pan || { x: 0, y: 0 });
            setZoom(p.data.zoom || 1);
            setProjectsMenu(false);
        }
    };

    const addToHistory = (url: string, prompt: string, style: RenderStyle) => {
        const newItem: HistoryItem = {
            id: Date.now().toString(),
            url,
            prompt,
            timestamp: Date.now(),
            style
        };

        // Adaptive save logic
        const trySave = (items: HistoryItem[]) => {
            try {
                const str = JSON.stringify(items);
                localStorage.setItem('arch_genius_history', str);
                setHistory(items);
            } catch (e) {
                if (items.length > 1) {
                    trySave(items.slice(0, items.length - 1));
                } else {
                    console.error("Storage full, could not save history.");
                    setHistory(items);
                }
            }
        };
        trySave([newItem, ...history].slice(0, 10));
    };

    const clearHistory = () => {
        if (confirm("Clear all generation history?")) {
            setHistory([]);
            localStorage.removeItem('arch_genius_history');
        }
    };

    const exportHistory = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(history));
        const el = document.createElement('a');
        el.setAttribute("href", dataStr);
        el.setAttribute("download", "arch_genius_history.json");
        document.body.appendChild(el);
        el.click();
        el.remove();
    };

    const importHistory = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target?.result as string);
                if (Array.isArray(imported)) {
                    const merged = [...imported, ...history];
                    setHistory(merged);
                    try {
                        localStorage.setItem('arch_genius_history', JSON.stringify(merged.slice(0, 10)));
                    } catch (err) { alert("Imported but storage full."); }
                }
            } catch (err) { alert("Invalid JSON"); }
        };
        reader.readAsText(file);
    };

    // ---- Canvas Logic ----

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            if (e.ctrlKey || e.metaKey) {
                const zoomSensitivity = 0.002;
                const delta = -e.deltaY * zoomSensitivity;
                setZoom(z => Math.min(Math.max(0.1, z + delta), 3));
            } else {
                setPan(p => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
            }
        };

        canvas.addEventListener('wheel', onWheel, { passive: false });
        return () => canvas.removeEventListener('wheel', onWheel);
    }, []);

    const getMouseWorldPos = (e: React.MouseEvent) => {
        if (!canvasRef.current) return { x: 0, y: 0 };
        const rect = canvasRef.current.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left - pan.x) / zoom,
            y: (e.clientY - rect.top - pan.y) / zoom
        };
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button === 0 || e.button === 1) {
            setIsDraggingCanvas(true);
            setDragStart({ x: e.clientX, y: e.clientY });
        }
        setContextMenu(null);
    };

    // Moves the node to the end of the array so it renders on top (Z-index effect)
    const bringToFront = (id: string) => {
        setNodes(prev => {
            const index = prev.findIndex(n => n.id === id);
            if (index === -1 || index === prev.length - 1) return prev;
            const newNodes = [...prev];
            const [node] = newNodes.splice(index, 1);
            newNodes.push(node);
            return newNodes;
        });
    };

    const handleNodeMouseDown = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (e.button === 0) {
            bringToFront(id); // Rearrange logic
            setDraggedNodeId(id);
            const worldPos = getMouseWorldPos(e);
            const node = nodes.find(n => n.id === id);
            if (node) {
                setDragNodeOffset({ x: worldPos.x - node.x, y: worldPos.y - node.y });
            }
        }
    };

    const handleResizeMouseDown = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        e.preventDefault();
        setResizingNodeId(id);
    };

    const handlePortMouseDown = (e: React.MouseEvent, nodeId: string, type: 'input' | 'output') => {
        e.stopPropagation();
        if (type === 'output') {
            setConnectingNodeId(nodeId);
        }
    };

    const handlePortMouseUp = (e: React.MouseEvent, nodeId: string, type: 'input' | 'output') => {
        e.stopPropagation();
        if (connectingNodeId && type === 'input' && connectingNodeId !== nodeId) {
            if (!connections.find(c => c.from === connectingNodeId && c.to === nodeId)) {
                setConnections(prev => [...prev, {
                    id: `c-${Date.now()}`,
                    from: connectingNodeId,
                    to: nodeId
                }]);
                setNodes(prev => prev.map(n =>
                    n.id === nodeId ? { ...n, inputs: [...n.inputs, connectingNodeId] } : n
                ));
            }
            setConnectingNodeId(null);
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        const currentMousePos = getMouseWorldPos(e);
        setMousePos(currentMousePos);

        if (resizingNodeId) {
            setNodes(prev => prev.map(n => {
                if (n.id === resizingNodeId) {
                    const newWidth = Math.max(200, currentMousePos.x - n.x);
                    const newHeight = Math.max(100, currentMousePos.y - n.y);
                    return { ...n, width: newWidth, height: newHeight };
                }
                return n;
            }));
            return;
        }

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
        if (connectingNodeId) {
            const rect = canvasRef.current!.getBoundingClientRect();
            setContextMenu({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
                show: true,
                fromNodeId: connectingNodeId
            });
        }

        setIsDraggingCanvas(false);
        setDraggedNodeId(null);
        setConnectingNodeId(null);
        setResizingNodeId(null);
    };

    // ---- Node Operations ----

    const addNode = (type: Node['type'], subtype?: 'general' | 'arch' | 'product') => {
        if (!contextMenu) return;
        const worldX = (contextMenu.x - pan.x) / zoom;
        const worldY = (contextMenu.y - pan.y) / zoom;

        const id = Math.random().toString(36).substr(2, 9);
        let data: any = { label: 'Node' };

        if (type === 'input') data = { label: t('nodeInput') };
        if (type === 'prompt') data = { label: t('nodePrompt'), value: '' };
        if (type === 'output') data = { label: t('nodeOutput') };
        if (type === 'processor') {
            const baseSettings: GenerationSettings = {
                style: RenderStyle.None, atmosphere: [], camera: CameraAngle.Default, aspectRatio: '16:9', prompt: '',
                sceneElements: { people: false, cars: false, clouds: false, vegetation: false, city: false, motionBlur: false, enhanceFacade: false }
            };
            if (subtype === 'arch') {
                data = { label: t('nodeProcessor'), subtype, settings: { ...baseSettings, style: RenderStyle.Modernist, sceneElements: { ...baseSettings.sceneElements, vegetation: true, clouds: true, enhanceFacade: true } } };
            } else if (subtype === 'product') {
                data = { label: t('nodeProduct'), subtype, settings: { ...baseSettings, style: RenderStyle.Photorealistic, aspectRatio: '1:1' } };
            } else {
                data = { label: t('nodeGeneral'), subtype, settings: baseSettings };
            }
        }

        const newNode: Node = { id, type, x: worldX, y: worldY, data, inputs: [] };
        setNodes(prev => [...prev, newNode]);

        if (contextMenu.fromNodeId) {
            setConnections(prev => [...prev, { id: `c-${Date.now()}`, from: contextMenu.fromNodeId!, to: id }]);
            newNode.inputs.push(contextMenu.fromNodeId);
        }

        setContextMenu(null);
    };

    // Accepted overrides to handle immediate execution after state changes
    const runNode = async (nodeId: string, overrideNodes?: Node[], overrideConnections?: Connection[]) => {
        const currentNodes = overrideNodes || nodes;
        const currentConnections = overrideConnections || connections;

        const node = currentNodes.find(n => n.id === nodeId);
        if (!node || node.type !== 'processor') return;

        setProcessingNodes(prev => new Set(prev).add(nodeId));

        try {
            const inputConns = currentConnections.filter(c => c.to === nodeId);
            let sourceImg = null;
            let promptText = node.data.settings?.prompt || "";

            for (const conn of inputConns) {
                const sourceNode = currentNodes.find(n => n.id === conn.from);
                if ((sourceNode?.type === 'input' || sourceNode?.type === 'output' || sourceNode?.type === 'processor') && sourceNode.data.imageSrc) {
                    sourceImg = sourceNode.data.imageSrc;
                }
                if (sourceNode?.type === 'prompt' && sourceNode.data.value) {
                    promptText += (promptText ? " " : "") + sourceNode.data.value;
                }
            }

            const settings: any = { ...node.data.settings, prompt: promptText };

            let result = '';
            if (sourceImg) {
                result = await editImage(sourceImg, settings);
            } else {
                result = await generateImage(settings);
            }

            // Create a new output node
            const newNodeId = Math.random().toString(36).substr(2, 9);
            const newX = node.x + (node.width || 350);
            const newY = node.y;

            const newNode: Node = {
                id: newNodeId,
                type: 'output',
                x: newX,
                y: newY,
                data: {
                    label: t('nodeOutput'),
                    imageSrc: result,
                    beforeImage: sourceImg || undefined
                },
                inputs: [nodeId]
            };

            const newConnection: Connection = { id: `c-${Date.now()}`, from: nodeId, to: newNodeId };

            setNodes(prev => [...prev, newNode]);
            setConnections(prev => [...prev, newConnection]);

            addToHistory(result, promptText, node.data.settings?.style || RenderStyle.None);

        } catch (e) {
            console.error(e);
            alert("Generation failed for this node.");
        } finally {
            setProcessingNodes(prev => {
                const next = new Set(prev);
                next.delete(nodeId);
                return next;
            });
        }
    };

    const handleDrawSave = (img: string) => {
        if (drawingNodeId) {
            setNodes(prev => prev.map(n => n.id === drawingNodeId ? { ...n, data: { ...n.data, imageSrc: img } } : n));
            setDrawingNodeId(null);
        }
    };

    const handleDrawRender = async (img: string, prompt?: string, refImage?: string | null, ratio?: AspectRatio) => {
        if (!drawingNodeId) return;
        const originalNode = nodes.find(n => n.id === drawingNodeId);
        setDrawingNodeId(null);

        // Position new node to the right
        const newX = (originalNode?.x || 0) + (originalNode?.width || 300) + 50;
        const newY = (originalNode?.y || 0);

        const newNodeId = Math.random().toString(36).substr(2, 9);

        // Create placeholder output node
        const placeholderNode: Node = {
            id: newNodeId,
            type: 'output',
            x: newX,
            y: newY,
            width: 320,
            height: 300,
            data: {
                label: 'Edit Result',
                imageSrc: '', // Placeholder for loading state
            },
            inputs: []
        };

        setNodes(prev => [...prev, placeholderNode]);
        setProcessingNodes(prev => new Set(prev).add(newNodeId));

        try {
            const defaultSettings: GenerationSettings = {
                style: RenderStyle.Photorealistic, atmosphere: [], camera: CameraAngle.Default, aspectRatio: 'Original', prompt: '',
                sceneElements: { people: false, cars: false, clouds: false, vegetation: false, city: false, motionBlur: false, enhanceFacade: true }
            };

            const baseSettings = originalNode?.data.settings || defaultSettings;

            const settings: GenerationSettings = {
                ...baseSettings,
                prompt: prompt || baseSettings.prompt || "High quality architectural render",
                styleReferenceImage: refImage || baseSettings.styleReferenceImage,
                aspectRatio: ratio || baseSettings.aspectRatio || 'Original' // Use passed ratio or base
            };

            const result = await editImage(img, settings);

            setNodes(prev => prev.map(n => n.id === newNodeId ? {
                ...n,
                data: {
                    ...n.data,
                    imageSrc: result,
                    beforeImage: img
                }
            } : n));

            addToHistory(result, settings.prompt, settings.style);

        } catch (e) {
            console.error("Edit generation failed", e);
            alert("Failed to generate from edit.");
            setNodes(prev => prev.filter(n => n.id !== newNodeId));
        } finally {
            setProcessingNodes(prev => {
                const next = new Set(prev);
                next.delete(newNodeId);
                return next;
            });
        }
    }

    const handleUpscale = async (nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node || !node.data.imageSrc) return;

        setProcessingNodes(prev => new Set(prev).add(nodeId));
        try {
            // Use Recraft Crisp Upscale via Replicate
            console.log("Calling upscaleImageReplicate...");
            const resultUrl = await upscaleImageReplicate(node.data.imageSrc);
            console.log("Upscale Result URL:", resultUrl);

            // Create a new output node with the upscaled image
            const newNodeId = Math.random().toString(36).substr(2, 9);
            const newNode: Node = {
                id: newNodeId,
                type: 'output',
                x: node.x + (node.width || 350) + 50,
                y: node.y,
                data: {
                    label: 'Upscaled Result',
                    imageSrc: resultUrl,
                    beforeImage: node.data.imageSrc
                },
                inputs: [nodeId]
            };

            setNodes(prev => [...prev, newNode]);
            setConnections(prev => [...prev, { id: `c-${Date.now()}`, from: nodeId, to: newNodeId }]);

        } catch (e: any) {
            console.error("Upscale failed:", e);
            alert(`Upscale failed: ${e.message}`);
        } finally {
            setProcessingNodes(prev => {
                const next = new Set(prev);
                next.delete(nodeId);
                return next;
            });
        }
    };

    const toggleNodeCollapse = (nodeId: string) => {
        setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, data: { ...n.data, collapsed: !n.data.collapsed } } : n));
    };

    const toggleSceneElement = (nodeId: string, key: keyof SceneElements) => {
        setNodes(prev => prev.map(n => {
            if (n.id === nodeId && n.data.settings) {
                const currentElements = n.data.settings.sceneElements || {
                    people: false, cars: false, clouds: false, vegetation: false, city: false, motionBlur: false, enhanceFacade: false
                };
                return {
                    ...n,
                    data: { ...n.data, settings: { ...n.data.settings, sceneElements: { ...currentElements, [key]: !currentElements[key] } } }
                };
            }
            return n;
        }));
    };

    const toggleNodeAtmosphere = (nodeId: string, val: Atmosphere) => {
        setNodes(prev => prev.map(n => {
            if (n.id === nodeId && n.data.settings) {
                const currentAtmospheres = n.data.settings.atmosphere || [];
                const isSelected = currentAtmospheres.includes(val);
                let newSelection = [...currentAtmospheres];

                if (isSelected) {
                    newSelection = newSelection.filter(a => a !== val);
                } else {
                    newSelection = newSelection.filter(a => a !== Atmosphere.None);
                    if (newSelection.length >= 3) newSelection.shift();
                    newSelection.push(val);
                }

                if (newSelection.length === 0) newSelection = [Atmosphere.None];

                return {
                    ...n,
                    data: { ...n.data, settings: { ...n.data.settings, atmosphere: newSelection } }
                };
            }
            return n;
        }));
    };

    const renderConnectionLine = (x1: number, y1: number, x2: number, y2: number, active = false) => {
        const d = `M ${x1} ${y1} C ${x1 + 100} ${y1}, ${x2 - 100} ${y2}, ${x2} ${y2}`;
        return (
            <path
                d={d}
                stroke={active ? "#a855f7" : "#6366f1"}
                strokeWidth="3"
                fill="none"
                strokeDasharray={active ? "5,5" : "none"}
                className="opacity-70 hover:opacity-100 transition-opacity"
            />
        );
    };

    const drawingNode = nodes.find(n => n.id === drawingNodeId);

    return (
        <div
            ref={canvasRef}
            className="relative w-full h-[calc(100vh-64px)] bg-slate-950 overflow-hidden grid-background cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onContextMenu={(e) => { e.preventDefault(); handleMouseDown(e); setContextMenu({ x: e.clientX - canvasRef.current!.getBoundingClientRect().left, y: e.clientY - canvasRef.current!.getBoundingClientRect().top, show: true }); }}
        >
            {/* Full Screen Preview */}
            <FullScreenPreview
                image={previewImage}
                beforeImage={previewBeforeImage}
                onClose={() => setPreviewImage(null)}
            />

            {/* History Sidebar */}
            <div className={`absolute left-0 top-4 bottom-4 bg-slate-900/95 border-r border-slate-700 z-30 transition-all duration-300 flex flex-col ${showHistory ? 'w-64 translate-x-0' : 'w-64 -translate-x-full'}`}>
                <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                    <h3 className="font-bold text-slate-200 flex items-center gap-2"><HistoryIcon size={16} /> {t('history')}</h3>
                    <button onClick={() => setShowHistory(false)} className="p-1 hover:bg-slate-800 rounded"><ChevronRight size={16} /></button>
                </div>
                <div className="flex items-center justify-around p-2 border-b border-slate-800 bg-slate-950/50">
                    <button onClick={exportHistory} className="text-[10px] text-indigo-400 hover:text-indigo-300 flex flex-col items-center">
                        <Download size={12} /> {t('export')}
                    </button>
                    <label className="text-[10px] text-emerald-400 hover:text-emerald-300 flex flex-col items-center cursor-pointer">
                        <Upload size={12} /> {t('import')}
                        <input type="file" ref={historyFileRef} className="hidden" accept=".json" onChange={importHistory} />
                    </label>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                    {history.map(item => (
                        <div key={item.id} className="bg-slate-800 rounded border border-slate-700 overflow-hidden group relative">
                            <img src={item.url} alt="History" className="w-full h-32 object-cover" />
                            <div className="p-2">
                                <p className="text-[10px] text-slate-400 line-clamp-2">{item.prompt}</p>
                            </div>
                            <button
                                onClick={() => { addNode('input'); setNodes(prev => { const last = prev[prev.length - 1]; last.data.imageSrc = item.url; return [...prev]; }); setShowHistory(false); }}
                                className="absolute top-2 right-2 bg-indigo-600 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                {t('addToCanvas')}
                            </button>
                        </div>
                    ))}
                </div>
                {history.length > 0 && (
                    <div className="p-2 border-t border-slate-700">
                        <button onClick={clearHistory} className="w-full flex items-center justify-center gap-2 text-xs text-red-400 hover:bg-red-900/20 p-2 rounded">
                            <Trash2 size={14} /> {t('clear')} {t('history')}
                        </button>
                    </div>
                )}
            </div>

            {/* Projects Overlay */}
            <div className="absolute top-4 left-4 z-20 flex gap-2">
                <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="flex items-center gap-2 bg-slate-800 text-slate-300 px-3 py-2 rounded-lg border border-slate-700 hover:bg-slate-700 text-xs"
                >
                    <HistoryIcon size={14} /> {t('history')}
                </button>
                <button
                    onClick={() => setProjectsMenu(!projectsMenu)}
                    className="flex items-center gap-2 bg-slate-800 text-slate-300 px-3 py-2 rounded-lg border border-slate-700 hover:bg-slate-700 text-xs"
                >
                    <FolderOpen size={14} /> {t('projects')}
                </button>
                <button
                    onClick={saveProject}
                    className="flex items-center gap-2 bg-slate-800 text-slate-300 px-3 py-2 rounded-lg border border-slate-700 hover:bg-slate-700 text-xs"
                >
                    <Save size={14} /> {t('save')}
                </button>
                <button
                    onClick={exportProject}
                    className="flex items-center gap-2 bg-slate-800 text-slate-300 px-3 py-2 rounded-lg border border-slate-700 hover:bg-slate-700 text-xs"
                    title="Download Project File"
                >
                    <Download size={14} />
                </button>
                <label
                    className="flex items-center gap-2 bg-slate-800 text-slate-300 px-3 py-2 rounded-lg border border-slate-700 hover:bg-slate-700 text-xs cursor-pointer"
                    title="Import Project File"
                >
                    <Upload size={14} />
                    <input type="file" ref={projectFileRef} className="hidden" accept=".json" onChange={importProject} />
                </label>
            </div>

            {projectsMenu && (
                <div className="absolute top-16 left-24 z-50 w-64 bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-2">
                    <h3 className="text-xs font-bold text-slate-400 mb-2 px-2">{t('savedProjects')} (Cloud)</h3>
                    {dbProjects.length === 0 && <p className="text-xs text-slate-500 px-2">No projects found.</p>}
                    {dbProjects.map(p => (
                        <div key={p.id} className="flex items-center justify-between hover:bg-slate-800 rounded p-2 group">
                            <button onClick={() => loadDbProject(p)} className="text-left text-xs text-slate-300 flex-1">
                                {p.name} <span className="text-[10px] text-slate-600 block">{new Date(p.updated_at).toLocaleDateString()}</span>
                            </button>
                        </div>
                    ))}
                </div>
            )}
            {/* Canvas Content */}
            <div className="w-full h-full transform origin-top-left" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>

                {/* SVG Layer */}
                <svg className="absolute overflow-visible pointer-events-none z-0">
                    {connections.map(conn => {
                        const fromNode = nodes.find(n => n.id === conn.from);
                        const toNode = nodes.find(n => n.id === conn.to);
                        if (!fromNode || !toNode) return null;
                        const w1 = fromNode.width || (fromNode.type === 'processor' ? 320 : 240);
                        return <g key={conn.id}>{renderConnectionLine(fromNode.x + w1, fromNode.y + 24, toNode.x, toNode.y + 24)}</g>;
                    })}
                    {connectingNodeId && (
                        <g>
                            {(() => {
                                const node = nodes.find(n => n.id === connectingNodeId);
                                if (!node) return null;
                                const w = node.width || (node.type === 'processor' ? 320 : 240);
                                return renderConnectionLine(node.x + w, node.y + 24, mousePos.x, mousePos.y, true);
                            })()}
                        </g>
                    )}
                </svg>

                {/* Nodes */}
                {nodes.map(node => {
                    const isProcessor = node.type === 'processor';
                    const isOutput = node.type === 'output';
                    const defaultWidth = isProcessor ? 320 : 240;
                    const isCollapsed = node.data.collapsed;

                    const sceneSettings = node.data.settings?.sceneElements || {
                        people: false, cars: false, clouds: false, vegetation: false, city: false, motionBlur: false, enhanceFacade: false
                    };

                    return (
                        <div
                            key={node.id}
                            className={`absolute rounded-xl border shadow-2xl flex flex-col z-10 cursor-default transition-all duration-200 ease-out
                        ${isProcessor ? 'bg-slate-900 border-indigo-500/30' : 'bg-slate-900 border-slate-700'}
                        hover:shadow-indigo-500/20 hover:border-indigo-500/50 hover:scale-[1.01]
                    `}
                            style={{
                                transform: `translate(${node.x}px, ${node.y}px)`,
                                width: node.width ? `${node.width}px` : `${defaultWidth}px`,
                                height: isCollapsed ? 'auto' : (node.height ? `${node.height}px` : 'auto')
                            }}
                            onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                        >
                            {/* Node Header */}
                            <div className="h-8 border-b border-slate-800 px-3 flex items-center justify-between bg-slate-900/50 rounded-t-xl flex-none">
                                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    {node.type === 'input' && <ImageIcon size={12} className="text-blue-400" />}
                                    {node.type === 'prompt' && <Type size={12} className="text-emerald-400" />}
                                    {node.type === 'output' && <Film size={12} className="text-pink-400" />}
                                    {node.type === 'processor' && <Zap size={12} className="text-purple-400" />}
                                    {node.data.label}
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={(e) => { e.stopPropagation(); toggleNodeCollapse(node.id) }} className="text-slate-600 hover:text-slate-300">
                                        {isCollapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); setNodes(prev => prev.filter(n => n.id !== node.id)); }} className="text-slate-600 hover:text-red-400">
                                        <X size={12} />
                                    </button>
                                </div>
                            </div>

                            {/* Node Body */}
                            {!isCollapsed && (
                                <div className="p-3 flex flex-col gap-3 flex-1 overflow-hidden animate-in slide-in-from-top-2 fade-in duration-200">

                                    {/* Image Preview (Input/Output/Processor) */}
                                    {(node.type === 'input' || node.type === 'output' || (isProcessor && node.data.imageSrc)) && (
                                        <div className="flex flex-col gap-2 flex-1 min-h-[150px]">
                                            <div className={`relative bg-slate-950 rounded border border-slate-800 overflow-hidden group flex-1`}>
                                                {processingNodes.has(node.id) ? (
                                                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-indigo-400">
                                                        <Loader2 size={32} className="animate-spin mb-2" />
                                                        <span className="text-xs font-medium animate-pulse">{t('generating')}</span>
                                                    </div>
                                                ) : node.data.imageSrc ? (
                                                    node.data.beforeImage ? (
                                                        <BeforeAfter beforeImage={node.data.beforeImage} afterImage={node.data.imageSrc} />
                                                    ) : (
                                                        <img
                                                            src={node.data.imageSrc}
                                                            className="w-full h-full object-contain bg-slate-950"
                                                            alt="content"
                                                            onError={(e) => console.error("Image failed to load:", node.data.imageSrc, e)}
                                                        />
                                                    )
                                                ) : (
                                                    node.type === 'input' ? (
                                                        <ImageUpload compact selectedImage={null} onImageSelected={(img) => setNodes(prev => prev.map(n => n.id === node.id ? { ...n, data: { ...n.data, imageSrc: img || undefined } } : n))} label={t('upload')} />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-700 text-xs">No Image</div>
                                                    )
                                                )}
                                            </div>

                                            {/* Action Buttons Bar */}
                                            {node.data.imageSrc && (
                                                <div className="flex items-center justify-center gap-2" onMouseDown={e => e.stopPropagation()}>
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            try {
                                                                const response = await fetch(node.data.imageSrc!);
                                                                const blob = await response.blob();
                                                                // Create a PNG blob if it's not already (or just force extension)
                                                                // Ideally we use the blob type, but user wants PNG. 
                                                                // If it's webp, we might want to convert, but for now let's just ensure download works.
                                                                // To strictly ensure PNG download from any source:
                                                                const imageBitmap = await createImageBitmap(blob);
                                                                const canvas = document.createElement('canvas');
                                                                canvas.width = imageBitmap.width;
                                                                canvas.height = imageBitmap.height;
                                                                const ctx = canvas.getContext('2d');
                                                                ctx?.drawImage(imageBitmap, 0, 0);
                                                                const pngUrl = canvas.toDataURL('image/png');

                                                                const link = document.createElement('a');
                                                                link.href = pngUrl;
                                                                link.download = `image-${node.id}.png`;
                                                                document.body.appendChild(link);
                                                                link.click();
                                                                document.body.removeChild(link);
                                                            } catch (err: any) {
                                                                console.error("Download failed", err);
                                                                alert(`Download failed: ${err.message}. Check console for details.`);
                                                                // Do NOT fallback to window.open as per user request
                                                            }
                                                        }}
                                                        className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px]"
                                                        title={t('download')}
                                                    >
                                                        <Download size={10} />
                                                    </button>
                                                    <button
                                                        onClick={() => { setPreviewImage(node.data.imageSrc!); setPreviewBeforeImage(node.data.beforeImage); }}
                                                        className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px]"
                                                    >
                                                        <Eye size={10} /> {t('preview')}
                                                    </button>
                                                    <button
                                                        onClick={() => setDrawingNodeId(node.id)}
                                                        className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-indigo-900/50 text-slate-300 hover:text-indigo-300 rounded text-[10px]"
                                                    >
                                                        <Pencil size={10} /> {t('drawEdit')}
                                                    </button>
                                                    {(isOutput || isProcessor) && (
                                                        <button
                                                            onClick={() => handleUpscale(node.id)}
                                                            className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-purple-900/50 text-slate-300 hover:text-purple-300 rounded text-[10px]"
                                                        >
                                                            <Zap size={10} /> {t('upscale')}
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Processor Controls */}
                                    {isProcessor && node.data.settings && (
                                        <div
                                            className="space-y-2 overflow-y-auto custom-scrollbar"
                                            style={{
                                                maxHeight: node.height ? `${node.height - 100}px` : '500px'
                                            }}
                                        >
                                            <textarea
                                                className="w-full h-16 bg-slate-950 border border-slate-800 rounded p-2 text-[10px] text-slate-300 resize-none focus:border-indigo-500 outline-none"
                                                placeholder={t('nodePrompt')}
                                                value={node.data.settings.prompt}
                                                onChange={(e) => {
                                                    const v = e.target.value;
                                                    setNodes(prev => prev.map(n => n.id === node.id ? { ...n, data: { ...n.data, settings: { ...n.data.settings!, prompt: v } } } : n));
                                                }}
                                                onMouseDown={(e) => e.stopPropagation()}
                                            />

                                            {/* Aspect Ratio & Camera */}
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <label className="text-[9px] text-slate-500 font-bold uppercase">{t('aspectRatio')}</label>
                                                    <label className="text-[9px] text-slate-500 font-bold uppercase">{t('camera')}</label>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                    <div className="flex flex-wrap gap-1 flex-1">
                                                        {['16:9', '1:1', '9:16', '4:3', '3:4', 'Original'].map(r => (
                                                            <button
                                                                key={r}
                                                                onClick={(e) => { e.stopPropagation(); setNodes(prev => prev.map(n => n.id === node.id ? { ...n, data: { ...n.data, settings: { ...n.data.settings!, aspectRatio: r as AspectRatio } } } : n)) }}
                                                                className={`px-1.5 py-0.5 text-[9px] rounded border ${node.data.settings!.aspectRatio === r ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-500'}`}
                                                            >
                                                                {r}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <select
                                                        className="bg-slate-950 border border-slate-800 rounded px-1 py-0.5 text-[9px] text-slate-300 outline-none w-24"
                                                        value={node.data.settings.camera}
                                                        onChange={(e) => { e.stopPropagation(); setNodes(prev => prev.map(n => n.id === node.id ? { ...n, data: { ...n.data, settings: { ...n.data.settings!, camera: e.target.value as CameraAngle } } } : n)) }}
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                    >
                                                        {Object.values(CameraAngle).map(c => <option key={c} value={c}>{c}</option>)}
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Dropdowns */}
                                            <div className="space-y-2">
                                                <div>
                                                    <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">{t('stylePreset')}</label>
                                                    <select
                                                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[10px] text-slate-300 outline-none"
                                                        value={node.data.settings.style}
                                                        onChange={(e) => { e.stopPropagation(); setNodes(prev => prev.map(n => n.id === node.id ? { ...n, data: { ...n.data, settings: { ...n.data.settings!, style: e.target.value as RenderStyle } } } : n)) }}
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                    >
                                                        {Object.values(RenderStyle).map(s => <option key={s} value={s}>{t(s as any)}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">{t('atmosphere')}</label>
                                                    {/* Multi-Select Grid for Node */}
                                                    <div className="grid grid-cols-3 gap-1 overflow-hidden">
                                                        {Object.values(Atmosphere).slice(0, 20).map(atm => {
                                                            const isSelected = (node.data.settings!.atmosphere || []).includes(atm);
                                                            return (
                                                                <button
                                                                    key={atm}
                                                                    onClick={(e) => { e.stopPropagation(); toggleNodeAtmosphere(node.id, atm); }}
                                                                    className={`px-1 py-1 text-[8px] rounded border truncate overflow-hidden ${isSelected ? 'bg-indigo-900/50 border-indigo-500 text-indigo-200' : 'bg-slate-950 border-slate-800 text-slate-500'}`}
                                                                    title={atm}
                                                                >
                                                                    <span className="truncate block">{t(atm as any)}</span>
                                                                </button>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Options Toggles */}
                                            <div className="space-y-1 pt-1 border-t border-slate-800/50">
                                                <label className="text-[9px] text-slate-500 font-bold uppercase">{t('sceneElements')}</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {[
                                                        { k: 'enhanceFacade', l: t('enhanceFacade') }, { k: 'motionBlur', l: t('motionBlur') },
                                                        { k: 'vegetation', l: t('greenery') }, { k: 'people', l: t('people') },
                                                        { k: 'cars', l: t('cars') }, { k: 'clouds', l: t('clouds') },
                                                        { k: 'city', l: t('city') }
                                                    ].map((opt: any) => (
                                                        <div
                                                            key={opt.k}
                                                            className="flex items-center justify-between cursor-pointer select-none"
                                                            onClick={(e) => { e.stopPropagation(); toggleSceneElement(node.id, opt.k as keyof SceneElements); }}
                                                            onMouseDown={(e) => e.stopPropagation()}
                                                        >
                                                            <span className="text-[10px] text-slate-400">{opt.l}</span>
                                                            <div
                                                                className={`w-8 h-4 rounded-full relative transition-colors ${((sceneSettings as any)[opt.k]) ? 'bg-indigo-600' : 'bg-slate-800'}`}
                                                            >
                                                                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${((sceneSettings as any)[opt.k]) ? 'left-[18px]' : 'left-0.5'}`}></div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <button
                                                onClick={(e) => { e.stopPropagation(); runNode(node.id) }}
                                                disabled={processingNodes.has(node.id)}
                                                className="mt-2 w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg py-2 font-bold text-xs uppercase tracking-wide shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2 transition-all"
                                            >
                                                {processingNodes.has(node.id) ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                                                {t('generate')}
                                            </button>
                                        </div>
                                    )}

                                    {node.type === 'prompt' && (
                                        <textarea
                                            className="w-full h-24 bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-300 resize-none focus:border-indigo-500 outline-none flex-1"
                                            value={node.data.value}
                                            onChange={(e) => setNodes(prev => prev.map(n => n.id === node.id ? { ...n, data: { ...n.data, value: e.target.value } } : n))}
                                            onMouseDown={(e) => e.stopPropagation()}
                                            placeholder={t('nodePrompt')}
                                        />
                                    )}
                                </div>
                            )}

                            {/* Handles */}
                            {/* Input Ports */}
                            {node.type !== 'input' && (
                                <div
                                    className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-800 rounded-full border-4 border-slate-950 hover:bg-indigo-500 cursor-pointer z-20 flex items-center justify-center transition-colors"
                                    onMouseDown={(e) => handlePortMouseDown(e, node.id, 'input')}
                                    onMouseUp={(e) => handlePortMouseUp(e, node.id, 'input')}
                                    title="Input"
                                >
                                    <div className="w-1.5 h-1.5 bg-slate-500 rounded-full pointer-events-none"></div>
                                </div>
                            )}

                            {/* Output Ports */}
                            {(node.type !== 'output' && node.type !== 'prompt') && (
                                <div
                                    className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-800 rounded-full border-4 border-slate-950 hover:bg-indigo-500 cursor-pointer z-20 flex items-center justify-center transition-colors"
                                    onMouseDown={(e) => handlePortMouseDown(e, node.id, 'output')}
                                    title="Output"
                                >
                                    <div className="w-1.5 h-1.5 bg-slate-500 rounded-full pointer-events-none"></div>
                                </div>
                            )}

                            {/* Prompt Nodes connect to input side logically, but visualize as output source */}
                            {node.type === 'prompt' && (
                                <div
                                    className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-800 rounded-full border-4 border-slate-950 hover:bg-emerald-500 cursor-pointer z-20 flex items-center justify-center transition-colors"
                                    onMouseDown={(e) => handlePortMouseDown(e, node.id, 'output')}
                                    title="Text Output"
                                >
                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full pointer-events-none"></div>
                                </div>
                            )}

                            {/* Chain Result */}
                            {node.type === 'output' && (
                                <div
                                    className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-800 rounded-full border-4 border-slate-950 hover:bg-indigo-500 cursor-pointer z-20 flex items-center justify-center transition-colors"
                                    onMouseDown={(e) => handlePortMouseDown(e, node.id, 'output')}
                                    title="Chain Result"
                                >
                                    <div className="w-1.5 h-1.5 bg-slate-500 rounded-full pointer-events-none"></div>
                                </div>
                            )}

                            {/* Resize Handle */}
                            <div
                                className="absolute bottom-0 right-0 w-5 h-5 cursor-nwse-resize z-20 flex items-center justify-center text-slate-600 hover:text-slate-400"
                                onMouseDown={(e) => handleResizeMouseDown(e, node.id)}
                            >
                                <GripHorizontal size={12} className="-rotate-45" />
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Context Menu */}
            {contextMenu && contextMenu.show && (
                <div
                    className="absolute z-50 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl p-1 min-w-[180px] flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-100"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <div className="text-[10px] font-bold text-slate-500 px-3 py-1 uppercase tracking-wider">{t('addNode')}</div>
                    <button onClick={() => addNode('input')} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-800 rounded text-xs text-left text-slate-300 hover:text-white transition-colors">
                        <ImageIcon size={14} className="text-blue-400" /> {t('nodeInput')}
                    </button>
                    <button onClick={() => addNode('prompt')} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-800 rounded text-xs text-left text-slate-300 hover:text-white transition-colors">
                        <Type size={14} className="text-emerald-400" /> {t('nodePrompt')}
                    </button>
                    <div className="h-px bg-slate-800 my-1"></div>
                    <button onClick={() => addNode('processor', 'arch')} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-800 rounded text-xs text-left text-slate-300 hover:text-white transition-colors">
                        <Building size={14} className="text-purple-400" /> {t('nodeProcessor')}
                    </button>
                    <button onClick={() => addNode('processor', 'product')} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-800 rounded text-xs text-left text-slate-300 hover:text-white transition-colors">
                        <Box size={14} className="text-amber-400" /> {t('nodeProduct')}
                    </button>
                    <div className="h-px bg-slate-800 my-1"></div>
                    <button onClick={() => addNode('output')} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-800 rounded text-xs text-left text-slate-300 hover:text-white transition-colors">
                        <Film size={14} className="text-pink-400" /> {t('nodeOutput')}
                    </button>
                </div>
            )}

            {/* Draw Editor Modal */}
            {drawingNodeId && drawingNode && (
                <DrawEditor
                    initialImage={drawingNode.data.imageSrc || null}
                    onSave={handleDrawSave}
                    onRender={handleDrawRender}
                    onClose={() => setDrawingNodeId(null)}
                />
            )}
        </div>
    );
};

export default InfinityCanvas;
