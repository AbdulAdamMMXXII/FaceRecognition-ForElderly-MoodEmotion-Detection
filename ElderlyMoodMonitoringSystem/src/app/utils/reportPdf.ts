import jsPDF from 'jspdf';
import type { MoodReading, Report } from '../types';
import { getMoodColor } from './moodUtils';

type ReportForPdf = Omit<Report, 'generatedAt' | 'llmStatus' | 'llmErrorCode'> & {
  generatedAt: Date | null;
  title: string;
  summary: string;
  analysisNarrative: string;
  caregiverSummary: string;
  period: string;
  insights: string[];
  source: string;
  modelUsed: string;
  llmStatus: string;
  llmErrorCode: string;
};

export type PdfUserDetails = {
  name: string;
  accountId: string;
  email: string;
  downloadedAt: Date;
};

const PAGE = {
  width: 210,
  height: 297,
  margin: 14,
};

function formatDateTime(value: Date | null): string {
  if (!value) return 'N/A';
  return value.toLocaleString();
}

function drawUserDetailsBlock(doc: jsPDF, userDetails?: PdfUserDetails) {
  if (!userDetails) return;

  const right = PAGE.width - PAGE.margin;
  const left = right - 68;
  const startY = PAGE.margin + 22;

  doc.setTextColor(17, 24, 39);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Prepared For', left, startY, { align: 'left' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(55, 65, 81);
  doc.text(`Name: ${userDetails.name || 'N/A'}`, left, startY + 4.5, { align: 'left' });
  doc.text(`Account ID: ${userDetails.accountId || 'N/A'}`, left, startY + 8.5, { align: 'left' });
  doc.text(`Email: ${userDetails.email || 'N/A'}`, left, startY + 12.5, { align: 'left' });
  doc.text(`Downloaded: ${formatDateTime(userDetails.downloadedAt)}`, left, startY + 16.5, { align: 'left' });
}

function drawElderCareHeader(doc: jsPDF, title: string, subtitle?: string, userDetails?: PdfUserDetails, showUserDetails = false) {
  doc.setFillColor(37, 99, 235);
  doc.roundedRect(PAGE.margin, PAGE.margin, 14, 14, 2, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('EC', PAGE.margin + 4.5, PAGE.margin + 9.5);

  doc.setTextColor(17, 24, 39);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('ElderCare', PAGE.margin + 18, PAGE.margin + 6);

  doc.setTextColor(75, 85, 99);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Mood Monitor System', PAGE.margin + 18, PAGE.margin + 11);

  doc.setDrawColor(229, 231, 235);
  doc.line(PAGE.margin, PAGE.margin + 18, PAGE.width - PAGE.margin, PAGE.margin + 18);

  if (showUserDetails) {
    drawUserDetailsBlock(doc, userDetails);
  }

  doc.setTextColor(17, 24, 39);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(title, PAGE.margin, PAGE.margin + 26);

  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(75, 85, 99);
    doc.text(subtitle, PAGE.margin, PAGE.margin + 32);
  }
}

function addWrappedParagraph(doc: jsPDF, text: string, startY: number, opts?: { bold?: boolean; size?: number }): number {
  const font = opts?.bold ? 'bold' : 'normal';
  const size = opts?.size || 10;
  doc.setFont('helvetica', font);
  doc.setFontSize(size);
  doc.setTextColor(31, 41, 55);

  const lines = doc.splitTextToSize(String(text || 'N/A'), PAGE.width - PAGE.margin * 2);
  doc.text(lines, PAGE.margin, startY);
  return startY + lines.length * (size * 0.38 + 1.2);
}

function ensureSpace(doc: jsPDF, currentY: number, neededHeight: number, title: string): number {
  if (currentY + neededHeight <= PAGE.height - PAGE.margin) return currentY;
  doc.addPage();
  drawElderCareHeader(doc, title);
  return PAGE.margin + 28;
}

function addSection(doc: jsPDF, sectionTitle: string, body: string, currentY: number, pageTitle: string): number {
  currentY = ensureSpace(doc, currentY, 18, pageTitle);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39);
  doc.text(sectionTitle, PAGE.margin, currentY);
  currentY += 5;

  currentY = ensureSpace(doc, currentY, 16, pageTitle);
  currentY = addWrappedParagraph(doc, body, currentY, { size: 10 });
  return currentY + 5;
}

