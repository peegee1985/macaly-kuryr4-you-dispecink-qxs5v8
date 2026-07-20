import { Alert, Linking, type StyleProp, Text, type TextStyle } from "react-native";

import { splitChatLinks } from "../lib/chatLinks";
import { colors } from "../theme";

type Props = {
  text: string;
  style?: StyleProp<TextStyle>;
  linkStyle?: StyleProp<TextStyle>;
};

export function LinkifiedText({ text, style, linkStyle }: Props) {
  const open = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Odkaz nelze otevřít", "Zkontrolujte adresu nebo připojení k internetu.");
    }
  };

  return (
    <Text style={style}>
      {splitChatLinks(text).map((part, index) => part.url ? (
        <Text
          accessibilityRole="link"
          key={`${index}-${part.text}`}
          onPress={() => void open(part.url!)}
          style={[{ color: colors.info, textDecorationLine: "underline", fontWeight: "700" }, linkStyle]}
        >
          {part.text}
        </Text>
      ) : part.text)}
    </Text>
  );
}
