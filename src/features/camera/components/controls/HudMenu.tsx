import React from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { HIT_SLOP, makeStyles, useTheme } from '@/theme';

export type HudMenuOption<T extends string | number> = {
  value: T;
  label: string;
};

export type HudMenuProps<T extends string | number> = {
  options: ReadonlyArray<HudMenuOption<T>>;
  value: T;
  onSelect: (value: T) => void;
  /** Describe qué se elige aquí ("Relación de aspecto", "Temporizador"…). */
  accessibilityLabel: string;
};

/**
 * Menú pequeño que se despliega bajo la barra superior.
 *
 * Una sola píldora de cristal con las opciones en fila, como el desplegable
 * de relación de aspecto o temporizador de cualquier cámara: aparece al tocar
 * su botón, se elige y desaparece. No lleva estado propio — quién está
 * abierto lo decide la barra.
 */
export function HudMenu<T extends string | number>({
  options,
  value,
  onSelect,
  accessibilityLabel,
}: HudMenuProps<T>) {
  const theme = useTheme();
  const styles = useStyles();

  return (
    <View
      style={styles.menu}
      accessibilityRole="menubar"
      accessibilityLabel={accessibilityLabel}
    >
      {options.map(option => {
        const selected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            onPress={() => onSelect(option.value)}
            hitSlop={HIT_SLOP}
            accessibilityRole="menuitem"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            style={({ pressed }) => [
              styles.item,
              selected ? styles.itemSelected : null,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text
              variant="monoXs"
              style={{
                color: selected ? theme.hud.onAccent : theme.hud.text,
              }}
              numberOfLines={1}
            >
              {option.label.toUpperCase()}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles(theme => ({
  menu: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: theme.spacing.xxs,
    padding: theme.spacing.xxs,
    borderRadius: theme.radius.full,
    ...theme.roundedCorner,
    backgroundColor: theme.hud.glass,
    borderWidth: 1,
    borderColor: theme.hud.glassBorder,
  },
  item: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.full,
    ...theme.roundedCorner,
  },
  itemSelected: {
    backgroundColor: theme.hud.accent,
  },
  pressed: {
    opacity: 0.7,
  },
}));
