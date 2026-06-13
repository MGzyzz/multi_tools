import { apiDownload } from "@/lib/auth";

const triggerBrowserDownload = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

/**
 * Download the teacher's attendance Excel export and save it via the browser.
 * Pass a `groupId` to export a single group; omit it to export all groups.
 */
export const downloadAttendanceExport = async (groupId?: number) => {
  const path = groupId
    ? `/api/get_excel_attendance_file/?group_id=${groupId}`
    : "/api/get_excel_attendance_file/";

  const { blob, filename } = await apiDownload(path, "lectern_attendance.xlsx");
  triggerBrowserDownload(blob, filename);
};
