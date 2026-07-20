import { useMemo } from "react";
import { Alert, Linking, StyleProp, Text, TextStyle } from "react-native";

import { linkifyMessage } from "../lib/linkify";

type Props = {
  children: string;
  style?: StyleProp<TextStyle>;
  linkStyle?: StyleProp<TextStyle>;
};

async function openLink(url: string) {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert("Odkaz nelze otevřít", "Zkontrolujte, zda je odkaz platný a zda máte nainstalovaný webový prohlížeč.");
  }
}

export function LinkifiedText({ children, style, linkStyle }: Props) {
  const segments = useMemo(() => linkifyMessage(children), [children]);

  return (
    <Text selectable style={style}>
      {segments.map((segment, index) =>
        segment.kind === "link" ? (
          <Text
            accessibilityHint="Otevře odkaz v příslušné aplikaci"
            accessibilityRole="link"
            key={`${segment.url}-${index}`}
            onPress={() => void openLink(segment.url)}
            style={linkStyle}
          >
            {segment.text}
          </Text>
        ) : (
          <Text key={`text-${index}`}>{segment.text}</Text>
        ),
      )}
    </Text>
  );
}
