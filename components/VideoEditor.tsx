import React, { useState, useEffect, useRef } from 'react';
import { Film, Loader2, Download, Zap, Maximize2, Eye, Upload, Image as ImageIcon, X, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthProvider';
import { getHouzaiFilename } from '../utils/filenameUtils';
import { videoQuotaService } from '../services/quotaService';
import { KlingModel, VideoGenerationSettings } from '../types';
import ImageUpload from './ImageUpload';

const VideoEditor: React.FC = () => {
    const { user } = useAuth();
    const [sourceImage, setSourceImage] = useState<string | null>(null);
    const [endImage, setEndImage] = useState<string | null>(null);
    const [imageReferences, setImageReferences] = useState<string[]>([]);
    const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
    const [videoTaskId, setVideoTaskId] = useState<string | null>(null);
    const [videoQuota, setVideoQuota] = useState<{ used: number; quota: number; last_reset: string } | null>(null);



    const [videoSettings, setVideoSettings] = useState<VideoGenerationSettings>({
        model: KlingModel.V2_5_Turbo,
        duration: 5,
        aspectRatio: '16:9',
        prompt: '',
        cfgScale: 0.5,
        mode: 'std',
        multiShot: false,
        multiPrompt: [
            { index: 1, prompt: '', duration: '5' }
        ]
    });

    // Load video quota
    useEffect(() => {
        const loadVideoQuota = async () => {
            if (!user) return;
            try {
                const quota = await videoQuotaService.getUserVideoQuota(user.id);
                setVideoQuota(quota);
            } catch (error) {
                console.error('Error loading video quota:', error);
            }
        };
        loadVideoQuota();
    }, [user?.id]);

    // Helper to resize image to max 2K resolution
    const resizeImage = (imageSrc: string): Promise<string> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const maxDim = 2048; // 2K resolution limit

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
                if (!ctx) {
                    reject(new Error('Failed to get canvas context'));
                    return;
                }
                ctx.drawImage(img, 0, 0, width, height);
                // Get base64 string (this also handles the URL -> Base64 conversion)
                const base64 = canvas.toDataURL('image/jpeg', 0.9);
                resolve(base64);
            };
            img.onerror = (err) => reject(err);
            img.src = imageSrc;
        });
    };

    const handleGenerateVideo = async () => {
        if (!sourceImage || !user) {
            alert('Please upload an image first and sign in');
            return;
        }

        try {
            setIsGeneratingVideo(true);
            setGeneratedVideoUrl(null);

            // Check quota
            const canGenerate = await videoQuotaService.canGenerateVideo(user.id);
            if (!canGenerate) {
                alert('Video quota exceeded. Please upgrade or wait for monthly reset.');
                setIsGeneratingVideo(false);
                return;
            }

            const isOmniModel = videoSettings.model === KlingModel.Omni_1 || videoSettings.model === KlingModel.V3_Omni;

            if (isOmniModel) {
                if (imageReferences.length === 0) {
                    alert('Please upload at least one image reference for Omni models.');
                    setIsGeneratingVideo(false);
                    return;
                }
            } else {
                if (!sourceImage) {
                    alert('Please upload a start frame.');
                    setIsGeneratingVideo(false);
                    return;
                }
            }

            // Resize/Process image(s) before sending
            let processedImage: string | undefined = undefined;
            if (sourceImage) {
                processedImage = await resizeImage(sourceImage);
            }
            
            let processedImageReferences: string[] = [];
            if (isOmniModel && imageReferences.length > 0) {
                processedImageReferences = await Promise.all(imageReferences.map(img => resizeImage(img)));
            }

            // Calculate duration (Sum customized multi_prompts if active)
            const durationToSend = (videoSettings.model === KlingModel.V3 && videoSettings.multiShot && videoSettings.multiPrompt)
                ? videoSettings.multiPrompt.reduce((acc, shot) => acc + parseInt(shot.duration || '0'), 0)
                : videoSettings.duration;

            // Call Netlify function to generate video
            const response = await fetch('/api/kling-video', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'generate',
                    image: isOmniModel ? undefined : processedImage,
                    model: videoSettings.model,
                    duration: durationToSend,
                    aspectRatio: videoSettings.aspectRatio,
                    prompt: videoSettings.prompt,
                    cfgScale: videoSettings.cfgScale || 0.5,
                    mode: videoSettings.mode,
                    end_image: (!isOmniModel && endImage) ? await resizeImage(endImage) : undefined,
                    imageReferences: isOmniModel ? processedImageReferences : undefined,
                    multiShot: videoSettings.model === KlingModel.V3 || videoSettings.model === KlingModel.V3_Omni ? videoSettings.multiShot : false,
                    multiPrompt: videoSettings.multiPrompt
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.error || errorData.details || response.statusText || 'Unknown server error';
                throw new Error(`Server Error (${response.status}): ${errorMessage}`);
            }

            const { task_id } = await response.json();
            setVideoTaskId(task_id);

            // Increment usage
            await videoQuotaService.incrementVideoUsage(user.id);

            // Refresh quota
            const updatedQuota = await videoQuotaService.getUserVideoQuota(user.id);
            setVideoQuota(updatedQuota);

            // Poll for completion
            const pollInterval = setInterval(async () => {
                try {
                    const pollResponse = await fetch('/api/kling-video', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'poll',
                            task_id
                        })
                    });

                    if (!pollResponse.ok) {
                        throw new Error('Failed to check video status');
                    }

                    const status = await pollResponse.json();
                    console.log('Video status:', status);

                    if (status.status === 'completed') {
                        clearInterval(pollInterval);
                        setGeneratedVideoUrl(status.video_url);
                        setIsGeneratingVideo(false);
                        setVideoTaskId(null);
                    } else if (status.status === 'failed') {
                        clearInterval(pollInterval);
                        setIsGeneratingVideo(false);
                        setVideoTaskId(null);
                        alert(`Video generation failed: ${status.error_message}`);
                    }
                } catch (error) {
                    console.error('Polling error:', error);
                    // Don't stop polling on transient errors
                }
            }, 5000); // Poll every 5 seconds

        } catch (error: any) {
            console.error('Video generation error:', error);
            alert(`Failed to generate video: ${error.message}`);
            setIsGeneratingVideo(false);
        }
    };

    return (
        <div className="flex flex-col lg:flex-row h-full gap-6 p-6 max-w-[1600px] mx-auto">
            {/* Left Column: Settings & Input */}
            <div className="w-full lg:w-1/3 flex flex-col gap-6">

                {/* Image Input Section */}
                {(videoSettings.model === KlingModel.Omni_1 || videoSettings.model === KlingModel.V3_Omni) ? (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                                <ImageIcon size={16} className="text-indigo-400" />
                                Image References
                            </h2>
                            <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-1 rounded border border-slate-700 shadow-sm">Tag with @1, @2 in Prompt</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {imageReferences.map((img, idx) => {
                                const isVideo = img.startsWith('data:video/');
                                return (
                                <div key={idx} className="relative aspect-video bg-slate-800 rounded-lg overflow-hidden group shadow-md border border-slate-700">
                                    {isVideo ? (
                                        <video src={img} className="w-full h-full object-cover" muted />
                                    ) : (
                                        <img src={img} alt={`Ref ${idx+1}`} className="w-full h-full object-cover" />
                                    )}
                                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button 
                                            onClick={() => setImageReferences(refs => refs.filter((_, i) => i !== idx))} 
                                            className="p-2 bg-red-500/80 text-white rounded-full hover:bg-red-500 transition-colors shadow-lg"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    <div className="absolute top-2 left-2 bg-indigo-600 shadow-lg border border-indigo-400/30 text-white text-[10px] font-black px-2 py-0.5 rounded-md">
                                        @{idx+1}
                                    </div>
                                </div>
                            ))}
                            {imageReferences.length < 6 && (
                                <div className="aspect-video">
                                    <ImageUpload
                                        selectedImage={null}
                                        onImageSelected={(img) => { if(img) setImageReferences([...imageReferences, img]) }}
                                        label="Add Reference"
                                        acceptVideo={videoSettings.model === KlingModel.Omni_1 || videoSettings.model === KlingModel.V3_Omni || videoSettings.model === KlingModel.V3}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        {/* Source Image */}
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                            <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                                <ImageIcon size={16} className="text-indigo-400" />
                                Start Frame
                            </h2>
                            <div className="aspect-video">
                                <ImageUpload
                                    selectedImage={sourceImage}
                                    onImageSelected={setSourceImage}
                                    label="Start Frame"
                                    acceptVideo={videoSettings.model === KlingModel.V3}
                                />
                            </div>
                        </div>

                        {/* End Image */}
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                            <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                                <ImageIcon size={16} className="text-pink-400" />
                                End Frame (Opt)
                            </h2>
                            <div className="aspect-video">
                                <ImageUpload
                                    selectedImage={endImage}
                                    onImageSelected={setEndImage}
                                    label="End Frame"
                                    acceptVideo={videoSettings.model === KlingModel.V3}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Settings Panel */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 flex-1">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Film size={20} className="text-indigo-400" />
                        Video Settings
                    </h2>

                    {/* Video Quota Display */}
                    {videoQuota && (
                        <div className="mb-6 p-3 bg-slate-800 rounded-lg border border-slate-700">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sm text-slate-400">Video Credits</span>
                                <span className="text-sm font-semibold text-white">
                                    {videoQuota.quota - videoQuota.used} / {videoQuota.quota}
                                </span>
                            </div>
                            <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                <div
                                    className="bg-indigo-500 h-full rounded-full"
                                    style={{ width: `${(videoQuota.used / videoQuota.quota) * 100}%` }}
                                />
                            </div>
                        </div>
                    )}

                    <div className="space-y-5">
                        {/* Model Selection */}
                        <div>
                            <label className="block text-xs font-medium text-slate-400 uppercase mb-2">Model</label>
                            <select
                                value={videoSettings.model}
                                onChange={(e) => {
                                    const newModel = e.target.value as KlingModel;
                                    let newMode = videoSettings.mode;
                                    let newDuration = videoSettings.duration;
                                    const isAdvancedModel = newModel === KlingModel.V3 || newModel === KlingModel.V3_Omni || newModel === KlingModel.Omni_1;
                                    if (!isAdvancedModel && newMode === '4k') {
                                        newMode = 'pro';
                                    }
                                    if (!isAdvancedModel && newDuration !== 5 && newDuration !== 10) {
                                        newDuration = 5;
                                    }
                                    setVideoSettings({ ...videoSettings, model: newModel, mode: newMode, duration: newDuration });
                                }}
                                className="w-full bg-slate-800 text-white px-3 py-2.5 rounded-lg border border-slate-700 focus:border-indigo-500 focus:outline-none transition-colors"
                            >
                                <option value={KlingModel.V2_5_Turbo}>Kling 2.5 Turbo (Faster)</option>
                                <option value={KlingModel.V2_1}>Kling 2.1 (Higher Quality)</option>
                                <option value={KlingModel.V3}>Kling 3.0 (Multi-Shot)</option>
                                <option value={KlingModel.V3_Omni}>Kling 3.0 Omni</option>
                                <option value={KlingModel.Omni_1}>Kling Omni O1</option>
                            </select>
                        </div>

                        {/* Multi-Shot Toggle */}
                        {videoSettings.model === KlingModel.V3 && (
                            <div className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-lg border border-slate-700 transition-all">
                                <input
                                    type="checkbox"
                                    checked={videoSettings.multiShot}
                                    onChange={(e) => setVideoSettings({ ...videoSettings, multiShot: e.target.checked })}
                                    className="w-4 h-4 rounded border-slate-600 bg-slate-900 checked:bg-indigo-500 shrink-0"
                                />
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-white">Custom Multi-Shot</span>
                                    <span className="text-[10px] text-slate-400 leading-tight mt-0.5">Generate multiple consecutive segments in one video sequence</span>
                                </div>
                            </div>
                        )}

                        {/* Quality Selector */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs font-medium text-slate-400 uppercase">Quality</label>
                                <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                                    {videoSettings.mode === '4k' ? '4K' : videoSettings.mode === 'pro' ? '1080p' : '720p'}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-800 rounded-lg border border-slate-700">
                                <button
                                    onClick={() => setVideoSettings({ ...videoSettings, mode: 'std' })}
                                    className={`px-3 py-2 rounded-md text-xs font-medium transition-all duration-200 ${videoSettings.mode !== 'pro' && videoSettings.mode !== '4k'
                                        ? 'bg-slate-600 text-white shadow-sm'
                                        : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/50'
                                        }`}
                                >
                                    Standard
                                </button>
                                <button
                                    onClick={() => setVideoSettings({ ...videoSettings, mode: 'pro' })}
                                    className={`px-3 py-2 rounded-md text-xs font-medium transition-all duration-200 ${videoSettings.mode === 'pro'
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/50'
                                        }`}
                                >
                                    Professional
                                </button>
                                {(videoSettings.model === KlingModel.V3 || videoSettings.model === KlingModel.V3_Omni || videoSettings.model === KlingModel.Omni_1) && (
                                    <button
                                        onClick={() => setVideoSettings({ ...videoSettings, mode: '4k' })}
                                        className={`col-span-2 px-3 py-2 rounded-md text-xs font-medium transition-all duration-200 ${videoSettings.mode === '4k'
                                            ? 'bg-purple-600 text-white shadow-sm'
                                            : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/50'
                                            }`}
                                    >
                                        4K Ultra HD
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Duration Selector */}
                        {!videoSettings.multiShot && (
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-xs font-medium text-slate-400 uppercase">Duration</label>
                                    <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                                        {videoSettings.duration} sec
                                    </span>
                                </div>
                                {videoSettings.model === KlingModel.V3 || videoSettings.model === KlingModel.V3_Omni || videoSettings.model === KlingModel.Omni_1 ? (
                                    <>
                                        <input
                                            type="range"
                                            min="3" max="15" step="1"
                                            value={videoSettings.duration}
                                            onChange={(e) => setVideoSettings({ ...videoSettings, duration: parseInt(e.target.value) })}
                                            className="w-full accent-indigo-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                        />
                                        <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                                            <span>3s</span>
                                            <span>15s</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => setVideoSettings({ ...videoSettings, duration: 5 })}
                                            className={`py-2.5 rounded-lg text-sm font-medium transition-colors border ${videoSettings.duration === 5
                                                ? 'bg-indigo-600 border-indigo-500 text-white'
                                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
                                        >
                                            5 seconds
                                        </button>
                                        <button
                                            onClick={() => setVideoSettings({ ...videoSettings, duration: 10 })}
                                            className={`py-2.5 rounded-lg text-sm font-medium transition-colors border ${videoSettings.duration === 10
                                                ? 'bg-indigo-600 border-indigo-500 text-white'
                                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
                                        >
                                            10 seconds
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Aspect Ratio */}
                        <div>
                            <label className="block text-xs font-medium text-slate-400 uppercase mb-2">Aspect Ratio</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['16:9', '9:16', '1:1', '4:3', '3:4'].map((ratio) => (
                                    <button
                                        key={ratio}
                                        onClick={() => setVideoSettings({ ...videoSettings, aspectRatio: ratio as any })}
                                        className={`py-2 rounded-lg text-xs font-medium transition-colors border ${videoSettings.aspectRatio === ratio
                                            ? 'bg-indigo-600 border-indigo-500 text-white'
                                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                                            }`}
                                    >
                                        {ratio}
                                    </button>
                                ))}
                            </div>
                        </div>


                        {/* Prompt Structure */}
                        {videoSettings.multiShot ? (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <label className="block text-xs font-bold text-indigo-400 uppercase tracking-widest">Multi-Shot Sequence</label>
                                    <span className="text-[10px] text-slate-400 bg-slate-800 border border-slate-700 px-2 py-1 rounded shadow-sm flex items-center gap-1">
                                        <Film size={12} className="text-indigo-400"/> Total: <strong className="text-white">{videoSettings.multiPrompt?.reduce((a, b) => a + parseInt(b.duration || '0'), 0)}s</strong>
                                    </span>
                                </div>
                                <div className="space-y-3">
                                    {videoSettings.multiPrompt?.map((shot, idx) => (
                                        <div key={idx} className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex flex-col gap-2 relative group hover:border-indigo-500/50 transition-colors">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Shot 0{shot.index}</span>
                                                {videoSettings.multiPrompt!.length > 1 && (
                                                    <button onClick={() => {
                                                        const newPrompts = videoSettings.multiPrompt!.filter((_, i) => i !== idx).map((s, i) => ({ ...s, index: i + 1 }));
                                                        setVideoSettings({ ...videoSettings, multiPrompt: newPrompts });
                                                    }} className="text-slate-500 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                            <textarea
                                                value={shot.prompt}
                                                onChange={(e) => {
                                                    const newPrompts = [...videoSettings.multiPrompt!];
                                                    newPrompts[idx].prompt = e.target.value;
                                                    setVideoSettings({ ...videoSettings, multiPrompt: newPrompts });
                                                }}
                                                placeholder={`Action or scene description...`}
                                                className="w-full bg-slate-900/50 text-white px-3 py-2 rounded-lg text-xs resize-none border border-slate-700 focus:border-indigo-500 outline-none"
                                                rows={2}
                                            />
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-slate-400 uppercase font-medium">Duration:</span>
                                                <select
                                                    value={shot.duration}
                                                    onChange={(e) => {
                                                        const newPrompts = [...videoSettings.multiPrompt!];
                                                        newPrompts[idx].duration = e.target.value;
                                                        setVideoSettings({ ...videoSettings, multiPrompt: newPrompts });
                                                    }}
                                                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white outline-none focus:border-indigo-500 min-w-[60px]"
                                                >
                                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(s => <option key={s} value={s.toString()}>{s}s</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={() => {
                                        const newPrompts = [...(videoSettings.multiPrompt || []), { index: (videoSettings.multiPrompt?.length || 0) + 1, prompt: '', duration: '5' }];
                                        setVideoSettings({ ...videoSettings, multiPrompt: newPrompts });
                                    }}
                                    className="w-full py-2.5 border border-dashed border-indigo-500/50 rounded-lg text-indigo-400 text-xs font-bold uppercase tracking-widest hover:bg-indigo-500/10 hover:border-indigo-400 flex items-center justify-center gap-2 transition-colors"
                                >
                                    <Plus size={14} /> Add Segment
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Standard Prompt */}
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 uppercase mb-2">Prompt (Optional)</label>
                                    <textarea
                                        value={videoSettings.prompt}
                                        onChange={(e) => setVideoSettings({ ...videoSettings, prompt: e.target.value })}
                                        placeholder="Describe the camera movement or scene action..."
                                        className="w-full bg-slate-800 text-white px-4 py-3 rounded-lg text-sm resize-none border border-slate-700 focus:border-indigo-500 focus:outline-none transition-colors"
                                        rows={4}
                                        maxLength={2500}
                                    />
                                </div>

                                {/* Quick Prompts */}
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {[
                                        { label: 'Zoom In', value: 'Slow smooth zoom in' },
                                        { label: 'Zoom Out', value: 'Slow smooth zoom out' },
                                        { label: 'Pan Left', value: 'Slow smooth pan left' },
                                        { label: 'Pan Right', value: 'Slow smooth pan right' },
                                        { label: 'Timelapse', value: 'Realistic day to midnight timelapse' },
                                        { label: 'Drone Shot', value: 'Realistic drone shot establishing view' },
                                        { label: 'Cinematic', value: 'Cinematic lighting, 8k, highly detailed' },
                                        { label: 'Slow Motion', value: 'Slow motion movement' }
                                    ].map((item) => (
                                        <button
                                            key={item.label}
                                            onClick={() => setVideoSettings(prev => ({
                                                ...prev,
                                                prompt: prev.prompt ? `${prev.prompt}, ${item.value}` : item.value
                                            }))}
                                            className="text-[10px] px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded-full text-slate-300 transition-colors"
                                        >
                                            + {item.label}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}


                        {/* Generate Button */}
                        <button
                            onClick={handleGenerateVideo}
                            disabled={((videoSettings.model === KlingModel.Omni_1 || videoSettings.model === KlingModel.V3_Omni) ? imageReferences.length === 0 : !sourceImage) || isGeneratingVideo || (videoQuota && videoQuota.used >= videoQuota.quota)}
                            className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 ${((videoSettings.model === KlingModel.Omni_1 || videoSettings.model === KlingModel.V3_Omni) ? imageReferences.length === 0 : !sourceImage) || isGeneratingVideo || (videoQuota && videoQuota.used >= videoQuota.quota)
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                                : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-indigo-500/20'
                                }`}
                        >
                            {isGeneratingVideo ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    Generating Video...
                                </>
                            ) : (
                                <>
                                    <Film size={20} />
                                    Generate Video
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Right Column: Result */}
            <div className="w-full lg:w-2/3 bg-slate-900/30 border border-slate-800 rounded-xl p-6 flex flex-col">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Maximize2 size={20} className="text-indigo-400" />
                    Result
                </h2>

                <div className="flex-1 flex flex-col items-center justify-center bg-slate-950/50 rounded-lg border border-slate-800/50 relative overflow-hidden min-h-[400px]">
                    {isGeneratingVideo ? (
                        <div className="text-center">
                            <div className="w-20 h-20 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                            <h3 className="text-xl font-semibold text-white mb-2">Generating Your Video</h3>
                            <p className="text-slate-400 max-w-md mx-auto">
                                This usually takes 2-3 minutes. You can switch tabs, the process will continue in the background.
                            </p>
                        </div>
                    ) : generatedVideoUrl ? (
                        <div className="w-full h-full flex flex-col items-center justify-center p-4">
                            <video
                                src={generatedVideoUrl}
                                controls
                                autoPlay
                                loop
                                className="max-w-full max-h-[70vh] rounded-lg shadow-2xl"
                            />
                            <div className="mt-6 flex flex-col sm:flex-row gap-4 w-full justify-center">
                                <button
                                    onClick={async () => {
                                        if (!generatedVideoUrl) return;
                                        try {
                                            const button = document.activeElement as HTMLButtonElement;
                                            if (button) button.disabled = true;

                                            const downloadUrl = `/api/video-download?url=${encodeURIComponent(generatedVideoUrl)}`;
                                            const response = await fetch(downloadUrl);
                                            if (!response.ok) throw new Error('Download failed');

                                            const blob = await response.blob();
                                            const url = window.URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.href = url;
                                            // Extract filename or use timestamp
                                            a.download = getHouzaiFilename('mp4');
                                            document.body.appendChild(a);
                                            a.click();
                                            document.body.removeChild(a);
                                            window.URL.revokeObjectURL(url);
                                        } catch (err: any) {
                                            console.error('Download prompt failed:', err);
                                            // Fallback to window.open if proxy fails
                                            window.open(generatedVideoUrl, '_blank');
                                        } finally {
                                            const button = document.activeElement as HTMLButtonElement;
                                            if (button) button.disabled = false;
                                        }
                                    }}
                                    className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors shadow-lg shadow-indigo-500/20 active:scale-95"
                                >
                                    <Download size={18} />
                                    Download Video
                                </button>

                                <button
                                    onClick={() => window.open(generatedVideoUrl, '_blank')}
                                    className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors active:scale-95"
                                >
                                    <Eye size={18} />
                                    Watch in Fullscreen
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-slate-500">
                            <Film size={64} className="mx-auto mb-4 opacity-20" />
                            <p className="text-lg font-medium">No video generated yet</p>
                            <p className="text-sm mt-2">Upload an image and click Generate to create a video</p>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
};

export default VideoEditor;
