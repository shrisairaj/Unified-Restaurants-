const QR_EXPORT_SIZE = 1024;

export const buildQrFilename = (cafeName, tableLabel) => {
    const cafeSlug = (cafeName || 'cafe')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '');
    const tableSlug = (tableLabel || 'table')
        .replace(/^table-/i, 'table')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '');
    return `${cafeSlug}-${tableSlug}.png`;
};

/**
 * Converts the rendered QRCodeSVG element to a PNG and triggers a browser download.
 */
export const downloadSvgQrAsPng = (container, filename) => {
    const svg = container?.querySelector('svg');
    if (!svg) {
        return;
    }

    const clone = svg.cloneNode(true);
    clone.setAttribute('width', String(QR_EXPORT_SIZE));
    clone.setAttribute('height', String(QR_EXPORT_SIZE));

    const svgString = new XMLSerializer().serializeToString(clone);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const objectUrl = URL.createObjectURL(svgBlob);
    const image = new Image();

    image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = QR_EXPORT_SIZE;
        canvas.height = QR_EXPORT_SIZE;
        const context = canvas.getContext('2d');
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, QR_EXPORT_SIZE, QR_EXPORT_SIZE);
        context.drawImage(image, 0, 0, QR_EXPORT_SIZE, QR_EXPORT_SIZE);

        const link = document.createElement('a');
        link.download = filename;
        link.href = canvas.toDataURL('image/png');
        link.click();
        URL.revokeObjectURL(objectUrl);
    };

    image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
    };

    image.src = objectUrl;
};
