import React from 'react';
import { StyleProp, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { colors, radius, sizes, spacing, typography } from '../../theme';

type TextFieldProps = Omit<TextInputProps, 'style' | 'editable'> & {
  label: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  disabled?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
};

export const TextField: React.FC<TextFieldProps> = ({
  label, error, helperText, leftIcon, rightIcon, disabled = false, multiline = false, containerStyle,
  accessibilityLabel, ...inputProps
}) => {
  const supportingText = error ?? helperText;
  return (
    <View style={containerStyle}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.field, multiline && styles.multilineField, Boolean(error) && styles.fieldError, disabled && styles.fieldDisabled]}>
        {leftIcon ? <View style={styles.leftIcon}>{leftIcon}</View> : null}
        <TextInput {...inputProps} accessibilityLabel={accessibilityLabel ?? label} editable={!disabled} multiline={multiline} placeholderTextColor={colors.textSecondary} style={[styles.input, multiline && styles.multilineInput]} />
        {rightIcon ? <View style={styles.rightIcon}>{rightIcon}</View> : null}
      </View>
      {supportingText ? <Text style={[styles.supportingText, error ? styles.errorText : undefined]}>{supportingText}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  label: { ...typography.bodySmallSemibold, color: colors.textPrimary, marginBottom: spacing.xs },
  field: { minHeight: sizes.controlHeight, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.input, backgroundColor: colors.surface, paddingHorizontal: spacing.sm },
  multilineField: { alignItems: 'flex-start', paddingVertical: spacing.sm },
  fieldError: { borderColor: colors.semantic.error.main },
  fieldDisabled: { backgroundColor: colors.background, opacity: 0.72 },
  input: { ...typography.body, color: colors.textPrimary, flex: 1, paddingVertical: spacing.sm },
  multilineInput: { minHeight: 96, textAlignVertical: 'top', paddingTop: 0 },
  leftIcon: { marginRight: spacing.xs, paddingTop: spacing.xxs },
  rightIcon: { marginLeft: spacing.xs, paddingTop: spacing.xxs },
  supportingText: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xxs },
  errorText: { color: colors.semantic.error.main },
});
