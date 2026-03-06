import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

/**
 * Generates a PDF from an HTML element (e.g. a rendered FacturaSheet).
 * Returns a Blob of the PDF.
 */
export async function generatePdfFromElement(element: HTMLElement): Promise<Blob> {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pdfWidth = 210;
  const pdfHeight = 297;
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;
  const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
  const width = imgWidth * ratio;
  const height = imgHeight * ratio;

  pdf.addImage(imgData, 'JPEG', 0, 0, width, height);
  return pdf.output('blob');
}

/**
 * Renders a URL in a hidden iframe, captures all .factura-page elements
 * (ORIGINAL + DUPLICADO) and returns a multi-page PDF Blob.
 */
export async function generatePdfFromUrl(url: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.left = '-9999px';
    iframe.style.top = '0';
    iframe.style.width = '210mm';
    iframe.style.height = '297mm';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    iframe.onload = async () => {
      try {
        // Wait for content to render (QR codes, fonts, etc.)
        await new Promise((r) => setTimeout(r, 1500));

        const doc = iframe.contentDocument;
        if (!doc) throw new Error('No se pudo acceder al contenido');

        const pages = doc.querySelectorAll('.factura-page') as NodeListOf<HTMLElement>;
        if (pages.length === 0) throw new Error('No se encontró la factura');

        // Capture only ORIGINAL + DUPLICADO (first 2 pages)
        const pagesToCapture = Array.from(pages).slice(0, 2);

        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pdfWidth = 210;
        const pdfHeight = 297;

        for (let i = 0; i < pagesToCapture.length; i++) {
          if (i > 0) pdf.addPage();

          const canvas = await html2canvas(pagesToCapture[i], {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
          });

          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          const ratio = Math.min(pdfWidth / canvas.width, pdfHeight / canvas.height);
          const width = canvas.width * ratio;
          const height = canvas.height * ratio;

          pdf.addImage(imgData, 'JPEG', 0, 0, width, height);
        }

        resolve(pdf.output('blob'));
      } catch (err) {
        reject(err);
      } finally {
        document.body.removeChild(iframe);
      }
    };

    iframe.onerror = () => {
      document.body.removeChild(iframe);
      reject(new Error('Error cargando la factura'));
    };

    iframe.src = url;
  });
}
