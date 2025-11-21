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
    onClose: () => void;
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 rounded-xl border border-slate-700 max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-white">Batch Results</h2>
                        <p className="text-sm text-slate-400 mt-1">
                            {successCount} successful, {failCount} failed
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleDownloadAll}
                            disabled={successCount === 0}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Download size={16} />
                            Download All ({successCount})
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Results Grid */}
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {results.map((result) => (
                            <div key={result.index} className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
                                {/* Before/After */}
                                <div className="grid grid-cols-2 gap-1 p-2">
                                    <div className="space-y-1">
                                        <p className="text-xs text-slate-400 text-center">Input #{result.index + 1}</p>
                                        <img src={result.input} alt={`Input ${result.index + 1}`} className="w-full aspect-square object-cover rounded" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-slate-400 text-center">Output</p>
                                        {result.output ? (
                                            <img src={result.output} alt={`Output ${result.index + 1}`} className="w-full aspect-square object-cover rounded" />
                                        ) : (
                                            <div className="w-full aspect-square bg-slate-900 rounded flex items-center justify-center">
                                                <p className="text-xs text-red-400">Failed</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Download Button */}
                                {result.output && (
                                    <div className="p-2 border-t border-slate-700">
                                        <button
                                            onClick={() => handleDownloadSingle(result)}
                                            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-slate-700 text-white text-sm rounded hover:bg-slate-600 transition-colors"
                                        >
                                            <Download size={14} />
                                            Download
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BatchResults;
