import React, { useState } from 'react';
import { generateRaw } from '../../services/geminiService';
import { Loader2, Send, Code } from 'lucide-react';

const GeminiPlayground: React.FC = () => {
    const [prompt, setPrompt] = useState('Visualize a modern house in a forest, photorealistic, 4k');
    const [model, setModel] = useState('gemini-3-pro-image-preview');
    const [configJson, setConfigJson] = useState(JSON.stringify({
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: {
            aspectRatio: '16:9',
            imageSize: '4K'
        }
    }, null, 2));
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const config = JSON.parse(configJson);
            const response = await generateRaw(prompt, model, config);
            setResult(response);
        } catch (err: any) {
            setError(err.message || 'Generation failed');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const renderImage = () => {
        if (!result || !result.candidates || !result.candidates[0]?.content?.parts) return null;

        const parts = result.candidates[0].content.parts;
        const imagePart = parts.find((p: any) => p.inlineData);

        if (imagePart) {
            return (
                <div className="mt-4">
                    <h3 className="text-lg font-semibold mb-2">Generated Image</h3>
                    <img
                        src={`data:image/png;base64,${imagePart.inlineData.data}`}
                        alt="Generated"
                        className="max-w-full rounded-lg border border-slate-700 shadow-lg"
                    />
                </div>
            );
        }
        return <p className="text-yellow-400 mt-4">No image data found in response.</p>;
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-8 font-sans">
            <div className="max-w-6xl mx-auto">
                <header className="mb-8 border-b border-slate-800 pb-4">
                    <h1 className="text-3xl font-bold text-indigo-400 flex items-center gap-3">
                        <Code className="w-8 h-8" />
                        Gemini 3 Pro Playground
                    </h1>
                    <p className="text-slate-500 mt-2">Test raw API configurations directly.</p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Controls */}
                    <div className="space-y-6">

                        {/* Model Selection */}
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Model</label>
                            <select
                                value={model}
                                onChange={(e) => setModel(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-md px-4 py-2 text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            >
                                <option value="gemini-3-pro-image-preview">gemini-3-pro-image-preview</option>
                                <option value="gemini-2.5-flash-image">gemini-2.5-flash-image</option>
                            </select>
                        </div>

                        {/* Prompt */}
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Prompt</label>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                className="w-full h-32 bg-slate-900 border border-slate-700 rounded-md px-4 py-3 text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                                placeholder="Enter your prompt here..."
                            />
                        </div>

                        {/* Config Editor */}
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2 flex justify-between">
                                <span>Configuration (JSON)</span>
                                <span className="text-xs text-slate-500">Passed directly to generationConfig</span>
                            </label>
                            <textarea
                                value={configJson}
                                onChange={(e) => setConfigJson(e.target.value)}
                                className="w-full h-64 bg-slate-900 border border-slate-700 rounded-md px-4 py-3 text-indigo-300 font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                spellCheck={false}
                            />
                        </div>

                        <button
                            onClick={handleGenerate}
                            disabled={loading}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white font-medium py-3 rounded-md transition-colors flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <Send size={18} />}
                            Generate Request
                        </button>

                        {error && (
                            <div className="p-4 bg-red-900/30 border border-red-800 rounded-md text-red-200 text-sm">
                                <strong>Error:</strong> {error}
                            </div>
                        )}
                    </div>

                    {/* Results */}
                    <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-6 overflow-y-auto max-h-[calc(100vh-10rem)]">
                        <h2 className="text-xl font-semibold mb-4 text-slate-300">Result</h2>

                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                                <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-500" />
                                <p>Waiting for API response...</p>
                            </div>
                        ) : result ? (
                            <div className="space-y-6">
                                {renderImage()}

                                <div>
                                    <h3 className="text-sm font-medium text-slate-400 mb-2">Raw Response</h3>
                                    <pre className="bg-slate-950 p-4 rounded-md overflow-x-auto text-xs text-green-400 font-mono border border-slate-800">
                                        {JSON.stringify(result, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-600">
                                <Code className="w-12 h-12 mb-4 opacity-20" />
                                <p>Response will appear here</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GeminiPlayground;
