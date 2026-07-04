import jsPDF from 'jspdf';

/**
 * Build the PDF document (shared logic)
 */
function buildPDF(researchData) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let y = 0;

  // Colors
  const darkBg = [18, 18, 24];
  const cardBg = [28, 28, 36];
  const gold = [234, 179, 8];
  const white = [255, 255, 255];
  const gray = [160, 160, 170];
  const lightGray = [200, 200, 210];

  // Helper: check if we need a new page
  function checkNewPage(neededHeight = 30) {
    if (y + neededHeight > pageHeight - 20) {
      doc.addPage();
      // Dark background for new page
      doc.setFillColor(...darkBg);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      y = 20;
    }
  }

  // === Page Background ===
  doc.setFillColor(...darkBg);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // === Header Bar ===
  doc.setFillColor(...cardBg);
  doc.rect(0, 0, pageWidth, 40, 'F');

  // Gold accent line
  doc.setFillColor(...gold);
  doc.rect(0, 40, pageWidth, 1, 'F');

  // Header text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...gold);
  doc.text('RELU CONSULTANCY · COMPANY RESEARCH REPORT', margin, 18);

  // Company name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...white);
  doc.text(researchData.companyName || 'Company Report', margin, 32);

  y = 52;

  // === Company Information Section ===
  doc.setFillColor(35, 35, 45);
  doc.roundedRect(margin, y, contentWidth, 50, 3, 3, 'F');

  // Section header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...gold);
  doc.text('COMPANY INFORMATION', margin + 8, y + 12);

  // Gold underline
  doc.setFillColor(...gold);
  doc.rect(margin + 8, y + 15, 45, 0.5, 'F');

  // Info rows
  const infoStartY = y + 24;
  doc.setFontSize(9);

  const infoItems = [
    ['Website', researchData.website || 'N/A'],
    ['Phone', researchData.phone || 'Not publicly listed'],
    ['Address', researchData.address || 'Not publicly available'],
  ];

  infoItems.forEach((item, i) => {
    const rowY = infoStartY + i * 8;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...gray);
    doc.text(item[0], margin + 12, rowY);
    doc.setTextColor(...lightGray);
    doc.text(item[1], margin + 45, rowY);
  });

  y += 60;

  // === Products & Services ===
  checkNewPage(50);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...gold);
  doc.text('PRODUCTS & SERVICES', margin, y + 8);

  doc.setFillColor(...gold);
  doc.rect(margin, y + 11, 42, 0.5, 'F');

  y += 18;
  const products = researchData.productsAndServices || [];
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...lightGray);

  products.forEach((product) => {
    checkNewPage(8);
    doc.text(`• ${product}`, margin + 4, y);
    y += 7;
  });

  y += 5;

  // === Pain Points ===
  checkNewPage(50);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...gold);
  doc.text('POTENTIAL PAIN POINTS', margin, y + 8);

  doc.setFillColor(...gold);
  doc.rect(margin, y + 11, 52, 0.5, 'F');

  y += 18;
  const painPoints = researchData.painPoints || [];
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...lightGray);

  painPoints.forEach((point) => {
    checkNewPage(20);
    const lines = doc.splitTextToSize(`• ${point}`, contentWidth - 8);
    doc.text(lines, margin + 4, y);
    y += lines.length * 5 + 4;
  });

  y += 5;

  // === Competitors ===
  checkNewPage(40);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...gold);
  doc.text('COMPETITORS', margin, y + 8);

  doc.setFillColor(...gold);
  doc.rect(margin, y + 11, 28, 0.5, 'F');

  y += 18;
  const competitors = researchData.competitors || [];

  if (competitors.length > 0) {
    // Table header
    doc.setFillColor(35, 35, 45);
    doc.roundedRect(margin, y, contentWidth, 10, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...gold);
    doc.text('Company', margin + 8, y + 7);
    doc.text('Website', margin + 70, y + 7);
    y += 14;

    competitors.forEach((comp) => {
      checkNewPage(12);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...white);
      doc.text(comp.name || 'N/A', margin + 8, y);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 180, 255);
      const website = comp.website || 'N/A';
      doc.text(website.length > 50 ? website.substring(0, 50) + '...' : website, margin + 70, y);
      y += 9;
    });
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...gray);
    doc.text('No competitors identified.', margin + 4, y);
    y += 10;
  }

  // === Footer ===
  y += 10;
  checkNewPage(20);
  doc.setFillColor(...gold);
  doc.rect(margin, y, contentWidth, 0.3, 'F');
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...gray);
  doc.text(
    `CompanyIQ - Company Research Report | ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
    margin,
    y
  );

  // Save
  return doc;
}

/**
 * Generate and download the PDF report
 */
export function generatePDF(researchData) {
  const doc = buildPDF(researchData);
  const fileName = `${(researchData.companyName || 'company').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-research-report.pdf`;
  doc.save(fileName);
}

/**
 * Generate PDF and return as a Blob without triggering a file download.
 */
export function generatePDFBlob(researchData) {
  const doc = buildPDF(researchData);
  return doc.output('blob');
}
