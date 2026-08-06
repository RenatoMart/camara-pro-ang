import { zodResolver } from '@hookform/resolvers/zod';
import React, { useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View, type TextInput } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { ApiError } from '@/services/api/errors';
import { makeStyles } from '@/theme';

import { useSignIn } from '../hooks/useSignIn';
import { signInSchema, type SignInForm } from '../schemas/signInSchema';

/**
 * Formulario de acceso.
 *
 * Buenas prácticas aplicadas:
 * - react-hook-form (no re-renderiza en cada tecla) + validación con Zod.
 * - teclado adecuado por campo y encadenado del foco entre inputs.
 * - el botón se bloquea mientras la petición está en vuelo.
 */
export function SignInScreen() {
  const styles = useStyles();
  const passwordRef = useRef<TextInput>(null);
  const { mutate, isPending, error } = useSignIn();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onBlur',
  });

  const onSubmit = handleSubmit(values => mutate(values));

  return (
    <Screen scrollable avoidKeyboard edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text variant="displayLg">Hola de nuevo</Text>
        <Text variant="body" color="textSecondary">
          Inicia sesión para continuar.
        </Text>
      </View>

      <View style={styles.form}>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label="Correo electrónico"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.email?.message}
              placeholder="tu@correo.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              submitBehavior="submit"
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              ref={passwordRef}
              label="Contraseña"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.password?.message}
              placeholder="Mínimo 8 caracteres"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={onSubmit}
            />
          )}
        />

        {error ? (
          <Text variant="caption" color="danger">
            {error instanceof ApiError
              ? error.message
              : 'No pudimos iniciar sesión.'}
          </Text>
        ) : null}

        <Button
          label="Entrar"
          size="lg"
          fullWidth
          loading={isPending}
          onPress={onSubmit}
        />

        <Text variant="caption" color="textSecondary" align="center">
          Demo: cualquier correo válido y 8+ caracteres funcionan.
        </Text>
      </View>
    </Screen>
  );
}

const useStyles = makeStyles(theme => ({
  header: {
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xxl,
    marginBottom: theme.spacing.xl,
  },
  form: {
    gap: theme.spacing.lg,
  },
}));
