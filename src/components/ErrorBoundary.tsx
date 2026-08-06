import React, { Component, type ErrorInfo, type ReactNode } from 'react';

import { StateView } from '@/components/ui/StateView';
import { logger } from '@/utils/logger';

type Props = {
  children: ReactNode;
  /** UI alternativa. Si no se pasa, se muestra `StateView` con reintento. */
  fallback?: (reset: () => void) => ReactNode;
};

type State = {
  error: Error | null;
};

/**
 * Captura errores de render del árbol de React para que la app no muera
 * con la pantalla roja / cierre inesperado en producción.
 *
 * Debe ser un componente de clase: React no expone equivalente en hooks.
 * No captura errores asíncronos (esos van por el manejo de errores de
 * React Query y `logger.error`).
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    logger.error('Error no capturado en el árbol de React', error, {
      componentStack: info.componentStack,
    });
  }

  private readonly reset = (): void => {
    this.setState({ error: null });
  };

  override render(): ReactNode {
    const { error } = this.state;
    const { children, fallback } = this.props;

    if (!error) {
      return children;
    }

    if (fallback) {
      return fallback(this.reset);
    }

    return (
      <StateView
        tone="error"
        title="Algo salió mal"
        description={
          __DEV__ ? error.message : 'Intenta de nuevo en unos segundos.'
        }
        actionLabel="Reintentar"
        onAction={this.reset}
      />
    );
  }
}
