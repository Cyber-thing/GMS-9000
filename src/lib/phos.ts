/* Цветовые схемы интерфейса — «люминофоры» ретро-терминалов.
   Приглушённые, не кислотные: как настоящие CRT-монохромы. */
export const PHOS_THEMES = [
  { id: "green", label: "GRN", swatch: "#8fb56d" },
  { id: "blue", label: "BLU", swatch: "#6db3d2" },
  { id: "red", label: "RED", swatch: "#cf6b62" },
  { id: "amber", label: "AMB", swatch: "#d3a254" },
  { id: "magenta", label: "MAG", swatch: "#c977b0" },
] as const;

export type PhosId = (typeof PHOS_THEMES)[number]["id"];

export const phosLabel = (id: string): string =>
  PHOS_THEMES.find((p) => p.id === id)?.label ?? PHOS_THEMES[0].label;

export const nextPhos = (cur: string): PhosId => {
  const i = PHOS_THEMES.findIndex((p) => p.id === cur);
  return PHOS_THEMES[(i + 1 + PHOS_THEMES.length) % PHOS_THEMES.length].id;
};
