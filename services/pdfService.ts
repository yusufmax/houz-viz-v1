import * as pdfjsLib from 'pdfjs-dist';

// Set worker source - using unpkg for better reliability with npm package versions
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

/**
 * Gets the PDF document object from a file.
 * @param file The PDF file
 * @returns Promise resolving to the PDF document proxy
 */
export const getPdfDocument = async (file: File): Promise<pdfjsLib.PDFDocumentProxy> => {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    return loadingTask.promise;
};

/**
 * Converts a specific page of a PDF file to a base64 image string.
 * @param pdf The PDF document proxy
 * @param pageNumber The page number to convert (1-based index)
 * @returns Promise resolving to base64 image string (data:image/jpeg;base64,...)
 */
export const convertPdfPageToImage = async (pdf: pdfjsLib.PDFDocumentProxy, pageNumber: number): Promise<string> => {
    try {
        // Fetch the page
        const page = await pdf.getPage(pageNumber);

        // Set scale to get a reasonable resolution (e.g., 2.0 for better quality)
        const scale = 2.0;
        const viewport = page.getViewport({ scale });

        // Create a canvas to render the page
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if (!context) {
            throw new Error("Failed to create canvas context");
        }

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
            canvasContext: context,
            viewport: viewport,
        };

        await page.render(renderContext).promise;

        // Convert canvas to base64 image (JPEG)
        const base64 = canvas.toDataURL('image/jpeg', 0.85);

        return base64;
    } catch (error) {
        console.error("Error converting PDF page to image:", error);
        throw new Error("Failed to process PDF page");
    }
};

/**
 * Converts the first page of a PDF file to a base64 image string (Legacy/Convenience).
 * @param file The PDF file to convert
 * @returns Promise resolving to base64 image string
 */
export const convertPdfToImage = async (file: File): Promise<string> => {
    const pdf = await getPdfDocument(file);
    if (pdf.numPages === 0) throw new Error("PDF has no pages");
    return convertPdfPageToImage(pdf, 1);
};
