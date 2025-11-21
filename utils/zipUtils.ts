import JSZip from 'jszip';

export const downloadAsZip = async (files: Array<{ name: string; data: string }>, zipName: string = 'batch-results.zip') => {
    const zip = new JSZip();

    // Add each file to the zip
    files.forEach(file => {
        // Remove data URL prefix (data:image/jpeg;base64,)
        const base64Data = file.data.split(',')[1];
        zip.file(file.name, base64Data, { base64: true });
    });

    // Generate the zip file
    const blob = await zip.generateAsync({ type: 'blob' });

    // Trigger download
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = zipName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

export const downloadSingleImage = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
