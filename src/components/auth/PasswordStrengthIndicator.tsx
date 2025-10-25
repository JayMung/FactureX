import { useMemo } from 'react';
import { Shield, CheckCircle2, XCircle } from 'lucide-react';
import {
  validatePassword,
  getPasswordStrengthLabel,
  getPasswordStrengthColor,
  getPasswordStrengthBgColor,
  PASSWORD_REQUIREMENTS,
} from '@/lib/password-validation';

interface PasswordStrengthIndicatorProps {
  password: string;
  showRequirements?: boolean;
}

export function PasswordStrengthIndicator({
  password,
  showRequirements = true,
}: PasswordStrengthIndicatorProps) {
  const validation = useMemo(() => validatePassword(password), [password]);

  if (!password) {
    return null;
  }

  const strengthColor = getPasswordStrengthColor(validation.strength);
  const strengthBgColor = getPasswordStrengthBgColor(validation.strength);
  const strengthLabel = getPasswordStrengthLabel(validation.strength);

  // Individual requirement checks
  const requirements = [
    {
      label: `Au moins ${PASSWORD_REQUIREMENTS.minLength} caractères`,
      met: password.length >= PASSWORD_REQUIREMENTS.minLength,
    },
    {
      label: 'Une lettre majuscule',
      met: /[A-Z]/.test(password),
    },
    {
      label: 'Une lettre minuscule',
      met: /[a-z]/.test(password),
    },
    {
      label: 'Un chiffre',
      met: /\d/.test(password),
    },
    {
      label: 'Un caractère spécial',
      met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    },
  ];

  return (
    <div className="space-y-3 mt-2">
      {/* Strength Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1">
            <Shield className="h-3 w-3 text-gray-500 dark:text-gray-400" />
            <span className="text-gray-600 dark:text-gray-400">Force du mot de passe:</span>
          </div>
          <span className={`font-medium ${strengthColor}`}>
            {strengthLabel}
          </span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${strengthBgColor}`}
            style={{ width: `${validation.score}%` }}
          />
        </div>
      </div>

      {/* Requirements Checklist */}
      {showRequirements && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
            Exigences:
          </p>
          <div className="grid grid-cols-1 gap-1">
            {requirements.map((req, index) => (
              <div
                key={index}
                className="flex items-center gap-2 text-xs"
              >
                {req.met ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400 flex-shrink-0" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-gray-400 dark:text-gray-600 flex-shrink-0" />
                )}
                <span
                  className={
                    req.met
                      ? 'text-green-700 dark:text-green-300'
                      : 'text-gray-600 dark:text-gray-400'
                  }
                >
                  {req.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Messages */}
      {validation.errors.length > 0 && (
        <div className="space-y-1">
          {validation.errors.map((error, index) => (
            <p key={index} className="text-xs text-red-600 dark:text-red-400">
              • {error}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
