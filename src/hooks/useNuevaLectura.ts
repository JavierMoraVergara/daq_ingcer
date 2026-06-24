import { useEffect, useRef } from "react";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { LecturaInstante } from "../types";

export function useNuevaLectura(
  onLectura: (lectura: LecturaInstante) => void,
): void {
  const callbackRef = useRef(onLectura);
  callbackRef.current = onLectura;

  useEffect(() => {
    let unlisten: UnlistenFn | null = null;

    listen<LecturaInstante>("nueva_lectura", (event) => {
      callbackRef.current(event.payload);
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, []);
}
