import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Lock } from "lucide-react";
import AuthInput from "../../auth/AuthInput";
import PasswordChecklist from "../../auth/PasswordChecklist";
import Button from "../../ui/Button";
import { AuthAlert } from "../../auth/AuthPanel";
import { profileAPI } from "../../../utils/api";
import { isPasswordValid } from "../../../utils/passwordRules";
import { getPasswordError } from "../../../utils/authErrors";
import { getSocialLinkErrorMessage } from "../../../utils/socialLinkErrors";
import { motionTokens } from "../../animations/variants";

/**
 * Crear contraseña (cuentas creadas con Google/Microsoft) o cambiarla.
 */
const PasswordForm = ({ mode, onDone, onCancel }) => {
  const reduce = useReducedMotion();
  const isCreate = mode === "create";
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!isPasswordValid(password)) {
      setError("La contraseña no cumple los requisitos.");
      return;
    }
    if (password !== confirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setSaving(true);
    try {
      if (isCreate) {
        await profileAPI.createPassword(password, confirmation);
      } else {
        await profileAPI.changePassword(current, password, confirmation);
      }
      onDone();
    } catch (err) {
      setError(
        getPasswordError(err, isCreate ? "password" : "new_password") ||
          getSocialLinkErrorMessage(err, err?.message || "No se pudo guardar la contraseña.")
      );
      setSaving(false);
    }
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      noValidate
      initial={reduce ? false : { opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? undefined : { opacity: 0, y: -6, transition: { duration: motionTokens.duration.fast } }}
      transition={{ duration: motionTokens.duration.base, ease: motionTokens.ease }}
      className='mt-4 space-y-4 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-night-700 dark:bg-night-800'
    >
      {error && <AuthAlert tone='error'>{error}</AuthAlert>}

      {!isCreate && (
        <AuthInput
          label='Contraseña actual'
          icon={Lock}
          type='password'
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          autoComplete='current-password'
          required
        />
      )}

      <div>
        <AuthInput
          label='Nueva contraseña'
          icon={Lock}
          type='password'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete='new-password'
          required
        />
        <PasswordChecklist password={password} />
      </div>

      <AuthInput
        label='Confirmar contraseña'
        icon={Lock}
        type='password'
        value={confirmation}
        onChange={(e) => setConfirmation(e.target.value)}
        autoComplete='new-password'
        required
      />

      <div className='flex flex-wrap justify-end gap-2'>
        <Button type='button' variant='secondary' onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button type='submit' variant='brand' loading={saving} loadingText='Guardando...'>
          Guardar contraseña
        </Button>
      </div>
    </motion.form>
  );
};

export default PasswordForm;
