import { useEffect, useState } from "react";

/**
 * Мобильный режим: экран уже брейкпоинта lg (1024px).
 * На таких экранах включаются упрощения: всплывающие окна у узлов,
 * упрощённая карта региона, компактный топбар.
 */
export function useMobile(): boolean {
  const query = "(max-width: 1023.5px)";
  const [mobile, setMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMobile(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return mobile;
}

/**
 * Устройство с грубым указателем (тачскрин). Используется для показа
 * сенсорных элементов управления (крестовина, кнопки действий).
 */
export function useCoarsePointer(): boolean {
  const query = "(pointer: coarse), (max-width: 1023.5px)";
  const [coarse, setCoarse] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setCoarse(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return coarse;
}