function toPdfReport(report: Report): ReportForPdf {
  const generatedAt = report.generatedAt instanceof Date ? report.generatedAt : null;
  return {
    ...report,
    generatedAt,
    title: String(report.title || 'Mood Report'),
    summary: String(report.summary || 'N/A'),
    analysisNarrative: String(report.analysisNarrative || ''),
    caregiverSummary: String(report.caregiverSummary || ''),
    period: String(report.period || 'N/A'),
    insights: Array.isArray(report.insights) ? report.insights.map((s) => String(s)) : [],
    source: String(report.source || 'unknown'),
    modelUsed: String(report.modelUsed || ''),
    llmStatus: String(report.llmStatus || ''),
    llmErrorCode: String(report.llmErrorCode || ''),
  };
}

function renderSingleReportToDoc(doc: jsPDF, report: ReportForPdf, includeHeaderTitle: string, userDetails?: PdfUserDetails) {
  drawElderCareHeader(doc, includeHeaderTitle, report.title, userDetails, true);
  let y = PAGE.margin + 38;

  const metaRows = [
    `Report ID: ${report.id}`,
    `Period: ${report.period}`,
    `Generated At: ${formatDateTime(report.generatedAt)}`,
    `Emotion: ${report.emotion || 'N/A'}`,
    `Confidence: ${typeof report.confidence === 'number' ? `${Math.round(report.confidence * 100)}%` : 'N/A'}`,
    `Risk Level: ${report.riskLevel || 'N/A'}`,
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(55, 65, 81);
  metaRows.forEach((line) => {
    y = ensureSpace(doc, y, 8, includeHeaderTitle);
    doc.text(line, PAGE.margin, y);
    y += 5.2;
  });

  y += 2;
  y = addSection(doc, 'Executive Summary', report.summary, y, includeHeaderTitle);

  if (report.caregiverSummary) {
    y = addSection(doc, 'Caregiver Context', report.caregiverSummary, y, includeHeaderTitle);
  }

  if (report.analysisNarrative) {
    y = addSection(doc, 'AI-Powered Analysis', report.analysisNarrative, y, includeHeaderTitle);
  }

  y = ensureSpace(doc, y, 18, includeHeaderTitle);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39);
  doc.text('Key Insights', PAGE.margin, y);
  y += 5;

  const insights = report.insights.length > 0 ? report.insights : ['No insights available for this report.'];
  insights.forEach((insight, idx) => {
    y = ensureSpace(doc, y, 10, includeHeaderTitle);
    const bullet = `${idx + 1}. ${insight}`;
    y = addWrappedParagraph(doc, bullet, y, { size: 10 });
    y += 1.5;
  });
}

export function computeEmotionDistribution(moods: MoodReading[]) {
  const counts = {
    happy: 0,
    sad: 0,
    neutral: 0,
    stressed: 0,
    anxious: 0,
    confused: 0,
  };

  moods.forEach((mood) => {
    const emotion = String(mood.emotion || 'neutral') as keyof typeof counts;
    if (emotion in counts) counts[emotion] += 1;
  });

  const total = Object.values(counts).reduce((sum, v) => sum + v, 0);
  const toPercent = (value: number) => (total > 0 ? Math.round((value / total) * 100) : 0);

  return [
    { name: 'Happy', key: 'happy', count: counts.happy, value: toPercent(counts.happy) },
    { name: 'Sad', key: 'sad', count: counts.sad, value: toPercent(counts.sad) },
    { name: 'Neutral', key: 'neutral', count: counts.neutral, value: toPercent(counts.neutral) },
    { name: 'Stressed', key: 'stressed', count: counts.stressed, value: toPercent(counts.stressed) },
    { name: 'Anxious', key: 'anxious', count: counts.anxious, value: toPercent(counts.anxious) },
    { name: 'Confused', key: 'confused', count: counts.confused, value: toPercent(counts.confused) },
  ];
}

