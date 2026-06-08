import React, { useEffect, useRef, useState } from 'react';
import { X, RotateCcw, Play, Pause, Camera, Download, Box, Layers, Video, Loader2 } from 'lucide-react';
import { TrellisResult } from '../services/splatService';

interface SplatViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: TrellisResult;
  onCapture: (capturedDataUrl: string) => void;
  prompt: string;
}

export const SplatViewerModal: React.FC<SplatViewerModalProps> = ({
  isOpen,
  onClose,
  result,
  onCapture,
  prompt
}) => {
  const [tab, setTab] = useState<'splat' | 'mesh' | 'video'>(
    result.gaussian_ply ? 'splat' : result.model_file ? 'mesh' : 'video'
  );
  const [autoRotate, setAutoRotate] = useState(true);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const modelViewerRef = useRef<any>(null);
  
  const autoRotateRef = useRef(autoRotate);
  const captureRequestedRef = useRef(false);
  const onCaptureCallbackRef = useRef<((dataUrl: string) => void) | null>(null);

  // Sync autoRotate state to ref for animation loop
  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  // Handle loading and rendering of Gaussian Splat (gsplat.js)
  useEffect(() => {
    if (!isOpen || tab !== 'splat' || !result.gaussian_ply) return;

    let active = true;
    let animationFrameId: number;
    let renderer: any;
    let scene: any;
    let camera: any;
    let controls: any;

    async function initSplat() {
      try {
        setIsModelLoading(true);
        setLoadingProgress(0);
        setErrorMsg(null);

        // Dynamically import gsplat.js from CDN to avoid build time or TS issues
        const cdnUrl = 'https://cdn.jsdelivr.net/npm/gsplat@1.2.3';
        const SPLAT = await import(/* @vite-ignore */ cdnUrl);
        
        if (!active) return;
        if (!canvasRef.current) return;

        const canvas = canvasRef.current;
        renderer = new SPLAT.WebGLRenderer(canvas);
        scene = new SPLAT.Scene();
        camera = new SPLAT.Camera();
        controls = new SPLAT.OrbitControls(camera, canvas);

        // Position camera nicely
        camera.position.set(0, 1.5, 4);

        const resize = () => {
          if (!canvas) return;
          const rect = canvas.parentElement?.getBoundingClientRect();
          renderer.setSize(rect?.width || 800, rect?.height || 600);
        };
        resize();
        window.addEventListener('resize', resize);

        // Load .ply file
        await SPLAT.PLYLoader.LoadAsync(result.gaussian_ply!, scene, (progress: number) => {
          if (active) {
            setLoadingProgress(Math.round(progress * 100));
          }
        });

        if (!active) return;
        setIsModelLoading(false);

        let theta = 0;
        const frame = () => {
          if (!active) return;

          if (autoRotateRef.current) {
            // Auto rotate camera gently around center
            theta += 0.005;
            const radius = 4;
            camera.position.x = radius * Math.sin(theta);
            camera.position.z = radius * Math.cos(theta);
            camera.position.y = 1.5 + Math.sin(theta * 0.5) * 0.5;
            camera.lookAt(new SPLAT.Vector3(0, 0.5, 0));
          } else {
            controls.update();
          }

          renderer.render(scene, camera);

          // Handle screenshot capture
          if (captureRequestedRef.current) {
            try {
              const dataUrl = canvas.toDataURL('image/png');
              captureRequestedRef.current = false;
              if (onCaptureCallbackRef.current) {
                onCaptureCallbackRef.current(dataUrl);
              }
            } catch (err) {
              console.error('Failed to capture canvas screenshot:', err);
              captureRequestedRef.current = false;
            }
          }

          animationFrameId = requestAnimationFrame(frame);
        };

        animationFrameId = requestAnimationFrame(frame);

        // Reset camera control helper
        (window as any).resetSplatCamera = () => {
          theta = 0;
          camera.position.set(0, 1.5, 4);
          if (controls) controls.update();
        };

      } catch (err: any) {
        console.error('Error rendering Splat:', err);
        setErrorMsg('Failed to initialize or render 3D Gaussian Splat.');
        setIsModelLoading(false);
      }
    }

    initSplat();

    return () => {
      active = false;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      delete (window as any).resetSplatCamera;
    };
  }, [isOpen, tab, result.gaussian_ply]);

  if (!isOpen) return null;

  const handleResetCamera = () => {
    if (tab === 'splat') {
      if ((window as any).resetSplatCamera) {
        (window as any).resetSplatCamera();
      }
    } else if (tab === 'mesh') {
      const viewer = modelViewerRef.current;
      if (viewer) {
        viewer.cameraOrbit = 'unset';
        viewer.cameraTarget = 'unset';
        viewer.fieldOfView = 'unset';
      }
    }
  };

  const handleCapture = async () => {
    if (tab === 'splat') {
      captureRequestedRef.current = true;
      onCaptureCallbackRef.current = (dataUrl: string) => {
        onCapture(dataUrl);
      };
    } else if (tab === 'mesh') {
      const viewer = modelViewerRef.current;
      if (viewer) {
        try {
          const blob = await viewer.toBlob({ idealAspect: false });
          const reader = new FileReader();
          reader.onloadend = () => {
            onCapture(reader.result as string);
          };
          reader.readAsDataURL(blob);
        } catch (err) {
          console.error('Failed to capture model viewer:', err);
          alert('Failed to capture 3D view. Please try again.');
        }
      }
    } else {
      alert('Please select either the Gaussian Splat or 3D Mesh tab to capture a custom perspective.');
    }
  };

  const downloadFile = async (url?: string, defaultName?: string) => {
    if (!url) return;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = defaultName || '3d-asset';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Download failed:', err);
      alert('Failed to download file directly. You can open it in a new tab: ' + url);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <div className="relative flex flex-col w-full max-w-6xl h-[85vh] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Box className="text-indigo-400" size={20} />
              Interactive 3D Perspective Control
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1 italic">"{prompt}"</p>
          </div>
          
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0">
          
          {/* 3D Viewport */}
          <div className="flex-1 relative bg-slate-950 min-h-[300px] flex items-center justify-center">
            
            {tab === 'splat' && result.gaussian_ply && (
              <div className="w-full h-full relative">
                <canvas 
                  ref={canvasRef} 
                  className="w-full h-full block cursor-grab active:cursor-grabbing" 
                />
              </div>
            )}

            {tab === 'mesh' && result.model_file && (
              <model-viewer
                ref={modelViewerRef}
                id="houzai-model-viewer"
                src={result.model_file}
                alt="3D Mesh model"
                camera-controls
                auto-rotate={autoRotate ? '' : undefined}
                shadow-intensity="1"
                environment-image="neutral"
                style={{ width: '100%', height: '100%', display: 'block' }}
              />
            )}

            {tab === 'video' && result.color_video && (
              <video
                src={result.color_video}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-contain"
              />
            )}

            {/* Error or Loading overlays */}
            {isModelLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm z-50">
                <Loader2 className="animate-spin text-indigo-500 mb-3" size={36} />
                <p className="text-sm font-semibold text-slate-200">Loading 3D asset...</p>
                <div className="w-48 bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden border border-slate-700">
                  <div 
                    className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${loadingProgress}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">{loadingProgress}% loaded</p>
              </div>
            )}

            {errorMsg && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 z-50 p-6 text-center">
                <p className="text-rose-400 text-sm font-bold mb-2">Error Displaying 3D View</p>
                <p className="text-slate-400 text-xs max-w-md">{errorMsg}</p>
                <button
                  onClick={() => setTab(tab)}
                  className="mt-4 px-4 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-md text-xs font-semibold transition-colors"
                >
                  Retry Loading
                </button>
              </div>
            )}

            {/* Interaction hint overlay */}
            {!isModelLoading && !errorMsg && tab !== 'video' && (
              <div className="absolute bottom-4 left-4 pointer-events-none bg-slate-900/60 border border-slate-800 backdrop-blur-md px-3 py-1.5 rounded-lg text-[10px] text-slate-300">
                💡 Drag to Rotate | Scroll to Zoom | Right-click to Pan
              </div>
            )}
          </div>

          {/* Sidebar Control Panel */}
          <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-slate-800 bg-slate-900/30 flex flex-col justify-between p-6">
            
            <div className="space-y-6">
              
              {/* Tab Selector */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 tracking-wider block mb-2">DISPLAY MODE</label>
                <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800/80">
                  {result.gaussian_ply && (
                    <button
                      onClick={() => { setTab('splat'); setErrorMsg(null); }}
                      className={`flex flex-col items-center gap-1 py-2 rounded text-[10px] font-bold transition-all ${
                        tab === 'splat' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Layers size={14} />
                      Splat
                    </button>
                  )}
                  {result.model_file && (
                    <button
                      onClick={() => { setTab('mesh'); setErrorMsg(null); }}
                      className={`flex flex-col items-center gap-1 py-2 rounded text-[10px] font-bold transition-all ${
                        tab === 'mesh' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Box size={14} />
                      Mesh
                    </button>
                  )}
                  {result.color_video && (
                    <button
                      onClick={() => { setTab('video'); setErrorMsg(null); }}
                      className={`flex flex-col items-center gap-1 py-2 rounded text-[10px] font-bold transition-all ${
                        tab === 'video' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Video size={14} />
                      Orbit Video
                    </button>
                  )}
                </div>
              </div>

              {/* Viewport Actions */}
              {tab !== 'video' && (
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 tracking-wider block">CAMERA CONTROLS</label>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={handleResetCamera}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-850 hover:bg-slate-800 text-white border border-slate-800 rounded-lg text-xs font-semibold transition-colors"
                    >
                      <RotateCcw size={14} />
                      Reset View
                    </button>

                    <button
                      onClick={() => setAutoRotate(!autoRotate)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold border transition-all ${
                        autoRotate 
                          ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' 
                          : 'bg-slate-850 hover:bg-slate-800 text-slate-300 border-slate-800'
                      }`}
                    >
                      {autoRotate ? <Pause size={14} /> : <Play size={14} />}
                      Auto Orbit
                    </button>
                  </div>
                </div>
              )}

              {/* Perspective Capture */}
              {tab !== 'video' && (
                <div className="p-4 bg-indigo-950/20 border border-indigo-500/10 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-indigo-400">
                    <Camera size={16} />
                    <span className="text-xs font-bold">Change Perspective</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Rotate the 3D model to your desired perspective and click the button below to capture it. The captured view will replace the current image in the editor and be saved to your design history.
                  </p>
                  
                  <button
                    onClick={handleCapture}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-indigo-900/40"
                  >
                    <Camera size={14} />
                    Capture & Apply to Canvas
                  </button>
                </div>
              )}
            </div>

            {/* Downloads Section */}
            <div className="pt-6 border-t border-slate-850 space-y-3">
              <label className="text-[10px] font-bold text-slate-400 tracking-wider block">EXPORT ASSET</label>
              
              <div className="grid grid-cols-1 gap-2">
                {result.gaussian_ply && (
                  <button
                    onClick={() => downloadFile(result.gaussian_ply, 'houzai-splat.ply')}
                    className="flex items-center justify-between px-3 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Layers size={13} className="text-slate-400" />
                      Gaussian Splat (.PLY)
                    </span>
                    <Download size={13} className="text-slate-400" />
                  </button>
                )}

                {result.model_file && (
                  <button
                    onClick={() => downloadFile(result.model_file, 'houzai-mesh.glb')}
                    className="flex items-center justify-between px-3 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Box size={13} className="text-slate-400" />
                      3D Mesh (.GLB)
                    </span>
                    <Download size={13} className="text-slate-400" />
                  </button>
                )}

                {result.color_video && (
                  <button
                    onClick={() => downloadFile(result.color_video, 'houzai-orbit.mp4')}
                    className="flex items-center justify-between px-3 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Video size={13} className="text-slate-400" />
                      Orbit Video (.MP4)
                    </span>
                    <Download size={13} className="text-slate-400" />
                  </button>
                )}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
