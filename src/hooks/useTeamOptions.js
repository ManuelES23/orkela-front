import { useCallback, useEffect, useState } from "react";
import { ticketsAPI } from "../utils/api";

/**
 * Equipos a los que se puede enrutar un ticket de cliente (filtro y
 * selector "Asignar a equipo"): todos los activos de la organización, vía
 * GET /api/client-tickets/teams (fase 1), no teamsAPI.getAll, que solo trae
 * los equipos del usuario. El fallo se expone para mostrarlo.
 */
const useTeamOptions = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setTeams(await ticketsAPI.getClientInboxTeams());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { teams, loading, error, retry: load };
};

export default useTeamOptions;
