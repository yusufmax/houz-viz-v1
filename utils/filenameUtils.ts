/**
 * Generates a standardized filename for downloads: houzaiDDMMYYYY_HHMMSS
 * @param extension File extension (e.g., 'png', 'mp4')
 */
export const getHouzaiFilename = (extension: string): string => {
    const now = new Date();

    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();

    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    const dateStr = `${day}${month}${year}`;
    const timeStr = `${hours}${minutes}${seconds}`;

    return `houzai${dateStr}_${timeStr}.${extension}`;
};
