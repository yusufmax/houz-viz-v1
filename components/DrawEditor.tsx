
import React, { useRef, useState, useEffect } from 'react';
import {
  Pencil, Move, Type, Image as ImageIcon, Undo, Download,
  Save, X, Trash2, MousePointer2, Check, Zap, MessageSquare, Upload, LayoutTemplate, Tag as TagIcon
} from 'lucide-react';
import { AspectRatio, Tag } from '../types';
import { useLanguage } from '../LanguageContext';
import PdfPageSelector from './PdfPageSelector';

interface DrawEditorProps {
  initialImage: string | null;
  onSave: (newImage: string) => void;
  onRender?: (newImage: string, prompt: string, referenceImage: string | null, aspectRatio: AspectRatio, model?: string, tags?: Tag[]) => void;
  onClose: () => void;
  selectedModel?: string;
  onModelChange?: (model: string) => void;
}

type Tool = 'brush' | 'arrow' | 'text' | 'image' | 'tag';

const DrawEditor: React.FC<DrawEditorProps> = ({ initialImage, onSave, onRender, onClose, selectedModel = 'gemini-2.5-flash-image', onModelChange }) => {
  const { t } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [tool, setTool] = useState<Tool>('brush');
  const [brushSize, setBrushSize] = useState(5);
  const [brushColor, setBrushColor] = useState('#000000');
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  // Prompt for editing context
  const [editPrompt, setEditPrompt] = useState('');
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('Original');

  // History for Undo
  const [history, setHistory] = useState<string[]>([]);
  const [historyStep, setHistoryStep] = useState(-1);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfMode, setPdfMode] = useState<'place' | 'reference' | 'tag' | null>(null);

  // Tagging State
  const [tags, setTags] = useState<Tag[]>([]);
  const [pendingTagId, setPendingTagId] = useState<number | null>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    context.lineCap = 'round';
    context.lineJoin = 'round';
    setCtx(context);

    // Load initial image
    if (initialImage) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = initialImage;
      img.onload = () => {
        // Fit image to canvas or resize canvas
        canvas.width = img.width;
        canvas.height = img.height;
        // Limit max display size for UI, but canvas resolution stays true
        context.drawImage(img, 0, 0);
        saveToHistory();
      };
    } else {
      // Default canvas
      canvas.width = 1024;
      canvas.height = 1024;
      context.fillStyle = '#1e293b'; // Slate 800
      context.fillRect(0, 0, canvas.width, canvas.height);
      saveToHistory();
    }
  }, []); // Run once on mount

  const saveToHistory = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      setHistory(prev => [...prev.slice(-10), canvas.toDataURL()]);
    }
  };

  const handleUndo = () => {
    if (history.length <= 1) return;
    const newHistory = [...history];
    newHistory.pop(); // Remove current state
    const prevState = newHistory[newHistory.length - 1];
    setHistory(newHistory);

    const img = new Image();
    img.src = prevState;
    img.onload = () => {
      if (ctx && canvasRef.current) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.drawImage(img, 0, 0);
      }
    };
  };

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const pos = getPos(e);
    setStartPos(pos);

    if (tool === 'brush' && ctx) {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !ctx) return;
    const pos = getPos(e);

    if (tool === 'brush') {
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = brushSize;
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
  };

  const stopDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !ctx || !canvasRef.current) return;
    setIsDrawing(false);
    const endPos = getPos(e);

    if (tool === 'arrow') {
      drawArrow(ctx, startPos.x, startPos.y, endPos.x, endPos.y, brushSize, brushColor);
    } else if (tool === 'text') {
      const text = prompt("Enter annotation text:", "New Feature");
      if (text) {
        ctx.font = `${brushSize * 5}px sans-serif`;
        ctx.fillStyle = brushColor;
        ctx.fillText(text, endPos.x, endPos.y);
      }
      saveToHistory();
    } else if (tool === 'tag') {
      const newTag: Tag = {
        id: Date.now(),
        x: endPos.x,
        y: endPos.y,
        image: ''
      };
      setTags(prev => [...prev, newTag]);
      setPendingTagId(newTag.id);

      // Trigger file upload for this tag
      setTimeout(() => {
        tagInputRef.current?.click();
      }, 100);
    }

    saveToHistory();
  };

  const drawArrow = (ctx: CanvasRenderingContext2D, fromx: number, fromy: number, tox: number, toy: number, width: number, color: string) => {
    const headlen = width * 4; // length of head in pixels
    const dx = tox - fromx;
    const dy = toy - fromy;
    const angle = Math.atan2(dy, dx);

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.moveTo(fromx, fromy);
    ctx.lineTo(tox, toy);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(tox, toy);
    ctx.lineTo(tox - headlen * Math.cos(angle - Math.PI / 6), toy - headlen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(tox - headlen * Math.cos(angle + Math.PI / 6), toy - headlen * Math.sin(angle + Math.PI / 6));
    ctx.lineTo(tox, toy);
    ctx.fillStyle = color;
    ctx.fill();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !ctx || !canvasRef.current) return;

    if (file.type === 'application/pdf') {
      setPdfFile(file);
      setPdfMode('place');
      return;
    }

    try {
      const imageSrc = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target?.result as string);
        reader.readAsDataURL(file);
      });

      placeImageOnCanvas(imageSrc);
    } catch (error) {
      console.error("Failed to load image", error);
      alert("Failed to load file.");
    }
  };

  const handleTagImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, specificTagId?: number) => {
    const file = e.target.files?.[0];
    const targetId = specificTagId || pendingTagId;
    if (!file || targetId === null) return;

    if (file.type === 'application/pdf') {
      setPdfFile(file);
      setPdfMode('tag');
      return;
    }

    try {
      const imageSrc = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target?.result as string);
        reader.readAsDataURL(file);
      });

      setTags(prev => prev.map(t => t.id === targetId ? { ...t, image: imageSrc } : t));
      if (!specificTagId) setPendingTagId(null);
    } catch (error) {
      console.error("Failed to load tag reference", error);
      alert("Failed to load file.");
    }
  };

  const updateTagPrompt = (id: number, prompt: string) => {
    setTags(prev => prev.map(t => t.id === id ? { ...t, prompt } : t));
  };

  const removeTag = (id: number) => {
    setTags(prev => prev.filter(t => t.id !== id));
  };

  const placeImageOnCanvas = (imageSrc: string) => {
    if (!ctx || !canvasRef.current) return;

    const img = new Image();
    img.onload = () => {
      // Place in center
      const x = (canvasRef.current!.width - img.width) / 2;
      const y = (canvasRef.current!.height - img.height) / 2;
      const scale = Math.min(canvasRef.current!.width / img.width, canvasRef.current!.height / img.height, 1);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (canvasRef.current!.width - w) / 2, (canvasRef.current!.height - h) / 2, w, h);
      saveToHistory();
      setTool('brush'); // Reset tool
    };
    img.src = imageSrc;
  };

  const handleReferenceImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === 'application/pdf') {
        setPdfFile(file);
        setPdfMode('reference');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setReferenceImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePdfSelect = (base64: string) => {
    if (pdfMode === 'place') {
      placeImageOnCanvas(base64);
    } else if (pdfMode === 'reference') {
      setReferenceImage(base64);
    } else if (pdfMode === 'tag' && pendingTagId !== null) {
      setTags(prev => prev.map(t => t.id === pendingTagId ? { ...t, image: base64 } : t));
      setPendingTagId(null);
    }
    setPdfFile(null);
    setPdfMode(null);
  };

  const handlePdfCancel = () => {
    setPdfFile(null);
    setPdfMode(null);
  };

  const handleSave = () => {
    if (canvasRef.current) {
      onSave(canvasRef.current.toDataURL('image/png'));
    }
  };

  const handleRender = () => {
    if (canvasRef.current && onRender) {
      // Pass the edited image, prompt, reference image, aspect ratio, model, AND tags
      onRender(canvasRef.current.toDataURL('image/png'), editPrompt, referenceImage, aspectRatio, selectedModel, tags);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-4">
      <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/50 w-full max-w-6xl h-[90dvh] max-h-[95vh] flex flex-col overflow-hidden relative ring-1 ring-white/5">

        {pdfFile && (
          <PdfPageSelector
            file={pdfFile}
            onSelect={handlePdfSelect}
            onCancel={handlePdfCancel}
          />
        )}

        {/* Toolbar */}
        <div className="h-16 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4 shrink-0 z-20">
          <div className="flex items-center gap-4">
            <h3 className="text-white font-bold text-lg hidden md:block">{t('drawTitle')}</h3>
            <div className="h-6 w-px bg-slate-600 hidden md:block"></div>

            {/* Tools */}
            <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
              <button onClick={() => setTool('brush')} className={`p-2 rounded ${tool === 'brush' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`} title={t('brush')}>
                <Pencil size={20} />
              </button>
              <button onClick={() => setTool('arrow')} className={`p-2 rounded ${tool === 'arrow' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`} title={t('arrow')}>
                <MousePointer2 size={20} className="rotate-45" />
              </button>
              <button onClick={() => setTool('text')} className={`p-2 rounded ${tool === 'text' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`} title={t('annotate')}>
                <Type size={20} />
              </button>
              <label className={`p-2 rounded cursor-pointer ${tool === 'image' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`} title={t('placeImage')}>
                <ImageIcon size={20} />
                <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleImageUpload} />
              </label>
              <button onClick={() => setTool('tag')} className={`p-2 rounded ${tool === 'tag' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`} title="Place Tag">
                <TagIcon size={20} />
              </button>
            </div>

            {/* Hidden Input for Tags */}
            <input
              type="file"
              ref={tagInputRef}
              accept="image/*,application/pdf"
              className="hidden"
              onChange={handleTagImageUpload}
            />

            {/* Color & Size */}
            <div className="flex items-center gap-2 bg-slate-900 rounded-lg p-2 border border-slate-700 hidden sm:flex">
              <div className="flex gap-1">
                {['#ffffff', '#000000', '#ef4444', '#22c55e', '#3b82f6', '#eab308'].map(c => (
                  <button
                    key={c}
                    onClick={() => setBrushColor(c)}
                    className={`w-4 h-4 rounded-full border-2 ${brushColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="w-px h-6 bg-slate-700 mx-2"></div>
              <input
                type="range"
                min="1"
                max="20"
                value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                className="w-16 accent-indigo-500"
              />
            </div>

            <button onClick={handleUndo} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg" title={t('undo')}>
              <Undo size={20} />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Aspect Ratio Selector */}
            {onRender && (
              <div className="relative flex items-center bg-slate-900 rounded-lg border border-slate-700">
                <LayoutTemplate size={16} className="absolute left-2 text-slate-500 pointer-events-none" />
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                  className="bg-transparent text-xs text-slate-300 py-2 pl-8 pr-2 outline-none rounded-lg cursor-pointer hover:bg-slate-800 appearance-none"
                  title="Target Aspect Ratio"
                >
                  <option value="Original">{t('originalRatio')}</option>
                  <option value="16:9">16:9 Landscape</option>
                  <option value="9:16">9:16 Portrait</option>
                  <option value="1:1">1:1 Square</option>
                  <option value="4:3">4:3 Standard</option>
                  <option value="3:4">3:4 Portrait</option>
                </select>
              </div>
            )}

            {/* Model Selector */}
            {onRender && onModelChange && (
              <div className="relative flex items-center bg-slate-900 rounded-lg border border-slate-700">
                <select
                  value={selectedModel}
                  onChange={(e) => onModelChange(e.target.value)}
                  className="bg-transparent text-xs text-slate-300 py-2 px-3 outline-none rounded-lg cursor-pointer hover:bg-slate-800 appearance-none"
                  title="AI Model"
                >
                  <option value="gemini-2.5-flash-image">Gemini 2.5 Flash</option>
                  <option value="gemini-3-pro-image-preview">Gemini 3 Pro</option>
                </select>
              </div>
            )}

            <button onClick={onClose} className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg">
              {t('cancel')}
            </button>
            <button onClick={handleSave} className="px-4 py-2 text-slate-200 hover:bg-slate-700 rounded-lg font-medium">
              {t('save')}
            </button>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 overflow-auto bg-slate-950 relative flex items-center justify-center p-8 grid-background pb-28">
          <div className="relative shadow-2xl shadow-black">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="cursor-crosshair bg-slate-800 max-w-full max-h-[75vh] object-contain"
              style={{ touchAction: 'none' }}
            />

            {/* Tags Overlay */}
            {tags.map((tag, index) => {
              const canvas = canvasRef.current;
              if (!canvas) return null;

              // Map canvas coordinates to display coordinates
              const rect = canvas.getBoundingClientRect();
              const scaleX = rect.width / canvas.width;
              const scaleY = rect.height / canvas.height;

              return (
                <div
                  key={tag.id}
                  className="absolute pointer-events-auto group z-40"
                  style={{
                    left: tag.x * scaleX,
                    top: tag.y * scaleY,
                    transform: 'translate(-50%, -100%)'
                  }}
                >
                  <div className="relative">
                    {/* Tag Pin */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shadow-xl border-2 transition-all cursor-pointer ${tag.image ? 'bg-indigo-600 text-white border-white scale-110' : 'bg-slate-800 text-slate-400 border-slate-600 animate-pulse'}`}>
                      {index + 1}
                    </div>
                    <div className="w-0.5 h-3 bg-indigo-500 mx-auto -mt-0.5"></div>

                    {/* Tag Popover on Hover/Focus */}
                    <div
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto focus-within:pointer-events-auto"
                      onMouseDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl min-w-[180px] space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-slate-500 uppercase">Tag Reference {index + 1}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeTag(tag.id); }}
                            className="p-1 hover:bg-red-500/20 text-red-500 rounded transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>

                        {tag.image ? (
                          <div className="relative aspect-video rounded-lg overflow-hidden border border-slate-700 bg-slate-950">
                            <img src={tag.image} alt={`Ref ${index + 1}`} className="w-full h-full object-cover" />
                            <label className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                              <span className="text-[8px] font-bold text-white uppercase tracking-wider">Change</span>
                              <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => handleTagImageUpload(e, tag.id)} />
                            </label>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 p-2 text-center italic border border-dashed border-slate-700 rounded-lg">Uploading...</div>
                        )}

                        {/* per-tag prompt */}
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-500 uppercase block pl-1">Local Prompt (Opt)</label>
                          <input
                            type="text"
                            value={tag.prompt || ''}
                            onChange={(e) => updateTagPrompt(tag.id, e.target.value)}
                            onMouseDown={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()} // Prevent triggering global events
                            placeholder="e.g. Modern wood texture"
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-[10px] text-slate-200 outline-none focus:border-indigo-500 transition-colors pointer-events-auto"
                          />
                        </div>
                      </div>
                      {/* Triangle Arrow */}
                      <div className="w-3 h-3 bg-slate-900 border-r border-b border-slate-700 rotate-45 mx-auto -mt-1.5"></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Prompt Bar */}
        <div className="absolute bottom-0 left-0 right-0 p-6 pb-safe pointer-events-none flex justify-center z-30">
          <div className="w-full max-w-3xl bg-slate-900/95 backdrop-blur-lg border border-slate-600/50 rounded-2xl shadow-2xl pointer-events-auto flex items-center p-2 gap-2 ring-1 ring-white/10">
            {/* Icon */}
            <div className="p-2 bg-indigo-600/20 rounded-lg text-indigo-400">
              <MessageSquare size={20} />
            </div>

            {/* Input */}
            <input
              type="text"
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              placeholder={t('drawPlaceholder')}
              className="flex-1 bg-transparent border-none text-sm text-white outline-none placeholder-slate-500 px-2"
              onKeyDown={(e) => e.key === 'Enter' && handleRender()}
            />

            <div className="h-8 w-px bg-slate-700 mx-1"></div>

            {/* Reference Image Uploader */}
            <div className="relative h-10 w-10 shrink-0">
              {referenceImage ? (
                <div className="relative h-full w-full group">
                  <img src={referenceImage} alt="Ref" className="h-full w-full object-cover rounded-lg bg-slate-950 border border-slate-600" />
                  <button
                    onClick={() => setReferenceImage(null)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center w-full h-full cursor-pointer bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 text-slate-400 hover:text-white transition-all hover:border-indigo-500/50 group" title="Add Reference Image">
                  <Upload size={18} className="group-hover:scale-110 transition-transform" />
                  <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleReferenceImageUpload} />
                </label>
              )}
            </div>

            {/* Render Button */}
            {onRender && (
              <button
                onClick={handleRender}
                className="ml-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white px-6 py-2.5 rounded-xl font-semibold shadow-lg shadow-indigo-500/20 transition-all active:scale-95 flex items-center gap-2"
              >
                <Zap size={18} /> {t('render')}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default DrawEditor;
