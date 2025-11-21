import React from 'react';
import { Download, X } from 'lucide-react';
import { downloadAsZip, downloadSingleImage } from '../utils/zipUtils';
import BeforeAfter from './BeforeAfter';

interface BatchResult {
    input: string;
    output: string | null;
    index: number;
}

interface BatchResultsProps {
    results: BatchResult[];
    onClose?: () => void;
}

const BatchResults: React.FC<BatchResultsProps> = ({ results, onClose }) => {
    const handleDownloadAll = async () => {
        const files = results
            .filter(r => r.output)
            .map((r, i) => ({
                name: `result-${r.index + 1}.jpg`,
                data: r.output!
            }));

        await downloadAsZip(files, `batch-results-${Date.now()}.zip`);
    };

    const handleDownloadSingle = (result: BatchResult) => {
        if (result.output) {
            downloadSingleImage(result.output, `result-${result.index + 1}.jpg`);
        }
    };

    const successCount = results.filter(r => r.output).length;
    const failCount = results.filter(r => !r.output).length;

    return (
        <div className="w-full h-full flex flex-col bg-slate-900/50 min-h-0">
            {/* Header */}
            <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-900/80 backdrop-blur shrink-0">
                <div>
                    <h2 className="text-lg font-bold text-white">Batch Results</h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                        {successCount} successful, {failCount} failed
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleDownloadAll}
                        disabled={successCount === 0}
                        className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Download size={14} />
                        Download All
                    </button>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-1.5 text-slate-400 hover:text-white transition-colors hover:bg-slate-800 rounded-lg"
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>
            </div>

            {/* Results Grid */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <div className="grid grid-cols-1 gap-6">
                    {results.map((result) => (
                        <div key={result.index} className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden flex flex-col">
                            {/* Header for Item */}
                            <div className="px-3 py-2 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/80">
                                <span className="text-xs font-medium text-slate-300">Image #{result.index + 1}</span>
                                {result.output && (
                                    <button
                                        onClick={() => handleDownloadSingle(result)}
                                        className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors"
                                    >
                                        <Download size={12} /> Save
                                    </button>
                                )}
                            </div>

                            {/* Before/After Slider */}
                            <div className="aspect-video w-full relative bg-slate-900">
                                {result.output ? (
                                    <BeforeAfter beforeImage={result.input} afterImage={result.output} />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-2">
                                        <div className="w-full h-full absolute inset-0 opacity-20">
                                            <img src={result.input} alt="Input" className="w-full h-full object-cover grayscale" />
                                        </div>
                                        <div className="z-10 bg-slate-900/80 p-4 rounded-lg border border-red-500/30 flex flex-col items-center">
                                            <X size={24} className="text-red-500 mb-2" />
                                            <span className="text-sm font-medium text-red-400">Generation Failed</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default BatchResults;
