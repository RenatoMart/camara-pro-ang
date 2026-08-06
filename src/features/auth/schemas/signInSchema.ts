import { z } from 'zod';

/**
 * Validación de formularios con Zod.
 *
 * El esquema es la fuente de verdad: el tipo de TypeScript se *infiere* de él
 * (`z.infer`), así nunca se desincronizan reglas y tipos.
 */
export const signInSchema = z.object({
  email: z
    .string()
    .min(1, 'El correo es obligatorio')
    .email('Ingresa un correo válido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

export type SignInForm = z.infer<typeof signInSchema>;
