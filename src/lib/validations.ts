import { z } from 'zod'

// --- Auth ---

export const loginEmailSchema = z.object({
  email: z
    .string()
    .min(1, 'Bitte gib deine E-Mail-Adresse ein.')
    .email('Bitte gib eine gültige E-Mail-Adresse ein.'),
})

export const loginPasswordSchema = z.object({
  email: z.string().min(1, 'E-Mail ist erforderlich.').email(),
  password: z.string().min(1, 'Passwort ist erforderlich.'),
})

// --- Projects ---

export const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, 'Bitte gib einen Projektnamen ein.')
    .max(100, 'Projektname darf maximal 100 Zeichen lang sein.'),
  description: z
    .string()
    .max(500, 'Beschreibung darf maximal 500 Zeichen lang sein.')
    .optional()
    .or(z.literal('')),
  color: z.string().min(1),
})

export const updateProjectSchema = z.object({
  name: z
    .string()
    .min(1, 'Bitte gib einen Projektnamen ein.')
    .max(100, 'Projektname darf maximal 100 Zeichen lang sein.'),
  description: z
    .string()
    .max(500, 'Beschreibung darf maximal 500 Zeichen lang sein.')
    .optional()
    .or(z.literal('')),
})

// --- Profile ---

export const updateProfileSchema = z.object({
  fullName: z
    .string()
    .min(1, 'Bitte gib deinen Namen ein.')
    .max(100, 'Name darf maximal 100 Zeichen lang sein.'),
})

// --- Loopicals ---

export const createLoopicalSchema = z.object({
  title: z
    .string()
    .min(1, 'Bitte gib einen Titel ein.')
    .max(120, 'Titel darf maximal 120 Zeichen lang sein.'),
  contextUrl: z
    .string()
    .url('Bitte gib eine gültige URL ein.')
    .max(2048, 'URL darf maximal 2048 Zeichen lang sein.')
    .refine((url) => /^https?:\/\//.test(url), 'URL muss mit http:// oder https:// beginnen.')
    .optional()
    .or(z.literal('')),
})

// --- Helpers ---

export type FieldErrors = Record<string, string>

export function extractFieldErrors(result: { success: false; error: z.ZodError }): FieldErrors {
  const errors: FieldErrors = {}
  for (const issue of result.error.issues) {
    const key = issue.path[0]
    if (key && !errors[String(key)]) {
      errors[String(key)] = issue.message
    }
  }
  return errors
}
