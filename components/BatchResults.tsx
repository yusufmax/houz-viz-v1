import React from 'react';
import { Download, X } from 'lucide-react';
import { downloadAsZip, downloadSingleImage } from '../utils/zipUtils';

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
        <div className="w-full h-full flex flex-col bg-slate-900/50">
            {/* Header */}
            <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-900/80 backdrop-blur">
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
                <div className="grid grid-cols-1 gap-4">
                    {results.map((result) => (
                        <div key={result.index} className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
                            {/* Before/After */}
                            <div className="grid grid-cols-2 gap-1 p-2">
                                <div className="space-y-1">
                                    <p className="text-[10px] text-slate-400 text-center uppercase tracking-wider">Input #{result.index + 1}</p>
                                    <img src={result.input} alt={`Input ${result.index + 1}`} className="w-full aspect-video object-cover rounded bg-slate-900" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] text-slate-400 text-center uppercase tracking-wider">Output</p>
                                    {result.output ? (
                                        <img src={result.output} alt={`Output ${result.index + 1}`} className="w-full aspect-video object-cover rounded bg-slate-900" />
                                    ) : (
                                        <div className="w-full aspect-video bg-slate-900 rounded flex items-center justify-center border border-slate-700 border-dashed">
                                            <p className="text-xs text-red-400 flex items-center gap-1">
                                                <X size={12} /> Failed
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Download Button */}
                            {result.output && (
                                <div className="px-2 pb-2">
                                    <button
                                        onClick={() => handleDownloadSingle(result)}
                                        className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white text-xs rounded transition-colors border border-slate-600 hover:border-slate-500"
                                    >
                                        <Download size={12} />
                                        Download Result
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default BatchResults;
