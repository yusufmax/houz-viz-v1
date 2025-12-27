import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Check, Loader2 } from 'lucide-react';
import { getPdfDocument, convertPdfPageToImage } from '../services/pdfService';
import * as pdfjsLib from 'pdfjs-dist';

interface PdfPageSelectorProps {
    file: File;
    onSelect: (base64: string) => void;
    onCancel: () => void;
}

const PdfPageSelector: React.FC<PdfPageSelectorProps> = ({ file, onSelect, onCancel }) => {
    const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRendering, setIsRendering] = useState(false);

    // Load PDF Document
    useEffect(() => {
        const loadPdf = async () => {
            try {
                setIsLoading(true);
                const pdfDoc = await getPdfDocument(file);
                setPdf(pdfDoc);
                setTotalPages(pdfDoc.numPages);
                setCurrentPage(1);
                setIsLoading(false);
            } catch (error) {
                console.error("Failed to load PDF", error);
                setIsLoading(false);
                // Handle error (maybe callback to parent)
            }
        };
        loadPdf();
    }, [file]);

    // Render Page Preview
    useEffect(() => {
        const renderPage = async () => {
            if (!pdf) return;

            try {
                setIsRendering(true);
                const base64 = await convertPdfPageToImage(pdf, currentPage);
                setPreviewImage(base64);
                setIsRendering(false);
            } catch (error) {
                console.error("Failed to render page", error);
                setIsRendering(false);
            }
        };

        renderPage();
    }, [pdf, currentPage]);

    const handlePrev = () => {
        if (currentPage > 1) setCurrentPage(prev => prev - 1);
    };

    const handleNext = () => {
        if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
    };

    const handleSelect = () => {
        if (previewImage) {
            onSelect(previewImage);
        }
    };

    if (isLoading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                <div className="bg-slate-900 p-6 rounded-xl border border-slate-700 flex flex-col items-center gap-4">
                    <Loader2 size={32} className="animate-spin text-indigo-500" />
                    <p className="text-slate-300 font-medium">Loading PDF...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 w-full max-w-2xl rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col h-[90dvh] max-h-[95vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
                    <h3 className="text-lg font-semibold text-white">Select Page</h3>
                    <button
                        onClick={onCancel}
                        className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Preview Area */}
                <div className="flex-1 overflow-hidden bg-slate-950 relative flex items-center justify-center p-4">
                    {isRendering && (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/50 z-10">
                            <Loader2 size={32} className="animate-spin text-indigo-500" />
                        </div>
                    )}

                    {previewImage ? (
                        <img
                            src={previewImage}
                            alt={`Page ${currentPage}`}
                            className="max-w-full max-h-full object-contain shadow-lg rounded-sm bg-white"
                        />
                    ) : (
                        <div className="text-slate-500">No preview available</div>
                    )}
                </div>

                {/* Controls */}
                <div className="p-4 pb-safe border-t border-slate-800 bg-slate-900/50 flex items-center justify-between gap-4">

                    {/* Pagination */}
                    <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-1">
                        <button
                            onClick={handlePrev}
                            disabled={currentPage <= 1 || isRendering}
                            className="p-2 hover:bg-slate-700 rounded-md text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <span className="px-2 text-sm font-medium text-slate-300 min-w-[80px] text-center">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            onClick={handleNext}
                            disabled={currentPage >= totalPages || isRendering}
                            className="p-2 hover:bg-slate-700 rounded-md text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSelect}
                            disabled={!previewImage || isRendering}
                            className="px-6 py-2 rounded-lg text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            <Check size={16} />
                            Select Page
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default PdfPageSelector;
