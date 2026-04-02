import type { Reservation } from '@/types/domain';

function escapeIcalText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function toIcalDate(dateString: string): string {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export function generateIcalFeed(reservations: Reservation[], calendarName: string = 'Open Claw Reservations'): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Open Claw AI//Reservations//EN',
    `X-WR-CALNAME:${escapeIcalText(calendarName)}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const res of reservations) {
    const dtStart = toIcalDate(res.pickupDate);
    const dtEnd = toIcalDate(res.dropoffDate);
    if (!dtStart || !dtEnd) continue;

    const summary = res.vehicleName
      ? `Rental: ${res.vehicleName}`
      : `Reservation ${res.id.slice(0, 8)}`;

    lines.push(
      'BEGIN:VEVENT',
      `UID:${res.id}@openclaw.ai`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${escapeIcalText(summary)}`,
      `STATUS:${res.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED'}`,
    );

    if (res.notes) {
      lines.push(`DESCRIPTION:${escapeIcalText(res.notes)}`);
    }

    if (res.customerName) {
      lines.push(`ATTENDEE:${escapeIcalText(res.customerName)}`);
    }

    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadIcalFile(content: string, filename: string = 'reservations.ics'): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
