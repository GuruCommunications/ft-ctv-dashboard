// Lazy-loaded: html2canvas (~222KB) + jspdf (~296KB) only imported when needed.
// This saves ~500KB from the initial bundle.

export async function exportToPDF(config, sheetData, filters) {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // Cover page
  pdf.setFillColor(255, 255, 255); // white
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');

  pdf.setTextColor(26, 58, 107); // primary navy
  pdf.setFontSize(28);
  pdf.text(config?.clientName || 'Campaign Dashboard', pageWidth / 2, pageHeight / 3, { align: 'center' });

  pdf.setFontSize(16);
  pdf.setTextColor(100, 116, 139); // text-muted
  pdf.text(config?.campaignName || '', pageWidth / 2, pageHeight / 3 + 15, { align: 'center' });

  pdf.setFontSize(12);
  pdf.text(config?.dateRange || '', pageWidth / 2, pageHeight / 3 + 30, { align: 'center' });

  pdf.setFontSize(10);
  pdf.text(`Generated: ${new Date().toLocaleDateString('en-CA')}`, pageWidth / 2, pageHeight / 3 + 50, { align: 'center' });

  // Active filters summary
  const filterParts = [];
  if (filters?.provinces?.length) filterParts.push(`Provinces: ${filters.provinces.join(', ')}`);
  if (filters?.channelTypes?.length) filterParts.push(`Channels: ${filters.channelTypes.join(', ')}`);
  if (filters?.dateRange?.[0] || filters?.dateRange?.[1]) {
    filterParts.push(`Date: ${filters.dateRange[0] || 'start'} – ${filters.dateRange[1] || 'end'}`);
  }
  if (filterParts.length > 0) {
    pdf.setFontSize(9);
    pdf.setTextColor(100, 116, 139); // text-muted
    pdf.text(`Filters: ${filterParts.join('  |  ')}`, pageWidth / 2, pageHeight / 3 + 65, { align: 'center' });
  }

  // Capture the currently visible main content section
  const mainSection = document.querySelector('main[data-section]');
  if (mainSection) {
    await captureElement(pdf, mainSection, config, margin, contentWidth, pageWidth, pageHeight);
  }

  // Add page numbers
  const totalPages = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setTextColor(100, 116, 139); // text-muted
    pdf.setFontSize(8);
    pdf.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 5, { align: 'right' });
  }

  const filename = `${(config?.clientName || 'Dashboard').replace(/\s+/g, '_')}_${(config?.campaignName || 'Report').replace(/\s+/g, '_')}_Report.pdf`;
  pdf.save(filename);
}

async function captureElement(pdf, element, config, margin, contentWidth, pageWidth, pageHeight) {
  try {
    const canvas = await html2canvas(element, {
      backgroundColor: '#F5F7FA',
      scale: 2,
      useCORS: true,
      logging: false,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = contentWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const maxContentHeight = pageHeight - margin * 2 - 15;

    // If image fits on one page
    if (imgHeight <= maxContentHeight) {
      pdf.addPage();
      addFooter(pdf, config, pageWidth, pageHeight);
      pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
    } else {
      // Split across multiple pages
      let yOffset = 0;
      const sourceWidth = canvas.width;
      const sourceHeight = canvas.height;
      const rowsPerPage = Math.floor((maxContentHeight / imgHeight) * sourceHeight);

      while (yOffset < sourceHeight) {
        pdf.addPage();
        addFooter(pdf, config, pageWidth, pageHeight);

        const sliceHeight = Math.min(rowsPerPage, sourceHeight - yOffset);
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = sourceWidth;
        sliceCanvas.height = sliceHeight;
        const ctx = sliceCanvas.getContext('2d');
        ctx.drawImage(canvas, 0, yOffset, sourceWidth, sliceHeight, 0, 0, sourceWidth, sliceHeight);

        const sliceImg = sliceCanvas.toDataURL('image/png');
        const sliceDisplayHeight = (sliceHeight * imgWidth) / sourceWidth;
        pdf.addImage(sliceImg, 'PNG', margin, margin, imgWidth, sliceDisplayHeight);

        yOffset += sliceHeight;
      }
    }
  } catch (e) {
    pdf.addPage();
    addFooter(pdf, config, pageWidth, pageHeight);
    pdf.setTextColor(100, 116, 139); // text-muted
    pdf.setFontSize(12);
    pdf.text('Section could not be captured', margin, margin + 10);
  }
}

function addFooter(pdf, config, pageWidth, pageHeight) {
  pdf.setFillColor(245, 247, 250); // light grey
  pdf.rect(0, pageHeight - 12, pageWidth, 12, 'F');
  pdf.setTextColor(100, 116, 139); // text-muted
  pdf.setFontSize(8);
  pdf.text(
    `Confidential — Prepared for ${config?.clientName || 'Client'}`,
    pageWidth / 2,
    pageHeight - 5,
    { align: 'center' }
  );
}
