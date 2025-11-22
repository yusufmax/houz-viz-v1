import React, { useState, useEffect, useRef } from 'react';
import { Film, Loader2, Download, Zap, Maximize2, Eye, Upload, Image as ImageIcon, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthProvider';
import { videoQuotaService } from '../services/quotaService';
import { KlingModel, VideoGenerationSettings } from '../types';
import ImageUpload from './ImageUpload';

const VideoEditor: React.FC = () => {
    const { user } = useAuth();
    const [sourceImage, setSourceImage] = useState<string | null>(null);
    const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
    const [videoTaskId, setVideoTaskId] = useState<string | null>(null);
    const [videoQuota, setVideoQuota] = useState<{ used: number; quota: number; last_reset: string } | null>(null);

    const [activeCameraParam, setActiveCameraParam] = useState<string>('zoom');

    const [videoSettings, setVideoSettings] = useState<VideoGenerationSettings>({
        model: KlingModel.V2_5_Turbo,
        duration: 5,
        aspectRatio: '16:9',
        prompt: '',
        cfgScale: 0.5,
        mode: 'std',
        cameraControl: {
            type: 'simple',
            config: { horizontal: 0, vertical: 0, pan: 0, tilt: 0, roll: 0, zoom: 0 }
        }
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
    }, [user]);

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

            // Resize/Process image before sending
            const processedImage = await resizeImage(sourceImage);

            // Call Netlify function to generate video
            const response = await fetch('/.netlify/functions/kling-video', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'generate',
                    image: processedImage,
                    model: videoSettings.model,
                    duration: videoSettings.duration,
                    aspectRatio: videoSettings.aspectRatio,
                    prompt: videoSettings.prompt,
                    cfgScale: videoSettings.cfgScale || 0.5,
                    mode: videoSettings.mode,
                    cameraControl: videoSettings.cameraControl
                })
            });

            if (!response.ok) {
                throw new Error('Failed to start video generation');
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
                    const pollResponse = await fetch('/.netlify/functions/kling-video', {
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

                {/* Source Image Upload */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <ImageIcon size={20} className="text-indigo-400" />
                        Source Image
                    </h2>
                    <div className="aspect-video">
                        <ImageUpload
                            selectedImage={sourceImage}
                            onImageSelected={setSourceImage}
                            label="Upload Image for Video"
                        />
                    </div>
                </div>

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
                                onChange={(e) => setVideoSettings({ ...videoSettings, model: e.target.value as KlingModel })}
                                className="w-full bg-slate-800 text-white px-3 py-2.5 rounded-lg border border-slate-700 focus:border-indigo-500 focus:outline-none transition-colors"
                            >
                                <option value={KlingModel.V2_5_Turbo}>Kling 2.5 Turbo (Faster)</option>
                                <option value={KlingModel.V2_1}>Kling 2.1 (Higher Quality)</option>
                            </select>
                        </div>

                        {/* Quality Selector */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs font-medium text-slate-400 uppercase">Quality</label>
                                <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                                    {videoSettings.mode === 'pro' ? '1080p' : '720p'}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-800 rounded-lg border border-slate-700">
                                <button
                                    onClick={() => setVideoSettings({ ...videoSettings, mode: 'std' })}
                                    className={`px-3 py-2 rounded-md text-xs font-medium transition-all duration-200 ${videoSettings.mode !== 'pro'
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
                            </div>
                        </div>

                        {/* Duration Selector */}
                        <div>
                            <label className="block text-xs font-medium text-slate-400 uppercase mb-2">Duration</label>
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
                        </div>

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

                        {/* Camera Controls */}
                        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                            <label className="block text-xs font-medium text-slate-400 uppercase mb-3">Camera Control</label>

                            {/* Type Selection */}
                            <select
                                value={videoSettings.cameraControl?.type || 'simple'}
                                onChange={(e) => {
                                    const type = e.target.value as any;
                                    setVideoSettings({
                                        ...videoSettings,
                                        cameraControl: {
                                            type,
                                            config: videoSettings.cameraControl?.config || {
                                                horizontal: 0, vertical: 0, pan: 0, tilt: 0, roll: 0, zoom: 0
                                            }
                                        }
                                    });
                                }}
                                className="w-full bg-slate-900 text-white px-3 py-2 rounded-lg border border-slate-600 text-sm mb-4 focus:border-indigo-500 focus:outline-none"
                            >
                                <option value="simple">Custom (Simple)</option>
                                <option value="down_back">Zoom Out & Pan Down</option>
                                <option value="forward_up">Zoom In & Pan Up</option>
                                <option value="right_turn_forward">Rotate Right & Move Forward</option>
                                <option value="left_turn_forward">Rotate Left & Move Forward</option>
                            </select>

                            {/* Simple Mode Controls */}
                            {(!videoSettings.cameraControl || videoSettings.cameraControl.type === 'simple') && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-3 gap-2">
                                        {['horizontal', 'vertical', 'pan', 'tilt', 'roll', 'zoom'].map((param) => {
                                            const config = videoSettings.cameraControl?.config || { horizontal: 0, vertical: 0, pan: 0, tilt: 0, roll: 0, zoom: 0 };
                                            return (
                                                <button
                                                    key={param}
                                                    onClick={() => {
                                                        setActiveCameraParam(param);
                                                        const val = config[param as keyof typeof config] || 0;

                                                        setVideoSettings(prev => ({
                                                            ...prev,
                                                            cameraControl: {
                                                                type: 'simple',
                                                                config: {
                                                                    horizontal: 0, vertical: 0, pan: 0, tilt: 0, roll: 0, zoom: 0,
                                                                    [param]: val
                                                                }
                                                            }
                                                        }));
                                                    }}
                                                    className={`px-2 py-1.5 text-xs rounded border transition-colors capitalize ${activeCameraParam === param
                                                            ? 'bg-indigo-600 border-indigo-500 text-white'
                                                            : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                                                        }`}
                                                >
                                                    {param}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Slider for active param */}
                                    <div className="bg-slate-900/50 p-3 rounded border border-slate-800">
                                        <div className="flex justify-between text-xs mb-2">
                                            <span className="text-slate-400 capitalize">{activeCameraParam}</span>
                                            <span className="text-indigo-400 font-mono">
                                                {videoSettings.cameraControl?.config?.[activeCameraParam as keyof typeof videoSettings.cameraControl.config] || 0}
                                            </span>
                                        </div>
                                        <input
                                            type="range"
                                            min="-10"
                                            max="10"
                                            step="1"
                                            value={videoSettings.cameraControl?.config?.[activeCameraParam as keyof typeof videoSettings.cameraControl.config] || 0}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value);
                                                setVideoSettings({
                                                    ...videoSettings,
                                                    cameraControl: {
                                                        type: 'simple',
                                                        config: {
                                                            horizontal: 0, vertical: 0, pan: 0, tilt: 0, roll: 0, zoom: 0,
                                                            [activeCameraParam]: val
                                                        }
                                                    }
                                                });
                                            }}
                                            className="w-full accent-indigo-500 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                        />
                                        <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                                            <span>-10</span>
                                            <span>0</span>
                                            <span>10</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Prompt */}
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
                            <div className="text-right text-xs text-slate-500 mt-1">
                                {videoSettings.prompt.length} / 2500
                            </div>
                        </div>

                        {/* Generate Button */}
                        <button
                            onClick={handleGenerateVideo}
                            disabled={!sourceImage || isGeneratingVideo || (videoQuota && videoQuota.used >= videoQuota.quota)}
                            className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 ${!sourceImage || isGeneratingVideo || (videoQuota && videoQuota.used >= videoQuota.quota)
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
                            <div className="mt-6 flex gap-4">
                                <button
                                    onClick={() => window.open(generatedVideoUrl, '_blank')}
                                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors shadow-lg shadow-indigo-500/20"
                                >
                                    <Download size={18} />
                                    Download Video
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
        </div>
    );
};

export default VideoEditor;
