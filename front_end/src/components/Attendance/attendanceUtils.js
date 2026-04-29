const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const lerp = (a, b, t) => a + (b - a) * t;

const formatTimeHHMM = (timeStr) => {
  if (!timeStr) return '';
  // "12:00:00" -> "12:00"
  return timeStr.slice(0, 5);
};

const formatMarkedAtHHMM = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
};

const mapApiToState = (data) => {
  const schedule = data?.schedule;
  const attendances = Array.isArray(data?.attendances) ? data.attendances : [];

  const mappedStudents = attendances.map((a) => ({
    id: a.student?.id,
    attendanceId: a.id,
    name: `${a.student?.last_name ?? ''} ${a.student?.first_name ?? ''}`.trim(),
    telegram: a.student?.telegram_username ?? null,

    // status: present | late | absent | not_marked
    status: a.status ?? 'not_marked',
    scanTime: formatMarkedAtHHMM(a.marked_at)
  }));

  return {
    session: {
      group: schedule?.group?.name ?? '',
      subject: schedule?.subject?.name ?? '',
      time: formatTimeHHMM(schedule?.time),
      date: schedule?.date ?? '',
      totalStudents: mappedStudents.length
    },
    students: mappedStudents
  };
};

export { clamp, lerp, formatTimeHHMM, formatMarkedAtHHMM, mapApiToState };
