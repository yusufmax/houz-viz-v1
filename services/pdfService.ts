import * as pdfjsLib from 'pdfjs-dist';

// Set worker source - using a CDN for simplicity and reliability in this environment
// This avoids complex build configuration for the worker file
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

/**
 * Converts the first page of a PDF file to a base64 image string.
 * @param file The PDF file to convert
 * @returns Promise resolving to base64 image string (data:image/jpeg;base64,...)
 */
export const convertPdfToImage = async (file: File): Promise<string> => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;

        if (pdf.numPages === 0) {
            throw new Error("PDF has no pages");
        }

        // Fetch the first page
        const page = await pdf.getPage(1);

        // Set scale to get a reasonable resolution (e.g., 1.5 or 2.0 for better quality)
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
        console.error("Error converting PDF to image:", error);
        throw new Error("Failed to process PDF file");
    }
};