function renderDistributionChart(distribution: Array<{ name: string; key: string; count: number; value: number }>): string {
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 620;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const centerX = 280;
  const centerY = 300;
  const radius = 180;

  const totalAngle = Math.PI * 2;
  let current = -Math.PI / 2;

  distribution.forEach((item) => {
    const angle = totalAngle * (item.value / 100);
    const color = getMoodColor(item.key);

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, current, current + angle);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    current += angle;
  });

  ctx.font = 'bold 28px Helvetica';
  ctx.fillStyle = '#111827';
  ctx.fillText('Emotional Distribution', 520, 90);

  ctx.font = '20px Helvetica';
  let y = 140;
  distribution.forEach((item) => {
    ctx.fillStyle = getMoodColor(item.key);
    ctx.fillRect(520, y - 16, 18, 18);
    ctx.fillStyle = '#1f2937';
    ctx.fillText(`${item.name}: ${item.value}% (${item.count})`, 550, y);
    y += 48;
  });

  return canvas.toDataURL('image/png');
}

export function downloadSingleReportPdf(report: Report, userDetails?: PdfUserDetails) {
  const normalized = toPdfReport(report);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  renderSingleReportToDoc(doc, normalized, 'Caregiver Report', userDetails);
  const safeName = normalized.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  doc.save(`${safeName || 'caregiver-report'}.pdf`);
}

export function downloadAllReportsPdf(reports: Report[], userDetails?: PdfUserDetails) {
  const normalized = reports.map(toPdfReport);
  if (normalized.length === 0) return;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  normalized.forEach((report, index) => {
    if (index > 0) doc.addPage();
    renderSingleReportToDoc(doc, report, `Caregiver Reports (${index + 1}/${normalized.length})`, index === 0 ? userDetails : undefined);
  });

  doc.save(`all-caregiver-reports-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function downloadCustomComprehensiveReportPdf(params: {
  reports: Report[];
  moods: MoodReading[];
  userDetails?: PdfUserDetails;
}) {
  const normalizedReports = params.reports.map(toPdfReport);
  const distribution = computeEmotionDistribution(params.moods);
  const totalMoods = params.moods.length;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  drawElderCareHeader(doc, 'Custom Comprehensive Report', `Generated ${new Date().toLocaleString()}`, params.userDetails, true);

  let y = PAGE.margin + 40;
  y = addSection(
    doc,
    'Report Scope',
    `This custom report consolidates ${normalizedReports.length} saved report result(s) and ${totalMoods} mood reading(s). It includes LLM-generated summaries, caregiver context, AI-powered analysis, key insights, emotional distribution, and detailed statistics.`,
    y,
    'Custom Comprehensive Report'
  );

  const latest = normalizedReports[0];
  if (latest) {
    y = addSection(doc, 'Latest Report Snapshot', latest.summary, y, 'Custom Comprehensive Report');
  }

  // Page 2: Distribution + detailed statistics
  doc.addPage();
  drawElderCareHeader(doc, 'Custom Comprehensive Report', 'Emotional Distribution & Detailed Statistics');
  const chart = renderDistributionChart(distribution);
  if (chart) {
    doc.addImage(chart, 'PNG', PAGE.margin, PAGE.margin + 32, 182, 120);
  }

  y = PAGE.margin + 160;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39);
  doc.text('Detailed Statistics', PAGE.margin, y);
  y += 6;

  distribution.forEach((item) => {
    y = ensureSpace(doc, y, 8, 'Custom Comprehensive Report');
    const line = `${item.name}: ${item.value}% (${item.count} reading${item.count === 1 ? '' : 's'})`;
    y = addWrappedParagraph(doc, line, y, { size: 10 });
    y += 1;
  });

  // Add at least one more page for detailed report content if available
  if (normalizedReports.length > 0) {
    normalizedReports.slice(0, 6).forEach((report, index) => {
      doc.addPage();
      renderSingleReportToDoc(doc, report, `Custom Report Details (${index + 1}/${Math.min(6, normalizedReports.length)})`, index === 0 ? params.userDetails : undefined);
    });
  }

  doc.save(`custom-comprehensive-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}
