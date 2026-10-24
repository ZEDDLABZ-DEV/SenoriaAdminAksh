import { jsPDF } from "jspdf";
import type { DownloadedFile } from "@/lib/api/client";
import type { VisitReport, VisitReportItem, VisitReportRow } from "@/lib/api/types";
import { formatWeekdayDate } from "@/lib/format";
import {
  formatCompletionRate,
  formatHours,
  formatReportTimestamp,
  formatReportWindow,
  itemTypeLabel,
  personLabel,
} from "@/lib/visit-report";

const PINE = [27, 101, 76] as const;
const INK = [23, 36, 30] as const;
const MUTED = [92, 106, 98] as const;
const LINE = [226, 219, 208] as const;
const PAPER = [243, 240, 232] as const;
const CARD = [255, 253, 248] as const;

type Rgb = readonly [number, number, number];

export function buildVisitReportPdf(input: {
  report: VisitReport;
  caregiverName: string;
  clientName: string;
}): DownloadedFile {
  const { report, caregiverName, clientName } = input;
  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const width = pageWidth - margin * 2;
  const bottom = pageHeight - 36;
  let y = margin;
  const zone = report.timeZone || "America/Vancouver";

  doc.setProperties({
    title: "Visit report",
    subject: formatReportWindow(report.from, report.to),
    creator: "Senoria Seniors Admin",
  });

  function paint(color: Rgb) {
    doc.setFillColor(color[0], color[1], color[2]);
  }
  function drawColor(color: Rgb) {
    doc.setDrawColor(color[0], color[1], color[2]);
  }
  function writeColor(color: Rgb) {
    doc.setTextColor(color[0], color[1], color[2]);
  }
  function nextPage() {
    doc.addPage();
    y = margin;
  }
  function roomFor(height: number) {
    if (y + height <= bottom) return;
    nextPage();
  }
  function wrap(text: string, maxWidth: number): string[] {
    const lines = doc.splitTextToSize(text, maxWidth);
    return Array.isArray(lines) ? lines : [String(lines)];
  }

  writeColor(PINE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Visit report", margin, y + 16);
  y += 30;

  const headerRows: Array<[string, string]> = [
    ["Dates", formatReportWindow(report.from, report.to)],
    ["Caregiver name", caregiverName.trim() || "All"],
    ["Client", clientName.trim() || "All"],
    [
      "Generated",
      formatReportTimestamp(report.generatedAt || new Date().toISOString(), zone),
    ],
  ];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const headerLines = headerRows.map((row) => wrap(row[1], width - 156));
  const headerHeight = 18 + headerLines.reduce((sum, lines) => sum + lines.length * 16, 0);
  roomFor(headerHeight);
  paint(PAPER);
  drawColor(LINE);
  doc.setLineWidth(0.8);
  doc.roundedRect(margin, y, width, headerHeight, 8, 8, "FD");
  let headerY = y + 22;
  headerRows.forEach((row, index) => {
    writeColor(MUTED);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(row[0].toUpperCase(), margin + 14, headerY);
    writeColor(INK);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(headerLines[index], margin + 140, headerY);
    headerY += headerLines[index].length * 16;
  });
  y += headerHeight + 22;

  writeColor(PINE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  roomFor(20);
  doc.text("Summary", margin, y);
  y += 12;

  const summary = [
    { label: "Scheduled days", value: report.summary.scheduledDays.toLocaleString() },
    { label: "Completed days", value: report.summary.completedDays.toLocaleString() },
    { label: "Pending", value: report.summary.pendingDays.toLocaleString() },
    { label: "Missed", value: report.summary.missedDays.toLocaleString() },
    { label: "Cancelled", value: report.summary.cancelledDays.toLocaleString() },
    { label: "Total hours", value: formatHours(report.summary.totalHours) },
    { label: "Average hours", value: formatHours(report.summary.averageHours) },
    { label: "Completion rate", value: formatCompletionRate(report.summary.completionRate) },
  ];
  const gridGap = 8;
  const cellWidth = (width - gridGap * 3) / 4;
  const cellHeight = 56;
  roomFor(cellHeight * 2 + gridGap);
  summary.forEach((item, index) => {
    const column = index % 4;
    const row = Math.floor(index / 4);
    const x = margin + column * (cellWidth + gridGap);
    const top = y + row * (cellHeight + gridGap);
    paint(CARD);
    drawColor(LINE);
    doc.setLineWidth(0.8);
    doc.roundedRect(x, top, cellWidth, cellHeight, 6, 6, "FD");
    writeColor(MUTED);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(item.label.toUpperCase(), x + 10, top + 18);
    writeColor(INK);
    doc.setFontSize(15);
    doc.text(item.value, x + 10, top + 40);
  });
  y += cellHeight * 2 + gridGap + 24;

  writeColor(PINE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  roomFor(18);
  doc.text("Client details", margin, y);
  y += 16;

  if (report.rows.length === 0) {
    writeColor(MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text("No visits in this window.", margin, y + 4);
  } else {
    report.rows.forEach((row) => drawVisit(row));
  }

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    writeColor(MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`${page} / ${pageCount}`, pageWidth - margin, pageHeight - 22, { align: "right" });
  }

  const stamp = report.from && report.to ? `${report.from}-to-${report.to}` : "visits";
  return {
    blob: new Blob([doc.output("arraybuffer")], { type: "application/pdf" }),
    filename: `visit-report-${stamp}.pdf`,
    contentType: "application/pdf",
  };

  function drawVisit(row: VisitReportRow) {
    const textWidth = width - 32;
    const columnGap = 14;
    const facts: Array<[string, string]> = [
      ["Client name", personLabel(row.client, "Unknown")],
      ["Caregiver name", personLabel(row.caregiver, "Unknown")],
      ["Working hours", formatHours(row.hoursUsed)],
    ];
    const workingHoursWidth = 92;
    const nameWidth = (textWidth - workingHoursWidth - columnGap * 2) / 2;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const measured = [
      wrap(facts[0][1], nameWidth),
      wrap(facts[1][1], nameWidth),
      wrap(facts[2][1], workingHoursWidth),
    ];
    const factHeight = Math.max(...measured.map((lines) => lines.length)) * 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const tasks = completedTasks(row).flatMap((line) => wrap(line, textWidth));
    const introHeight = 16 + 18 + factHeight + 28;
    const taskBlockHeight = tasks.length * 13;
    const cardHeight = 16 + introHeight + taskBlockHeight + 8;

    if (cardHeight <= bottom - margin) {
      if (y + cardHeight > bottom) nextPage();
    } else if (y + introHeight > bottom) {
      nextPage();
    }

    const top = y;
    const fits = cardHeight <= bottom - y;
    if (fits) {
      paint(CARD);
      drawColor(LINE);
      doc.setLineWidth(0.8);
      doc.roundedRect(margin, top, width, cardHeight, 8, 8, "FD");
      paint(PINE);
      doc.rect(margin, top + 8, 4, Math.max(cardHeight - 16, 8), "F");
    }

    let cursor = top + 20;
    writeColor(PINE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(formatWeekdayDate(row.serviceDate), margin + 16, cursor);

    cursor += 18;
    writeColor(MUTED);
    doc.setFontSize(8);
    const columns = [margin + 16, margin + 16 + nameWidth + columnGap, margin + 16 + (nameWidth + columnGap) * 2];
    facts.forEach((fact, index) => {
      doc.text(fact[0].toUpperCase(), columns[index], cursor);
    });

    cursor += 14;
    writeColor(INK);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    measured.forEach((lines, index) => {
      doc.text(lines, columns[index], cursor);
    });

    cursor += factHeight + 16;
    writeColor(MUTED);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("TASKS COMPLETED", margin + 16, cursor);
    cursor += 14;

    writeColor(INK);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    if (fits) {
      tasks.forEach((line) => {
        doc.text(line, margin + 16, cursor);
        cursor += 13;
      });
      y = top + cardHeight + 10;
      return;
    }

    y = cursor;
    tasks.forEach((line) => {
      if (y + 13 > bottom) {
        nextPage();
        writeColor(MUTED);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text(`${formatWeekdayDate(row.serviceDate).toUpperCase()} CONTINUED`, margin, y + 8);
        y += 20;
        writeColor(INK);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
      }
      doc.text(line, margin + 16, y);
      y += 13;
    });
    y += 12;
  }
}

function completedTasks(row: VisitReportRow): string[] {
  const completed = row.items.filter((item) => item.completed);
  if (completed.length === 0) return ["None"];
  return completed.map(taskLine);
}

function taskLine(item: VisitReportItem): string {
  const name = item.name.replace(/\s+/g, " ").trim();
  const type = itemTypeLabel(item.itemType);
  const title = !name ? type : item.itemType === "task" || name.toLowerCase().startsWith(type.toLowerCase()) ? name : `${type}: ${name}`;
  const detail = item.detail?.replace(/\s+/g, " ").trim();
  if (detail && detail !== name) return `- ${title} (${detail})`;
  return `- ${title}`;
}
