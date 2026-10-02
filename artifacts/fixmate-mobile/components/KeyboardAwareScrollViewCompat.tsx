import { Platform, ScrollView, ScrollViewProps } from 'react-native';
import {
  KeyboardAwareScrollView,
  KeyboardAwareScrollViewProps,
} from 'react-native-keyboard-controller';

type Props = KeyboardAwareScrollViewProps & ScrollViewProps;

export function KeyboardAwareScrollViewCompat({
  children,
  keyboardShouldPersistTaps = 'handled',
  keyboardDismissMode = Platform.OS === 'ios' ? 'interactive' : 'on-drag',
  bottomOffset = 28,
  extraKeyboardSpace = 24,
  disableScrollOnKeyboardHide = true,
  ...props
}: Props) {
  if (Platform.OS === 'web') {
    return (
      <ScrollView
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        keyboardDismissMode={keyboardDismissMode}
        {...props}
      >
        {children}
      </ScrollView>
    );
  }
  return (
    <KeyboardAwareScrollView
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      keyboardDismissMode={keyboardDismissMode}
      bottomOffset={bottomOffset}
      extraKeyboardSpace={extraKeyboardSpace}
      disableScrollOnKeyboardHide={disableScrollOnKeyboardHide}
      {...props}
    >
      {children}
    </KeyboardAwareScrollView>
  );
}
