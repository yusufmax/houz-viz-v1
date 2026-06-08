import React, { useEffect, useRef, useState } from 'react';
import { X, RotateCcw, Play, Pause, Camera, Download, Box, Layers, Video, Loader2, Wand2 } from 'lucide-react';
import { TrellisResult } from '../services/splatService';

interface SplatViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: TrellisResult;
  onCapture: (capturedDataUrl: string, action: 'apply' | 'regenerate') => void;
  prompt: string;
  inline?: boolean;
}

export const SplatViewerModal: React.FC<SplatViewerModalProps> = ({
  isOpen,
  onClose,
  result,
  onCapture,
  prompt,
  inline = false
}) => {
  const [tab, setTab] = useState<'splat' | 'mesh' | 'video'>(
    result.gaussian_ply ? 'splat' : result.model_file ? 'mesh' : 'video'
  );
  const [autoRotate, setAutoRotate] = useState(true);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const modelViewerRef = useRef<any>(null);

  // Handle message events from SuperSplat iframe
  useEffect(() => {
    if (!isOpen || tab !== 'splat' || !result.gaussian_ply) return;

    let timeoutId: NodeJS.Timeout;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'supersplat-loaded') {
        console.log("[SplatViewerModal] SuperSplat model finished loading.");
        setIsModelLoading(false);
        if (timeoutId) clearTimeout(timeoutId);
      } else if (event.data?.type === 'supersplat-progress') {
        const progress = Math.min(100, Math.max(0, Math.round(event.data.progress || 0)));
        setLoadingProgress(progress);
      }
    };

    window.addEventListener('message', handleMessage);
    
    setIsModelLoading(true);
    setLoadingProgress(0);
    setErrorMsg(null);

    // Set a safety timeout of 15 seconds. If loading hasn't completed, warn about rebuilding/restarting.
    timeoutId = setTimeout(() => {
      setIsModelLoading(false);
      setErrorMsg("Loading timed out. The 3D viewer assets could not be loaded. Please ensure you have run 'npm run build' and restarted the server ('pm2 restart all') to deploy the viewer assets.");
    }, 15000);

    return () => {
      window.removeEventListener('message', handleMessage);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isOpen, tab, result.gaussian_ply]);

  if (!isOpen) return null;

  const handleResetCamera = () => {
    if (tab === 'splat') {
      const iframe = document.getElementById('supersplat-iframe') as HTMLIFrameElement;
      const iframeWin = iframe?.contentWindow as any;
      if (iframeWin?.viewer?.global?.events) {
        iframeWin.viewer.global.events.fire('inputEvent', 'reset');
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

  const handleCapture = async (action: 'apply' | 'regenerate') => {
    if (tab === 'splat') {
      const iframe = document.getElementById('supersplat-iframe') as HTMLIFrameElement;
      const iframeWin = iframe?.contentWindow as any;
      if (iframeWin?.captureScreenshot) {
        try {
          setIsModelLoading(true);
          const dataUrl = await iframeWin.captureScreenshot();
          setIsModelLoading(false);
          onCapture(dataUrl, action);
        } catch (err) {
          console.error('Failed to capture SuperSplat screenshot:', err);
          setIsModelLoading(false);
          alert('Failed to capture perspective. Please try again.');
        }
      } else {
        alert('Viewer not fully loaded yet. Please wait.');
      }
    } else if (tab === 'mesh') {
      const viewer = modelViewerRef.current;
      if (viewer) {
        try {
          const blob = await viewer.toBlob({ idealAspect: false });
          const reader = new FileReader();
          reader.onloadend = () => {
            onCapture(reader.result as string, action);
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

  const content = (
    <>
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
            title={inline ? "Exit 3D View" : "Close"}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0">
          
          {/* 3D Viewport */}
          <div className="flex-1 relative bg-slate-950 min-h-[300px] flex items-center justify-center">
            
            {tab === 'splat' && result.gaussian_ply && (
              <iframe
                id="supersplat-iframe"
                src={`/supersplat/index.html?content=${encodeURIComponent(result.gaussian_ply)}&noanim=true&noui=true&webgl=true`}
                className="w-full h-full border-0 bg-transparent block"
                allow="vr; xr-spatial-tracking"
                onLoad={() => {
                  // Wait a short duration, then check if same-origin document content is a 404 page
                  setTimeout(() => {
                    const iframe = document.getElementById('supersplat-iframe') as HTMLIFrameElement;
                    try {
                      const iframeDoc = iframe?.contentDocument || iframe?.contentWindow?.document;
                      if (iframeDoc) {
                        const bodyText = iframeDoc.body?.textContent || "";
                        if (bodyText.includes("404") || bodyText.includes("Page Not Found") || iframeDoc.title.includes("404")) {
                          setIsModelLoading(false);
                          setErrorMsg("404 Not Found: The 3D viewer assets have not been built or deployed on the server. Please SSH into the server, pull the latest code, run 'npm run build', and run 'pm2 restart all' to deploy the assets.");
                        }
                      }
                    } catch (e) {
                      console.log("Could not inspect iframe due to same-origin restrictions, relying on timeout.");
                    }
                  }, 1000);
                }}
              />
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

                    {tab === 'mesh' && (
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
                    )}
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
                    Rotate the 3D model to your desired perspective. You can either directly regenerate a new high-quality image from this angle or set it as the editor source image to modify it first.
                  </p>
                  
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleCapture('regenerate')}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 active:scale-[0.98] text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-orange-900/40"
                    >
                      <Wand2 size={14} />
                      Regenerate from this Angle
                    </button>

                    <button
                      onClick={() => handleCapture('apply')}
                      className="w-full flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-white text-[11px] font-semibold rounded-lg transition-all border border-slate-700"
                    >
                      <Camera size={13} />
                      Set as Editor Source Image
                    </button>
                  </div>
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
    </>
  );

  if (inline) {
    return (
      <div className="relative flex flex-col w-full h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {content}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <div className="relative flex flex-col w-full max-w-6xl h-[85vh] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        {content}
      </div>
    </div>
  );
};
