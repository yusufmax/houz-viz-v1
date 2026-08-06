
import React, { useState, useRef, useEffect } from 'react';
import {
    Plus, Minus, Move, Image as ImageIcon, Type, Settings, X,
    Download, Upload, Play, Save, Trash2, MousePointer2, Hand,
    ZoomIn, ZoomOut, Undo, Redo, Layers, Grid, Share2,
    Maximize2, Minimize2, Maximize, ChevronRight, ChevronDown,
    Palette, Wand2, Zap, Layout, Box, Circle, Triangle,
    Eraser, Pencil, Eye, Loader2, History, FileDown,
    ChevronUp, History as HistoryIcon, Camera, FolderOpen, Film, GripHorizontal, Building, Shirt, Scissors, Footprints, ShoppingBag, Sparkles, Package
} from 'lucide-react';
import { Node, Connection, RenderStyle, Atmosphere, GenerationSettings, AspectRatio, CameraAngle, Project, SceneElements, HistoryItem, SuperAtmosphere, SuperRenderStyle, CameraLens, Tag } from '../types';
import ImageUpload from './ImageUpload';
import DrawEditor from './DrawEditor';
import FullScreenPreview from './FullScreenPreview';
import BeforeAfter from './BeforeAfter';
import { generateImage, editImage, upscaleImage } from '../services/geminiService';
import { upscaleImageReplicate } from '../services/replicateService';
import { useAuth } from '../contexts/AuthProvider';
import { useLanguage } from '../LanguageContext';
import { useDesignMode } from '../contexts/DesignModeContext';
import { useSearchParams } from 'react-router-dom';
import { fetchUserReferenceImages, ReferenceImage } from '../services/referenceImageService';
import { quotaService } from '../services/quotaService';
import { getHouzaiFilename } from '../utils/filenameUtils';
import { VideoNodePanel, AdvancedRefNodePanel, UpscaleNodePanel, ArchProcessorNodePanel } from './InfinityExpandedNodes';

