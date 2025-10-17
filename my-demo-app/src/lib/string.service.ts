export function titleCase(s?: string) {
  if (!s) return s;
  return s
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default { titleCase };
