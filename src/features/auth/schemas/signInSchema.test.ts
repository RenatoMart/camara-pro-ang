import { signInSchema } from './signInSchema';

describe('signInSchema', () => {
  it('acepta credenciales válidas', () => {
    const result = signInSchema.safeParse({
      email: 'ana@ejemplo.com',
      password: '12345678',
    });

    expect(result.success).toBe(true);
  });

  it('rechaza un correo mal formado', () => {
    const result = signInSchema.safeParse({
      email: 'no-es-correo',
      password: '12345678',
    });

    expect(result.success).toBe(false);
  });

  it('exige al menos 8 caracteres de contraseña', () => {
    const result = signInSchema.safeParse({
      email: 'ana@ejemplo.com',
      password: 'corta',
    });

    expect(result.success).toBe(false);
  });
});