const STYLE_LIBRARY = [
    // Living Complex / House
    { name: 'Modern Villa', url: 'https://images.unsplash.com/photo-1600596542815-3ad196bb8700?w=200&q=80' },
    { name: 'Luxury Apt', url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=200&q=80' },
    { name: 'Townhouse', url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=200&q=80' },
    // Commercial
    { name: 'Office Tower', url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=200&q=80' },
    { name: 'Retail Store', url: 'https://images.unsplash.com/photo-1564069114553-7215e1ff1890?w=200&q=80' },
    { name: 'Museum', url: 'https://images.unsplash.com/photo-1503594384566-461fe158e797?w=200&q=80' },
    // Cultural Styles
    { name: 'Pan Arabic', url: 'https://images.unsplash.com/photo-1544211210-082b71d0630c?w=200&q=80' },
    { name: 'Asian Zen', url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=200&q=80' },
    { name: 'Mediterranean', url: 'https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=200&q=80' },
    { name: 'Brutalist', url: 'https://images.unsplash.com/photo-1534237710431-e2fc698436d0?w=200&q=80' }
];

const CATEGORY_ICONS: Record<string, any> = {
    'Top': <Shirt size={12} />,
    'Bottom': <Scissors size={12} />,
    'Shoes': <Footprints size={12} />,
    'Accessories': <ShoppingBag size={12} />,
    'Full Body': <Sparkles size={12} />,
    'Other': <Package size={12} />
};

const InfinityCanvas: React.FC = () => {
    const { t } = useLanguage();
    const { isApple } = useDesignMode();

    // ---- Constants ----
    const baseSettings: GenerationSettings = {
        style: RenderStyle.Photorealistic,
        atmosphere: [Atmosphere.Sunny],
        camera: CameraAngle.Default,
        aspectRatio: '16:9',
        prompt: '',
        sceneElements: {
            people: false,
            cars: false,
            clouds: true,
            vegetation: true,
            city: false,
            motionBlur: false,
            enhanceFacade: true
        }
    };

    // ---- State ----
    const [nodes, setNodes] = useState<Node[]>([
        { id: '1', type: 'input', x: 100, y: 100, data: { label: 'Source Image' }, inputs: [] },
        { id: '2', type: 'processor', x: 400, y: 100, data: { label: t('nodeProcessor'), subtype: 'general', settings: baseSettings }, inputs: [] },
        { id: '3', type: 'output', x: 700, y: 100, data: { label: 'Result Image' }, inputs: [] }
    ]);

    const [connections, setConnections] = useState<Connection[]>([
        { id: 'c1', from: '1', to: '2' },
        { id: 'c2', from: '2', to: '3' }
    ]);

    // ---- Initialization & Checks ----
    useEffect(() => {
        const pending = localStorage.getItem('pending_super_node');
        if (pending) {
            try {
                const data = JSON.parse(pending);
                if (data.type === 'super' && data.settings) {
                    const newNode: Node = {
                        id: Date.now().toString(),
                        type: 'processor',
                        x: 100,
                        y: 350,
                        data: {
                            label: 'Marketing AI',
                            subtype: 'super',
                            settings: {
                                ...data.settings,
                                model: 'gemini-3-pro-image-preview',
                                superMode: {
                                    ...data.settings,
                                    productCategory: data.settings.productCategory || 'Clothing',
                                    garments: data.settings.garments || [
                                        { id: 'g1', type: 'Top', image: null },
                                        { id: 'g2', type: 'Bottom', image: null }
                                    ]
                                }
                            }
                        },
                        width: 400,
                        height: 600,
                        inputs: []
                    };
                    setNodes(prev => [...prev, newNode]);
                }
            } catch (e) {
                console.error("Failed to parse pending super node", e);
            } finally {
                localStorage.removeItem('pending_super_node');
            }
        }
    }, [setNodes]);

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
    const [connectingFromPort, setConnectingFromPort] = useState<string | null>(null);
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

    // Reference Images
    const [customReferenceImages, setCustomReferenceImages] = useState<ReferenceImage[]>([]);

    // Model Selection
    const [selectedModel, setSelectedModel] = useState<string>('gemini-2.5-flash-image');

    // Quota
    const [quota, setQuota] = useState<{ used: number; limit: number } | null>(null);

    // Project Metadata for Auto-save
    const [currentProjectName, setCurrentProjectName] = useState<string | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [lastSaveTime, setLastSaveTime] = useState<number | null>(null);

    // ---- Initialization & Autosave ----
    useEffect(() => {
        // Load quota
        const loadQuota = async () => {
            if (!user) return;
            try {
                const q = await quotaService.getUserQuota(user.id);
                if (q) {
                    setQuota({ used: q.used, limit: q.quota });
                }
            } catch (error) {
                console.error('Error fetching quota:', error);
            }
        };
        loadQuota();

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

                        // Set project name and reset unsaved changes
                        setCurrentProjectName(data.name);
                        setHasUnsavedChanges(false);
                        setLastSaveTime(Date.now());
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

            // Fetch user's custom reference images
            if (user) {
                fetchUserReferenceImages(user.id).then(refs => {
                    setCustomReferenceImages(refs);
                }).catch(err => {
                    console.error('Failed to load custom reference images:', err);
                });
            }
        };

        loadProject();

    }, [projectId, user]);


    // Auto-save for cloud projects every 5 minutes
    useEffect(() => {
        if (!user || !projectId || !currentProjectName) return; // Only auto-save named cloud projects

        const autoSaveInterval = setInterval(async () => {
            if (hasUnsavedChanges) {
                console.log('Auto-saving project...');
                await saveProject(false); // Save without prompting
            }
        }, 5 * 60 * 1000); // 5 minutes

        return () => clearInterval(autoSaveInterval);
    }, [user, projectId, hasUnsavedChanges, currentProjectName]);

    // Track changes to mark as unsaved
    useEffect(() => {
        // Only mark as unsaved if we've saved at least once
        if (lastSaveTime !== null) {
            setHasUnsavedChanges(true);
        }
    }, [nodes, connections, pan, zoom]);


    const saveProject = async (promptForName = false) => {
        if (!user) {
            alert("Please sign in to save projects.");
            return;
        }

        let projectName = currentProjectName;

        // Only prompt if explicitly requested OR if it's a new project without a name
        if (promptForName || !projectName) {
            const input = prompt("Enter project name:", projectName || `Project ${new Date().toLocaleDateString()}`);
            if (!input) return;
            projectName = input;
        }

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
                        name: projectName,
                        data: projectData,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', currentProjectId);

                if (error) throw error;

                // Update state after successful save
                setCurrentProjectName(projectName);
                setHasUnsavedChanges(false);
                setLastSaveTime(Date.now());

                if (!promptForName) {
                    console.log(`Project "${projectName}" saved successfully`);
                } else {
                    alert(`Project "${projectName}" updated successfully!`);
                }
            } else {
                // Create new project
                const { data, error } = await supabase.from('projects').insert({
                    name: projectName,
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

                // Update state after successful save
                setCurrentProjectName(projectName);
                setHasUnsavedChanges(false);
                setLastSaveTime(Date.now());

                alert(`New project "${projectName}" saved successfully!`);
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

    const createNewProject = async () => {
        // Auto-save current project if it has unsaved changes
        if (hasUnsavedChanges && currentProjectName) {
            const shouldSave = confirm(`Save changes to "${currentProjectName}" before creating a new project?`);
            if (shouldSave) {
                await saveProject(false);
            }
        }

        // Clear canvas
        setNodes([
            { id: '1', type: 'input', x: 100, y: 100, data: { label: 'Source Image' }, inputs: [] }
        ]);
        setConnections([]);
        setPan({ x: 0, y: 0 });
        setZoom(1);

        // Reset project state
        setCurrentProjectName(null);
        setHasUnsavedChanges(false);
        setLastSaveTime(null);

        // Clear projectId from URL
        setSearchParams(new URLSearchParams());

        console.log('New project created');
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

    const getMouseWorldPos = (e: React.MouseEvent | React.TouchEvent) => {
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
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        setContextMenu(null);
        if (e.touches.length === 1) {
            setIsDraggingCanvas(true);
            setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
        }
    };

    const handleNodeTouchStart = (e: React.TouchEvent, id: string) => {
        e.stopPropagation();
        bringToFront(id);
        setDraggedNodeId(id);
        const worldPos = getMouseWorldPos(e);
        const node = nodes.find(n => n.id === id);
        if (node) {
            setDragNodeOffset({ x: worldPos.x - node.x, y: worldPos.y - node.y });
        }
    };

    const handleResizeTouchStart = (e: React.TouchEvent, id: string) => {
        e.stopPropagation();
        setResizingNodeId(id);
    };

    const handlePortTouchStart = (e: React.TouchEvent, nodeId: string, type: 'input' | 'output', portId?: string) => {
        e.stopPropagation();
        if (type === 'output') {
            setConnectingNodeId(nodeId);
            setConnectingFromPort(portId || null);
        }
    };

    const handlePortTouchEnd = (e: React.TouchEvent, nodeId: string, type: 'input' | 'output', portId?: string) => {
        e.stopPropagation();
        if (connectingNodeId && type === 'input' && connectingNodeId !== nodeId) {
            if (!connections.find(c => c.from === connectingNodeId && c.to === nodeId && c.fromPort === connectingFromPort && c.toPort === portId)) {
                setConnections(prev => [...prev, {
                    id: `c-${Date.now()}`,
                    from: connectingNodeId,
                    fromPort: connectingFromPort || undefined,
                    to: nodeId,
                    toPort: portId
                }]);
                setNodes(prev => prev.map(n =>
                    n.id === nodeId && !n.inputs.includes(connectingNodeId) ? { ...n, inputs: [...n.inputs, connectingNodeId] } : n
                ));
            }
            setConnectingNodeId(null);
            setConnectingFromPort(null);
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length === 1) {
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
                const dx = e.touches[0].clientX - dragStart.x;
                const dy = e.touches[0].clientY - dragStart.y;
                setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
                setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
            } else if (draggedNodeId) {
                setNodes(prev => prev.map(n =>
                    n.id === draggedNodeId
                        ? { ...n, x: currentMousePos.x - dragNodeOffset.x, y: currentMousePos.y - dragNodeOffset.y }
                        : n
                ));
            }
        }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (connectingNodeId) {
            const rect = canvasRef.current!.getBoundingClientRect();
            const touch = e.changedTouches[0];
            setContextMenu({
                x: touch.clientX - rect.left,
                y: touch.clientY - rect.top,
                show: true,
                fromNodeId: connectingNodeId
            });
        }

        setIsDraggingCanvas(false);
        setDraggedNodeId(null);
        setConnectingNodeId(null);
        setResizingNodeId(null);
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

    const handlePortMouseDown = (e: React.MouseEvent, nodeId: string, type: 'input' | 'output', portId?: string) => {
        e.stopPropagation();
        if (type === 'output') {
            setConnectingNodeId(nodeId);
            setConnectingFromPort(portId || null);
        }
    };

    const handlePortMouseUp = (e: React.MouseEvent, nodeId: string, type: 'input' | 'output', portId?: string) => {
        e.stopPropagation();
        if (connectingNodeId && type === 'input' && connectingNodeId !== nodeId) {
            if (!connections.find(c => c.from === connectingNodeId && c.to === nodeId && c.fromPort === connectingFromPort && c.toPort === portId)) {
                setConnections(prev => [...prev, {
                    id: `c-${Date.now()}`,
                    from: connectingNodeId,
                    fromPort: connectingFromPort || undefined,
                    to: nodeId,
                    toPort: portId
                }]);
                setNodes(prev => prev.map(n =>
                    n.id === nodeId && !n.inputs.includes(connectingNodeId) ? { ...n, inputs: [...n.inputs, connectingNodeId] } : n
                ));
            }
            setConnectingNodeId(null);
            setConnectingFromPort(null);
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

    const addNode = (type: Node['type'], subtype?: 'general' | 'arch' | 'product' | 'super' | 'video' | 'upscaler' | 'advanced_ref') => {
        if (!contextMenu) return;
        const worldX = (contextMenu.x - pan.x) / zoom;
        const worldY = (contextMenu.y - pan.y) / zoom;

        const id = Math.random().toString(36).substr(2, 9);
        let data: any = { label: 'Node' };

        if (type === 'input') data = { label: t('nodeInput') };
        if (type === 'prompt') data = { label: t('nodePrompt'), value: '' };
        if (type === 'output') data = { label: t('nodeOutput') };
        if (type === 'video') data = { label: 'Video Synthesizer', subtype: 'video', videoSettings: { model_name: 'kling-v3', multi_shot: "false", shot_type: 'customize' } };
        if (type === 'advanced_ref') data = { label: 'Categorical References', subtype: 'advanced_ref', customReferences: [] };
        if (type === 'upscaler') data = { label: 'AI Upscaler', subtype: 'upscaler', upscaleSettings: { scale: 2, optimize_for: 'photography', resolution: '4K' } };
        if (type === 'processor') {
            const baseSettings: GenerationSettings = {
                style: RenderStyle.None, atmosphere: [], camera: CameraAngle.Default, aspectRatio: '16:9', prompt: '',
                sceneElements: { people: false, cars: false, clouds: false, vegetation: false, city: false, motionBlur: false, enhanceFacade: false },
                keepBuilding: false, lockCamera: false, lockInterior: false
            };
            if (subtype === 'arch') {
                data = { label: t('nodeProcessor'), subtype, settings: { ...baseSettings, style: RenderStyle.Modernist, sceneElements: { ...baseSettings.sceneElements, vegetation: true, clouds: true, enhanceFacade: true } } };
            } else if (subtype === 'product') {
                data = { label: t('nodeProduct'), subtype, settings: { ...baseSettings, style: RenderStyle.Photorealistic, aspectRatio: '1:1' } };
            } else if (subtype === 'super') {
                data = {
                    label: 'Marketing AI',
                    subtype,
                    settings: {
                        ...baseSettings,
                        model: 'gemini-3-pro-image-preview',
                        superMode: {
                            productCategory: 'Clothing',
                            lighting: SuperAtmosphere.StudioSoftbox,
                            background: '',
                            focus: 'Object',
                            cameraAngle: 'Eye Level',
                            isVirtualTryOn: true,
                            garments: [
                                { id: 'g1', type: 'Top', image: null },
                                { id: 'g2', type: 'Bottom', image: null }
                            ]
                        }
                    }
                };
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
        if (!node || !['processor', 'video', 'upscaler'].includes(node.type)) return;

        setProcessingNodes(prev => new Set(prev).add(nodeId));

        try {
            // Check quota before generation
            if (!user) {
                alert("Please sign in to generate images.");
                return;
            }

            const canGenerate = await quotaService.checkQuota(user.id);
            if (!canGenerate) {
                alert("🚫 Quota Exceeded! You have used all your generation credits. Please contact support or upgrade your plan.");
                return;
            }

            const inputConns = currentConnections.filter(c => c.to === nodeId);
            let sourceImg = null;
            let promptText = node.data.settings?.prompt || "";
            const dynamicSettings: Partial<GenerationSettings> = {};

            for (const conn of inputConns) {
                const sourceNode = currentNodes.find(n => n.id === conn.from);
                
                if (sourceNode?.type === 'prompt' && sourceNode.data.value) {
                    promptText += (promptText ? " " : "") + sourceNode.data.value;
                } else if ((sourceNode?.type === 'input' || sourceNode?.type === 'output' || sourceNode?.type === 'processor') && sourceNode.data.imageSrc) {
                    const imgUrl = sourceNode.data.imageSrc;
                    
                    if (conn.toPort === 'ref1') {
                        dynamicSettings.styleReferenceImage = imgUrl;
                    } else if (conn.toPort === 'ref2') {
                        dynamicSettings.architectureReferenceImage = imgUrl;
                    } else if (conn.toPort === 'ref3') {
                        dynamicSettings.atmosphereReferenceImage = imgUrl;
                    } else if (conn.toPort === 'ref4' || conn.toPort === 'ref5') {
                        if (!dynamicSettings.customReferences) dynamicSettings.customReferences = [];
                        dynamicSettings.customReferences.push({
                            id: Math.random().toString(),
                            category: 'Custom',
                            image: imgUrl,
                            prompt: 'Additional Context Reference'
                        });
                    } else if (conn.toPort !== 'text') {
                        // Default fallback mapping is source image
                        sourceImg = imgUrl;
                    }
                }
            }

            const settings: GenerationSettings = { ...node.data.settings, ...dynamicSettings, prompt: promptText };

            let result = '';
            
            if (node.type === 'upscaler' && sourceImg) {
                const { upscaleImageReplicate } = await import('../services/replicateService');
                result = await upscaleImageReplicate(sourceImg);
            } else if (node.type === 'video' && sourceImg) {
                // Resize for Kling
                const resizeImage = (imageSrc: string): Promise<string> => {
                    return new Promise((resolve, reject) => {
                        const img = new Image();
                        img.crossOrigin = "anonymous";
                        img.onload = () => {
                            const canvas = document.createElement('canvas');
                            let width = img.width;
                            let height = img.height;
                            const maxDim = 2048;
                            if (width > maxDim || height > maxDim) {
                                if (width > height) {
                                    height = Math.round((height * maxDim) / width);
                                    width = maxDim;
                                } else {
                                    width = Math.round((width * maxDim) / height);
                                    height = maxDim;
                                }
                            }
                            canvas.width = width;
                            canvas.height = height;
                            const ctx = canvas.getContext('2d');
                            if (!ctx) return reject(new Error('Canvas ctx failed'));
                            ctx.drawImage(img, 0, 0, width, height);
                            resolve(canvas.toDataURL('image/jpeg', 0.9));
                        };
                        img.onerror = reject;
                        img.src = imageSrc;
                    });
                };
                
                const processedImage = await resizeImage(sourceImg);
                
                const response = await fetch('/api/kling-video', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                       action: 'generate',
                       image: processedImage,
                       prompt: promptText || node.data.videoSettings?.prompt || '',
                       model_name: node.data.videoSettings?.model_name || 'kling-v3',
                       duration: node.data.videoSettings?.duration || '5',
                    })
                });
                
                const data = await response.json();
                if (data.error) throw new Error(data.error);
                
                // Polling Loop
                const taskId = data.task_id;
                let isDone = false;
                while (!isDone) {
                    await new Promise(r => setTimeout(r, 4000));
                    const pollRes = await fetch('/api/kling-video', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'poll', task_id: taskId })
                    });
                    const pollData = await pollRes.json();
                    if (pollData.error) throw new Error(pollData.error);
                    
                    if (pollData.status === 'success' && pollData.video_url) {
                        result = pollData.video_url;
                        isDone = true;
                    } else if (pollData.status === 'failed' || pollData.status === 99) {
                        throw new Error('Video generation failed at remote server.');
                    }
                }
            } else {
                // Advanced Ref injection (Nano Banana defaults to customReferences if present)
                if (node.data.customReferences && node.data.customReferences.length > 0) {
                    settings.customReferences = node.data.customReferences;
                    settings.model = 'gemini-3.1-flash-image-preview'; // Force Advanced format
                }
                
                // Super Mode handle
                if (node.data.subtype === 'super' && settings.superMode) {
                    if (sourceImg) {
                        result = await editImage(sourceImg, settings);
                    } else {
                        result = await generateImage(settings);
                    }
                } else if (sourceImg) {
                    result = await editImage(sourceImg, settings);
                } else {
                    result = await generateImage(settings);
                }
            }

            // Increment quota after successful generation
            await quotaService.incrementUsage(user.id);

            // Refresh quota display
            const updatedQuota = await quotaService.getUserQuota(user.id);
            if (updatedQuota) {
                setQuota({ used: updatedQuota.used, limit: updatedQuota.quota });
            }

            // Create a new output node
            const newNodeId = Math.random().toString(36).substr(2, 9);
            const newX = node.x + (node.width || 350) + 50;
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

    const run4Shot = async (nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node || node.data.subtype !== 'super') return;

        setProcessingNodes(prev => new Set(prev).add(nodeId));

        try {
            if (!user) {
                alert("Please sign in.");
                return;
            }

            const inputConns = connections.filter(c => c.to === nodeId);
            let sourceImg = null;
            for (const conn of inputConns) {
                const sourceNode = nodes.find(n => n.id === conn.from);
                if (sourceNode?.data.imageSrc) sourceImg = sourceNode.data.imageSrc;
            }

            const baseSettings = { ...node.data.settings };
            const angles = ['Hero shot', 'Low angle', 'Eye Level', 'Side View'];

            for (let i = 0; i < angles.length; i++) {
                const angle = angles[i];
                const shotSettings: GenerationSettings = {
                    ...baseSettings,
                    prompt: `${baseSettings.prompt || ''} ${angle} view`.trim(),
                    superMode: {
                        ...baseSettings.superMode!,
                        cameraAngle: angle as any
                    }
                };

                const result = sourceImg
                    ? await editImage(sourceImg, shotSettings)
                    : await generateImage(shotSettings);

                // Update node and history for each shot
                setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, data: { ...n.data, imageSrc: result } } : n));
                addToHistory(result, shotSettings.prompt || '', shotSettings.style || RenderStyle.Photorealistic);
                await quotaService.incrementUsage(user.id);
            }

            // After sequence, refresh quota
            const updatedQuota = await quotaService.getUserQuota(user.id);
            if (updatedQuota) setQuota({ used: updatedQuota.used, limit: updatedQuota.quota });

        } catch (error: any) {
            console.error('4-Shot error:', error);
            alert(error.message || '4-Shot failed');
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

    const handleDrawRender = async (img: string, prompt?: string, refImage?: string | null, ratio?: AspectRatio, model?: string, tags?: Tag[]) => {
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
            // Check quota before generation
            if (!user) {
                alert("Please sign in to generate images.");
                setNodes(prev => prev.filter(n => n.id !== newNodeId));
                return;
            }

            const canGenerate = await quotaService.checkQuota(user.id);
            if (!canGenerate) {
                alert("🚫 Quota Exceeded! You have used all your generation credits. Please contact support or upgrade your plan.");
                setNodes(prev => prev.filter(n => n.id !== newNodeId));
                return;
            }

            const defaultSettings: GenerationSettings = {
                style: RenderStyle.Photorealistic, atmosphere: [], camera: CameraAngle.Default, aspectRatio: '16:9', prompt: '',
                sceneElements: { people: false, cars: false, clouds: false, vegetation: false, city: false, motionBlur: false, enhanceFacade: true }
            };

            const baseSettings = originalNode?.data.settings || defaultSettings;

            const settings: GenerationSettings = {
                ...baseSettings,
                prompt: prompt || baseSettings.prompt || "High quality architectural render",
                styleReferenceImage: refImage || baseSettings.styleReferenceImage,
                aspectRatio: ratio || baseSettings.aspectRatio || '16:9', // Use passed ratio or base
                model: model || selectedModel, // Use passed model or current selection
                tags: tags || []
            };

            const result = await editImage(img, settings);

            // Increment quota after successful generation
            await quotaService.incrementUsage(user.id);

            // Refresh quota display
            const updatedQuota = await quotaService.getUserQuota(user.id);
            if (updatedQuota) {
                setQuota({ used: updatedQuota.used, limit: updatedQuota.quota });
            }

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

    const updateNodeGarment = (nodeId: string, garmentId: string, updates: Partial<{ type: any, image: string | null }>) => {
        setNodes(prev => prev.map(n => {
            if (n.id === nodeId && n.data.settings?.superMode) {
                const currentGarments = n.data.settings.superMode.garments || [];
                return {
                    ...n,
                    data: {
                        ...n.data,
                        settings: {
                            ...n.data.settings,
                            superMode: {
                                ...n.data.settings.superMode,
                                garments: currentGarments.map(g => g.id === garmentId ? { ...g, ...updates } : g)
                            }
                        }
                    }
                };
            }
            return n;
        }));
    };

    const addNodeGarmentSlot = (nodeId: string) => {
        setNodes(prev => prev.map(n => {
            if (n.id === nodeId && n.data.settings?.superMode) {
                const currentGarments = n.data.settings.superMode.garments || [];
                if (currentGarments.length >= 5) return n;
                return {
                    ...n,
                    data: {
                        ...n.data,
                        settings: {
                            ...n.data.settings,
                            superMode: {
                                ...n.data.settings.superMode,
                                garments: [...currentGarments, { id: Date.now().toString(), type: 'Other', image: null }]
                            }
                        }
                    }
                };
            }
            return n;
        }));
    };

    const removeNodeGarmentSlot = (nodeId: string, garmentId: string) => {
        setNodes(prev => prev.map(n => {
            if (n.id === nodeId && n.data.settings?.superMode) {
                const currentGarments = n.data.settings.superMode.garments || [];
                return {
                    ...n,
                    data: {
                        ...n.data,
                        settings: {
                            ...n.data.settings,
                            superMode: {
                                ...n.data.settings.superMode,
                                garments: currentGarments.filter(g => g.id !== garmentId)
                            }
                        }
                    }
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
            className="relative w-full h-[calc(100vh-64px)] bg-black overflow-hidden grid-background cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onContextMenu={(e) => { e.preventDefault(); handleMouseDown(e); setContextMenu({ x: e.clientX - canvasRef.current!.getBoundingClientRect().left, y: e.clientY - canvasRef.current!.getBoundingClientRect().top, show: true }); }}
        >

            {/* Full Screen Preview */}
            <FullScreenPreview
                image={previewImage}
                beforeImage={previewBeforeImage}
                onClose={() => setPreviewImage(null)}
            />

            {/* History Sidebar */}
            <div className={`absolute left-0 top-4 bottom-4 bg-zinc-950/60 backdrop-blur-2xl border-r border-white/10 border-b-black/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),inset_0_24px_48px_rgba(255,255,255,0.05),0_10px_30px_rgba(0,0,0,0.5)] z-30 transition-all duration-300 flex flex-col ${showHistory ? 'w-64 translate-x-0' : 'w-64 -translate-x-full'}`}>
                <div className="p-4 border-b border-white/10 flex justify-between items-center relative z-10">
                    <h3 className="font-bold text-zinc-100 flex items-center gap-2"><HistoryIcon size={16} /> {t('history')}</h3>
                    <button onClick={() => setShowHistory(false)} className="p-1 hover:bg-zinc-900 rounded"><ChevronRight size={16} /></button>
                </div>
                <div className="flex items-center justify-around p-2 border-b border-white/5 bg-black/50">
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
                        <div key={item.id} className="bg-zinc-900 rounded border border-white/10 overflow-hidden group relative">
                            <img src={item.url} alt="History" className="w-full h-32 object-cover" />
                            <div className="p-2">
                                <p className="text-[10px] text-zinc-500 line-clamp-2">{item.prompt}</p>
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
                    <div className="p-2 border-t border-white/10">
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
                    className={isApple
                        ? "apple-glass-interactive rounded-full px-3.5 py-1.5 text-xs text-slate-200 flex items-center gap-2"
                        : "flex items-center gap-2 bg-zinc-900/60 backdrop-blur-md shadow-lg text-zinc-300 px-3 py-2 rounded-lg border border-white/10 hover:bg-white/10 hover:text-white transition-all text-xs"
                    }
                >
                    <HistoryIcon size={14} /> {t('history')}
                </button>
                <button
                    onClick={() => setProjectsMenu(!projectsMenu)}
                    className={isApple
                        ? "apple-glass-interactive rounded-full px-3.5 py-1.5 text-xs text-slate-200 flex items-center gap-2"
                        : "flex items-center gap-2 bg-zinc-900/60 backdrop-blur-md shadow-lg text-zinc-300 px-3 py-2 rounded-lg border border-white/10 hover:bg-white/10 hover:text-white transition-all text-xs"
                    }
                >
                    <FolderOpen size={14} /> {t('projects')}
                </button>
                <button
                    onClick={saveProject}
                    className={isApple
                        ? "apple-glass-interactive rounded-full px-3.5 py-1.5 text-xs text-slate-200 flex items-center gap-2"
                        : "flex items-center gap-2 bg-zinc-900/60 backdrop-blur-md shadow-lg text-zinc-300 px-3 py-2 rounded-lg border border-white/10 hover:bg-white/10 hover:text-white transition-all text-xs"
                    }
                >
                    <Save size={14} /> {t('save')}
                </button>
                <button
                    onClick={createNewProject}
                    className={isApple
                        ? "apple-btn-primary px-3.5 py-1.5 text-xs flex items-center gap-1.5 font-semibold"
                        : "flex items-center gap-2 bg-emerald-600/80 backdrop-blur-md shadow-lg text-white px-3 py-2 rounded-lg border border-emerald-500 hover:bg-emerald-500 transition-all text-xs"
                    }
                    title="Create New Project"
                >
                    <Plus size={14} /> New
                </button>
                <button
                    onClick={exportProject}
                    className={isApple
                        ? "apple-glass-interactive rounded-full p-2 text-xs text-slate-200"
                        : "flex items-center gap-2 bg-zinc-900/60 backdrop-blur-md shadow-lg text-zinc-300 px-3 py-2 rounded-lg border border-white/10 hover:bg-white/10 hover:text-white transition-all text-xs"
                    }
                    title="Download Project File"
                >
                    <Download size={14} />
                </button>
                <label
                    className={isApple
                        ? "apple-glass-interactive rounded-full p-2 text-xs text-slate-200 cursor-pointer"
                        : "flex items-center gap-2 bg-zinc-900/60 backdrop-blur-md shadow-lg text-zinc-300 px-3 py-2 rounded-lg border border-white/10 hover:bg-white/10 hover:text-white transition-all text-xs cursor-pointer"
                    }
                    title="Import Project File"
                >
                    <Upload size={14} />
                    <input type="file" ref={projectFileRef} className="hidden" accept=".json" onChange={importProject} />
                </label>
            </div>

            {projectsMenu && (
                <div className="absolute top-16 left-24 z-50 w-64 bg-zinc-950/70 backdrop-blur-xl border border-white/10 border-b-black/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),inset_0_24px_48px_rgba(255,255,255,0.05),0_10px_30px_rgba(0,0,0,0.5)] rounded-xl p-2">
                    <h3 className="text-xs font-bold text-zinc-400 mb-2 px-2">{t('savedProjects')} (Cloud)</h3>
                    {dbProjects.length === 0 && <p className="text-xs text-slate-500 px-2">No projects found.</p>}
                    {dbProjects.map(p => (
                        <div key={p.id} className="flex items-center justify-between hover:bg-zinc-900 rounded p-2 group">
                            <button onClick={() => loadDbProject(p)} className="text-left text-xs text-zinc-300 flex-1">
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
                        
                        let targetY = toNode.y + 24; // Default legacy fallback
                        if (toNode.type === 'processor') {
                            // Map explicit custom ports (top offset + 12px pin center)
                            if (conn.toPort === 'source') targetY = toNode.y + 72;
                            else if (conn.toPort === 'text') targetY = toNode.y + 132;
                            else if (conn.toPort === 'ref1') targetY = toNode.y + 192;
                            else if (conn.toPort === 'ref2') targetY = toNode.y + 252;
                            else if (conn.toPort === 'ref3') targetY = toNode.y + 312;
                            else if (conn.toPort === 'ref4') targetY = toNode.y + 372;
                            else if (conn.toPort === 'ref5') targetY = toNode.y + 432;
                            else targetY = toNode.y + 72; // Fallback to source
                        } else {
                            targetY = toNode.y + (toNode.height || 150) / 2; // For output nodes
                        }

                        // Adjust fromNode if it has a fromPort
                        let sourceY = fromNode.y + 24;
                        if (fromNode.type !== 'processor' && fromNode.type !== 'input') {
                            sourceY = fromNode.y + (fromNode.height || 150) / 2;
                        }

                        return <g key={conn.id}>{renderConnectionLine(fromNode.x + w1, sourceY, toNode.x, targetY)}</g>;
                    })}
                    {connectingNodeId && (
                        <g>
                            {(() => {
                                const node = nodes.find(n => n.id === connectingNodeId);
                                if (!node) return null;
                                const w = node.width || (node.type === 'processor' ? 320 : 240);
                                let sourceY = node.y + 24;
                                if (node.type !== 'processor' && node.type !== 'input') {
                                    sourceY = node.y + (node.height || 150) / 2;
                                }
                                return renderConnectionLine(node.x + w, sourceY, mousePos.x, mousePos.y, true);
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
                        ${isProcessor ? 'bg-zinc-950 border-indigo-500/30' : 'bg-zinc-950 border-white/10'}
                        hover:shadow-indigo-500/20 hover:border-indigo-500/50 hover:scale-[1.01]
                    `}
                            style={{
                                transform: `translate(${node.x}px, ${node.y}px)`,
                                width: node.width ? `${node.width}px` : `${defaultWidth}px`,
                                height: isCollapsed ? 'auto' : (node.height ? `${node.height}px` : 'auto')
                            }}
                            onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                            onTouchStart={(e) => handleNodeTouchStart(e, node.id)}
                        >
                            {/* Node Header */}
                            <div className="h-8 border-b border-white/5 px-3 flex items-center justify-between bg-zinc-950/50 rounded-t-xl flex-none">
                                <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                                    {node.type === 'input' && <ImageIcon size={12} className="text-blue-400" />}
                                    {node.type === 'prompt' && <Type size={12} className="text-emerald-400" />}
                                    {node.type === 'output' && <Film size={12} className="text-pink-400" />}
                                    {node.type === 'processor' && <Zap size={12} className="text-purple-400" />}
                                    {node.data.label}
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={(e) => { e.stopPropagation(); toggleNodeCollapse(node.id) }} className="text-slate-600 hover:text-zinc-300">
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
                                            <div className={`relative bg-black rounded border border-white/5 overflow-hidden group flex-1`}>
                                                {processingNodes.has(node.id) ? (
                                                    <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 text-indigo-400">
                                                        <Loader2 size={32} className="animate-spin mb-2" />
                                                        <span className="text-xs font-medium animate-pulse">{t('generating')}</span>
                                                    </div>
                                                ) : node.data.imageSrc ? (
                                                    node.data.beforeImage ? (
                                                        <BeforeAfter beforeImage={node.data.beforeImage} afterImage={node.data.imageSrc} />
                                                    ) : (
                                                        <img
                                                            src={node.data.imageSrc}
                                                            className="w-full h-full object-contain bg-black"
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
                                                                link.download = getHouzaiFilename('png');
                                                                document.body.appendChild(link);
                                                                link.click();
                                                                document.body.removeChild(link);
                                                            } catch (err: any) {
                                                                console.error("Download failed", err);
                                                                alert(`Download failed: ${err.message}. Check console for details.`);
                                                                // Do NOT fallback to window.open as per user request
                                                            }
                                                        }}
                                                        className="flex items-center gap-1 px-2 py-1 bg-zinc-900 hover:bg-slate-700 text-zinc-300 rounded text-[10px]"
                                                        title={t('download')}
                                                    >
                                                        <Download size={10} />
                                                    </button>
                                                    <button
                                                        onClick={() => { setPreviewImage(node.data.imageSrc!); setPreviewBeforeImage(node.data.beforeImage); }}
                                                        className="flex items-center gap-1 px-2 py-1 bg-zinc-900 hover:bg-slate-700 text-zinc-300 rounded text-[10px]"
                                                    >
                                                        <Maximize size={10} /> {t('preview')}
                                                    </button>
                                                    <button
                                                        onClick={() => setDrawingNodeId(node.id)}
                                                        className="flex items-center gap-1 px-2 py-1 bg-zinc-900 hover:bg-indigo-900/50 text-zinc-300 hover:text-indigo-300 rounded text-[10px]"
                                                    >
                                                        <Pencil size={10} /> {t('drawEdit')}
                                                    </button>
                                                    {(isOutput || isProcessor) && (
                                                        <button
                                                            onClick={() => handleUpscale(node.id)}
                                                            className="flex items-center gap-1 px-2 py-1 bg-zinc-900 hover:bg-purple-900/50 text-zinc-300 hover:text-purple-300 rounded text-[10px]"
                                                        >
                                                            <Zap size={10} /> {t('upscale')}
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {isProcessor && node.data.settings && (
                                        <div
                                            className="space-y-4 overflow-y-auto custom-scrollbar"
                                            style={{
                                                maxHeight: node.height ? `${node.height - 100}px` : '500px'
                                            }}
                                        >
                                            {node.data.subtype === 'super' ? (
                                                <div className="space-y-4">
                                                    {/* Quick Location & Lighting */}
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div className="space-y-1">
                                                            <label className="text-[9px] text-slate-500 font-bold uppercase block">Location</label>
                                                            <select
                                                                className="w-full bg-black border border-white/5 rounded px-2 py-1 text-[10px] text-zinc-300 outline-none focus:border-indigo-500"
                                                                value={node.data.settings.superMode?.location || 'Studio'}
                                                                onChange={(e) => {
                                                                    setNodes(prev => prev.map(n => n.id === node.id ? {
                                                                        ...n,
                                                                        data: {
                                                                            ...n.data,
                                                                            settings: {
                                                                                ...n.data.settings!,
                                                                                superMode: { ...n.data.settings!.superMode!, location: e.target.value as any }
                                                                            }
                                                                        }
                                                                    } : n));
                                                                }}
                                                            >
                                                                <option>Studio</option>
                                                                <option>Interior</option>
                                                                <option>Exterior</option>
                                                            </select>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[9px] text-slate-500 font-bold uppercase block">Lighting</label>
                                                            <select
                                                                className="w-full bg-black border border-white/5 rounded px-2 py-1 text-[10px] text-zinc-300 outline-none focus:border-indigo-500"
                                                                value={node.data.settings.superMode?.lighting}
                                                                onChange={(e) => {
                                                                    setNodes(prev => prev.map(n => n.id === node.id ? {
                                                                        ...n,
                                                                        data: {
                                                                            ...n.data,
                                                                            settings: {
                                                                                ...n.data.settings!,
                                                                                superMode: { ...n.data.settings!.superMode!, lighting: e.target.value as SuperAtmosphere }
                                                                            }
                                                                        }
                                                                    } : n));
                                                                }}
                                                            >
                                                                {Object.values(SuperAtmosphere).map(a => <option key={a} value={a}>{a}</option>)}
                                                            </select>
                                                        </div>
                                                    </div>

                                                    {/* Wardrobe (Outfit Builder) */}
                                                    <div className="space-y-2 border-t border-white/5/50 pt-3">
                                                        <div className="flex items-center justify-between">
                                                            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Wardrobe</label>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); addNodeGarmentSlot(node.id); }}
                                                                className="text-[9px] font-black text-zinc-500 hover:text-indigo-400 uppercase flex items-center gap-1"
                                                            >
                                                                <Plus size={10} /> Add
                                                            </button>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {node.data.settings.superMode?.garments?.map((slot) => (
                                                                <div key={slot.id} className="relative group bg-black/50 border border-white/5 rounded-xl p-1.5 space-y-1.5 transition-all hover:border-indigo-500/30">
                                                                    <div className="flex items-center justify-between px-0.5">
                                                                        <div className="flex items-center gap-1 min-w-0">
                                                                            <div className="text-indigo-400 opacity-80 flex-shrink-0">
                                                                                {CATEGORY_ICONS[slot.type] || <Package size={10} />}
                                                                            </div>
                                                                            <select
                                                                                value={slot.type}
                                                                                onChange={(e) => updateNodeGarment(node.id, slot.id, { type: e.target.value as any })}
                                                                                className="bg-transparent text-[8px] font-black text-slate-500 hover:text-indigo-300 uppercase tracking-widest outline-none border-none cursor-pointer truncate"
                                                                            >
                                                                                {['Top', 'Bottom', 'Shoes', 'Accessories', 'Full Body', 'Other'].map(cat => (
                                                                                    <option key={cat} value={cat} className="bg-zinc-950 text-white">{cat}</option>
                                                                                ))}
                                                                            </select>
                                                                        </div>
                                                                        <button
                                                                            onClick={() => removeNodeGarmentSlot(node.id, slot.id)}
                                                                            className="text-slate-700 hover:text-red-400 p-0.5"
                                                                        >
                                                                            <Trash2 size={8} />
                                                                        </button>
                                                                    </div>
                                                                    <div className="aspect-[3/4] rounded-lg overflow-hidden border border-white/5/50">
                                                                        <ImageUpload
                                                                            compact
                                                                            selectedImage={slot.image}
                                                                            onImageSelected={(img) => updateNodeGarment(node.id, slot.id, { image: img })}
                                                                            label={slot.type}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Model Generator Summary */}
                                                    <div className="space-y-2 border-t border-white/5/50 pt-3">
                                                        <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest block">AI Model Gen</label>
                                                        <div className="grid grid-cols-2 gap-2 text-left">
                                                            {[
                                                                { k: 'gender', l: 'Gender', opts: ['Any', 'Female', 'Male', 'Non-binary'] },
                                                                { k: 'age', l: 'Age', opts: ['Teen', '20s', '30s', '40s', 'Senior'] },
                                                                { k: 'nationality', l: 'Ethno.', opts: ['Any', 'European', 'Asian', 'African', 'Latin American'] },
                                                                { k: 'skinTone', l: 'Skin', opts: ['Fair', 'Tan', 'Dark', 'Natural'] }
                                                            ].map(gen => (
                                                                <div key={gen.k} className="space-y-1">
                                                                    <label className="text-[8px] text-slate-600 font-bold uppercase">{gen.l}</label>
                                                                    <select
                                                                        className="w-full bg-black border border-white/5 rounded px-1.5 py-1 text-[9px] text-zinc-500 outline-none"
                                                                        value={(node.data.settings?.superMode?.modelGen as any)?.[gen.k]}
                                                                        onChange={(e) => {
                                                                            setNodes(prev => prev.map(n => n.id === node.id ? {
                                                                                ...n,
                                                                                data: {
                                                                                    ...n.data,
                                                                                    settings: {
                                                                                        ...n.data.settings!,
                                                                                        superMode: {
                                                                                            ...n.data.settings!.superMode!,
                                                                                            modelGen: { ...n.data.settings!.superMode!.modelGen, [gen.k]: e.target.value }
                                                                                        }
                                                                                    }
                                                                                }
                                                                            } : n));
                                                                        }}
                                                                    >
                                                                        {gen.opts.map(o => <option key={o} value={o}>{o}</option>)}
                                                                    </select>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <ArchProcessorNodePanel node={node} setNodes={setNodes} customReferenceImages={customReferenceImages} />
                                            )}

                                            {/* Common Footer Actions */}
                                            <div className="space-y-2 border-t border-white/5/50 pt-3">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); runNode(node.id) }}
                                                        disabled={processingNodes.has(node.id)}
                                                        className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg py-2 font-bold text-[10px] uppercase tracking-wide shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2 transition-all"
                                                    >
                                                        {processingNodes.has(node.id) ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                                                        {t('generate')}
                                                    </button>
                                                    {node.data.subtype === 'super' && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); run4Shot(node.id) }}
                                                            disabled={processingNodes.has(node.id)}
                                                            className="bg-zinc-900 hover:bg-slate-700 text-indigo-400 border border-indigo-500/30 rounded-lg py-2 font-bold text-[10px] uppercase tracking-wide flex items-center justify-center gap-2 transition-all"
                                                        >
                                                            <Layers size={12} />
                                                            Sequence
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {node.type === 'video' && node.data.videoSettings && (
                                        <div className="flex flex-col flex-1 h-full min-h-[120px] pb-2">
                                            <VideoNodePanel node={node} setNodes={setNodes} />
                                            <button onClick={(e) => { e.stopPropagation(); runNode(node.id) }} disabled={processingNodes.has(node.id)} className="mt-3 bg-cyan-950 hover:bg-cyan-900 text-cyan-400 border border-cyan-500/30 rounded-lg py-2 font-bold text-[10px] uppercase tracking-wide flex items-center justify-center gap-2 transition-all">
                                                {processingNodes.has(node.id) ? <Loader2 size={12} className="animate-spin" /> : <Film size={12} />} {t('generate')} Video
                                            </button>
                                        </div>
                                    )}
                                    
                                    {node.type === 'advanced_ref' && (
                                        <div className="flex flex-col flex-1 h-full min-h-[120px]">
                                            <AdvancedRefNodePanel node={node} setNodes={setNodes} />
                                        </div>
                                    )}
                                    
                                    {node.type === 'upscaler' && node.data.upscaleSettings && (
                                        <div className="flex flex-col flex-1 h-full min-h-[120px] pb-2">
                                            <UpscaleNodePanel node={node} setNodes={setNodes} />
                                            <button onClick={(e) => { e.stopPropagation(); runNode(node.id) }} disabled={processingNodes.has(node.id)} className="mt-3 bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-500/30 rounded-lg py-2 font-bold text-[10px] uppercase tracking-wide flex items-center justify-center gap-2 transition-all">
                                                {processingNodes.has(node.id) ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />} Upscale Render
                                            </button>
                                        </div>
                                    )}

                                    {node.type === 'prompt' && (
                                        <textarea
                                            className="w-full h-24 bg-black border border-white/5 rounded p-2 text-xs text-zinc-300 resize-none focus:border-indigo-500 outline-none flex-1"
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
                            {node.type !== 'input' && node.type !== 'processor' && (
                                <div
                                    className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-zinc-900 rounded-full border-4 border-slate-950 hover:bg-indigo-500 cursor-pointer z-20 flex items-center justify-center transition-colors group"
                                    onMouseDown={(e) => handlePortMouseDown(e, node.id, 'input')}
                                    onMouseUp={(e) => handlePortMouseUp(e, node.id, 'input')}
                                    onTouchStart={(e) => handlePortTouchStart(e, node.id, 'input')}
                                    onTouchEnd={(e) => handlePortTouchEnd(e, node.id, 'input')}
                                    title="Input"
                                >
                                    <div className="w-1.5 h-1.5 bg-slate-500 rounded-full pointer-events-none group-hover:bg-white"></div>
                                </div>
                            )}

                            {node.type === 'processor' && (
                                <>
                                    {[
                                        { id: 'source', label: "Image (Base)", color: "hover:bg-indigo-500", y: 60 },
                                        { id: 'text', label: "Text (Prompt)", color: "hover:bg-amber-500", y: 120 },
                                        { id: 'ref1', label: "Ref 1 (Style)", color: "hover:bg-slate-500", y: 180 },
                                        { id: 'ref2', label: "Ref 2 (Arch)", color: "hover:bg-slate-500", y: 240 },
                                        { id: 'ref3', label: "Ref 3 (Env)", color: "hover:bg-slate-500", y: 300 },
                                        { id: 'ref4', label: "Ref 4 (Detail)", color: "hover:bg-slate-500", y: 360 },
                                        { id: 'ref5', label: "Ref 5 (Custom)", color: "hover:bg-slate-500", y: 420 }
                                    ].map((port) => (
                                        <div
                                            key={port.id}
                                            className={`absolute -left-3 w-6 h-6 bg-zinc-900 rounded-full border-4 border-slate-950 ${port.color} cursor-pointer z-20 flex items-center justify-center transition-colors group`}
                                            style={{ top: `${port.y}px` }}
                                            onMouseDown={(e) => handlePortMouseDown(e, node.id, 'input', port.id)}
                                            onMouseUp={(e) => handlePortMouseUp(e, node.id, 'input', port.id)}
                                            onTouchStart={(e) => handlePortTouchStart(e, node.id, 'input', port.id)}
                                            onTouchEnd={(e) => handlePortTouchEnd(e, node.id, 'input', port.id)}
                                            title={port.label}
                                        >
                                            <div className="w-1.5 h-1.5 bg-slate-500 rounded-full pointer-events-none group-hover:bg-white"></div>
                                            <div className="absolute left-6 ml-1 bg-black text-white text-[8px] font-bold px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-md border border-white/10 uppercase tracking-widest text-slate-300">
                                                {port.label}
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}

                            {/* Output Ports */}
                            {(node.type !== 'output' && node.type !== 'prompt') && (
                                <div
                                    className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-zinc-900 rounded-full border-4 border-slate-950 hover:bg-indigo-500 cursor-pointer z-20 flex items-center justify-center transition-colors"
                                    onMouseDown={(e) => handlePortMouseDown(e, node.id, 'output')}
                                    onTouchStart={(e) => handlePortTouchStart(e, node.id, 'output')}
                                    title="Output"
                                >
                                    <div className="w-1.5 h-1.5 bg-slate-500 rounded-full pointer-events-none"></div>
                                </div>
                            )}

                            {/* Prompt Nodes connect to input side logically, but visualize as output source */}
                            {node.type === 'prompt' && (
                                <div
                                    className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-zinc-900 rounded-full border-4 border-slate-950 hover:bg-emerald-500 cursor-pointer z-20 flex items-center justify-center transition-colors"
                                    onMouseDown={(e) => handlePortMouseDown(e, node.id, 'output')}
                                    onTouchStart={(e) => handlePortTouchStart(e, node.id, 'output')}
                                    title="Text Output"
                                >
                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full pointer-events-none"></div>
                                </div>
                            )}

                            {/* Chain Result */}
                            {node.type === 'output' && (
                                <div
                                    className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-zinc-900 rounded-full border-4 border-slate-950 hover:bg-indigo-500 cursor-pointer z-20 flex items-center justify-center transition-colors"
                                    onMouseDown={(e) => handlePortMouseDown(e, node.id, 'output')}
                                    onTouchStart={(e) => handlePortTouchStart(e, node.id, 'output')}
                                    title="Chain Result"
                                >
                                    <div className="w-1.5 h-1.5 bg-slate-500 rounded-full pointer-events-none"></div>
                                </div>
                            )}

                            {/* Resize Handle */}
                            <div
                                className="absolute bottom-0 right-0 w-5 h-5 cursor-nwse-resize z-20 flex items-center justify-center text-slate-600 hover:text-zinc-500"
                                onMouseDown={(e) => handleResizeMouseDown(e, node.id)}
                                onTouchStart={(e) => handleResizeTouchStart(e, node.id)}
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
                    className="absolute z-50 bg-zinc-950/70 backdrop-blur-xl border border-white/10 border-b-black/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),inset_0_24px_48px_rgba(255,255,255,0.05),0_10px_30px_rgba(0,0,0,0.5)] rounded-xl p-1.5 min-w-[180px] flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-100"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <div className="text-[10px] font-bold text-slate-500 px-3 py-1 uppercase tracking-wider">{t('addNode')}</div>
                    <button onClick={() => addNode('input')} className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-900 rounded text-xs text-left text-zinc-300 hover:text-white transition-colors">
                        <ImageIcon size={14} className="text-blue-400" /> {t('nodeInput')}
                    </button>
                    <button onClick={() => addNode('prompt')} className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-900 rounded text-xs text-left text-zinc-300 hover:text-white transition-colors">
                        <Type size={14} className="text-emerald-400" /> {t('nodePrompt')}
                    </button>
                    <div className="h-px bg-zinc-900 my-1"></div>
                    <button onClick={() => addNode('processor', 'arch')} className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-900 rounded text-xs text-left text-zinc-300 hover:text-white transition-colors">
                        <Building size={14} className="text-purple-400" /> {t('nodeProcessor')}
                    </button>
                    <button onClick={() => addNode('processor', 'product')} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-900 rounded-lg transition-colors group">
                        <Box size={14} className="text-amber-400 group-hover:scale-110 transition-transform" />
                        <span>Product Staging</span>
                    </button>
                    <button onClick={() => addNode('processor', 'super')} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-900 rounded-lg transition-colors group">
                        <Sparkles size={14} className="text-indigo-400 group-hover:scale-110 transition-transform" />
                        <span>Marketing AI (Super)</span>
                    </button>
                    <div className="h-px bg-zinc-900 my-1"></div>
                    <button onClick={() => addNode('video')} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-900 rounded-lg transition-colors group">
                        <Film size={14} className="text-cyan-400 group-hover:scale-110 transition-transform" />
                        <span>Kling V3 Video</span>
                    </button>
                    <button onClick={() => addNode('advanced_ref')} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-900 rounded-lg transition-colors group">
                        <Layers size={14} className="text-yellow-400 group-hover:scale-110 transition-transform" />
                        <span>Categorical References</span>
                    </button>
                    <button onClick={() => addNode('upscaler')} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-900 rounded-lg transition-colors group">
                        <Zap size={14} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                        <span>AI Upscaler</span>
                    </button>
                    <div className="h-px bg-zinc-900 my-1"></div>
                    <button onClick={() => addNode('output')} className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-900 rounded text-xs text-left text-zinc-300 hover:text-white transition-colors">
                        <Maximize2 size={14} className="text-pink-400" /> {t('nodeOutput')}
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
                    selectedModel={selectedModel}
                    onModelChange={setSelectedModel}
                />
            )}
        </div>
    );
};

export default InfinityCanvas;
