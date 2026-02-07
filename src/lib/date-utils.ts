import { differenceInCalendarDays, format, isToday, isYesterday } from "date-fns";
import { id } from "date-fns/locale";

export const formatMessageDateLabel = (dateStr: string) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";

  const now = new Date();

  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";

  const diff = differenceInCalendarDays(now, date);

  if (diff > 1 && diff <= 7) {
    return format(date, "EEEE", { locale: id });
  }

  return format(date, "dd/MM/yyyy");
};

export const formatChatPreviewDate = (dateString?: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);

  if (isToday(date)) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else if (isYesterday(date)) {
    return "Yesterday";
  } else {
    return date.toLocaleDateString([], { day: "2-digit", month: "2-digit", year: "2-digit" });
  }
};
