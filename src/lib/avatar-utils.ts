export const getInitials = (name: string, count = 2) => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, count)
    .join("")
    .toUpperCase();
};
