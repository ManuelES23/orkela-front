import { useState } from "react";

/**
 * Devuelve true a partir del primer render en que `value` difiere de su valor
 * inicial. Sirve para mover el foco al heading del panel solo cuando la
 * pantalla cambia de estado, no al montar la página.
 */
export const useHasChanged = (value) => {
  const [initial] = useState(value);
  const [changed, setChanged] = useState(false);

  if (!changed && value !== initial) setChanged(true);

  return changed || value !== initial;
};
