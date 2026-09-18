import { WifiOff } from "lucide-react";
import AuthStatusScreen from "./AuthStatusScreen";
import Button from "../ui/Button";

/**
 * Se muestra cuando hay una sesión guardada pero no se pudo verificar por un
 * error de red o del servidor (no por un token inválido): la sesión se
 * conserva y el usuario puede reintentar cuando la API vuelva.
 */
const AuthRetryScreen = ({ onRetry, onLogout }) => (
  <AuthStatusScreen
    statusKey='auth-retry'
    tone='error'
    icon={WifiOff}
    title='No pudimos conectar con el servidor'
  >
    <p className='text-gray-600 dark:text-night-300 mb-6'>
      Tu sesión sigue activa. Revisa tu conexión e inténtalo de nuevo en unos
      segundos.
    </p>
    <div className='flex flex-col gap-3'>
      <Button onClick={onRetry} className='w-full'>
        Reintentar
      </Button>
      <Button variant='secondary' onClick={onLogout} className='w-full'>
        Cerrar sesión
      </Button>
    </div>
  </AuthStatusScreen>
);

export default AuthRetryScreen;
