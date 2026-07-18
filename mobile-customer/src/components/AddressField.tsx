import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { colors, radius, spacing } from "../theme";

type AddressValue = { address: string; lat?: number; lng?: number };
type NominatimResult = { place_id: number; display_name: string; lat: string; lon: string };

export function AddressField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: AddressValue;
  onChange: (value: AddressValue) => void;
  placeholder: string;
}) {
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const skipNextSearch = useRef(false);

  useEffect(() => {
    const query = value.address.trim();
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }
    if (!focused || query.length < 3 || value.lat !== undefined) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const url = new URL("https://nominatim.openstreetmap.org/search");
        url.searchParams.set("q", query);
        url.searchParams.set("format", "json");
        url.searchParams.set("addressdetails", "1");
        url.searchParams.set("limit", "5");
        url.searchParams.set("countrycodes", "cz,sk");
        url.searchParams.set("accept-language", "cs");
        const response = await fetch(url.toString(), {
          signal: controller.signal,
          headers: { "Accept-Language": "cs", "User-Agent": "Kuryr4YouCustomer/0.1" },
        });
        if (!response.ok) throw new Error("Address search failed");
        setResults((await response.json()) as NominatimResult[]);
      } catch (error) {
        if ((error as { name?: string }).name !== "AbortError") setResults([]);
      } finally {
        setLoading(false);
      }
    }, 450);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [focused, value.address, value.lat]);

  const pick = (item: NominatimResult) => {
    skipNextSearch.current = true;
    setFocused(false);
    setResults([]);
    onChange({ address: item.display_name, lat: Number(item.lat), lng: Number(item.lon) });
  };

  return (
    <View style={styles.root}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <Ionicons name="location-outline" size={19} color={colors.textMuted} />
        <TextInput
          value={value.address}
          onChangeText={(address) => onChange({ address })}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          autoCapitalize="words"
          autoCorrect={false}
          style={styles.input}
        />
        {loading ? <ActivityIndicator size="small" color={colors.primary} /> : null}
        {!loading && value.address ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Vymazat adresu" onPress={() => onChange({ address: "" })}>
            <Ionicons name="close-circle" size={19} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {focused && results.length > 0 ? (
        <View style={styles.results}>
          {results.map((item, index) => (
            <Pressable
              key={String(item.place_id)}
              onPressIn={() => pick(item)}
              style={[styles.result, index < results.length - 1 && styles.resultBorder]}
            >
              <Ionicons name="location" size={16} color={colors.primary} />
              <Text style={styles.resultText} numberOfLines={2}>{item.display_name}</Text>
            </Pressable>
          ))}
          <Text style={styles.attribution}>© OpenStreetMap přispěvatelé</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { zIndex: 5 },
  label: { color: colors.text, fontSize: 12, fontWeight: "800", marginBottom: 7 },
  inputWrap: { minHeight: 50, borderRadius: radius.md, borderColor: colors.border, borderWidth: 1, backgroundColor: colors.surfaceRaised, flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md, gap: spacing.sm },
  input: { color: colors.text, flex: 1, fontSize: 15 },
  results: { marginTop: 5, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised, overflow: "hidden" },
  result: { minHeight: 48, paddingHorizontal: spacing.md, paddingVertical: 9, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  resultBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  resultText: { color: colors.text, flex: 1, fontSize: 12, lineHeight: 17 },
  attribution: { color: colors.textMuted, fontSize: 9, paddingHorizontal: spacing.md, paddingVertical: 5, borderTopWidth: 1, borderTopColor: colors.border },
});
