import { Check, X } from "lucide-react";
import { evaluatePassword } from "../../utils/passwordRules";

/**
 * Checklist en vivo de las reglas de contraseña (mismas que el backend).
 */
const PasswordChecklist = ({ password }) => (
  <ul aria-label='Requisitos de la contraseña' className='mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-sm'>
    {evaluatePassword(password).map((rule) => (
      <li
        key={rule.id}
        data-met={rule.met}
        className={`flex items-center gap-1.5 transition-colors ${
          rule.met ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-night-400"
        }`}
      >
        {rule.met ? <Check className='w-4 h-4' aria-hidden='true' /> : <X className='w-4 h-4' aria-hidden='true' />}
        {rule.label}
      </li>
    ))}
  </ul>
);

export default PasswordChecklist;
