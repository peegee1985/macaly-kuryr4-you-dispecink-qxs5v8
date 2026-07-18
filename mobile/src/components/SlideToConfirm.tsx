import Ionicons from "@expo/vector-icons/Ionicons";
import { useRef, useState } from "react";
import { Animated, PanResponder, StyleSheet, Text, Vibration, View } from "react-native";

import { colors, radius } from "../theme";

const THUMB_SIZE = 46;
const TRACK_PADDING = 4;
const CONFIRM_THRESHOLD = 0.85;

/**
 * Posuvník „přejeď pro potvrzení" — náhrada tlačítka pro akce, které nesmí
 * jít spustit omylem (přijetí zakázky, posun stavu). Po dotažení za práh se
 * zamkne, zavibruje a zavolá onConfirm; při puštění dřív se pružně vrátí.
 */
export function SlideToConfirm({
  label,
  color = colors.primary,
  disabled,
  onConfirm,
}: {
  label: string;
  color?: string;
  disabled?: boolean;
  onConfirm: () => Promise<void> | void;
}) {
  const translate = useRef(new Animated.Value(0)).current;
  const maxOffset = useRef(0);
  const position = useRef(0);
  const [trackWidth, setTrackWidth] = useState(0);
  const [confirming, setConfirming] = useState(false);

  maxOffset.current = Math.max(trackWidth - THUMB_SIZE - TRACK_PADDING * 2, 1);
  translate.addListener?.(() => {});

  const springTo = (value: number, done?: () => void) => {
    Animated.spring(translate, { toValue: value, useNativeDriver: true, bounciness: 6 }).start(done);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled && !confirming,
      onMoveShouldSetPanResponder: (_evt, gesture) => Math.abs(gesture.dx) > 4 && !disabled && !confirming,
      onPanResponderMove: (_evt, gesture) => {
        position.current = Math.max(0, Math.min(gesture.dx, maxOffset.current));
        translate.setValue(position.current);
      },
      onPanResponderRelease: () => {
        if (position.current >= maxOffset.current * CONFIRM_THRESHOLD) {
          Vibration.vibrate(40);
          setConfirming(true);
          springTo(maxOffset.current, async () => {
            try {
              await onConfirm();
            } finally {
              position.current = 0;
              springTo(0, () => setConfirming(false));
            }
          });
        } else {
          position.current = 0;
          springTo(0);
        }
      },
      onPanResponderTerminate: () => {
        position.current = 0;
        springTo(0);
      },
    }),
  ).current;

  const fillWidth = translate.interpolate({
    inputRange: [0, Math.max(maxOffset.current, 1)],
    outputRange: [THUMB_SIZE + TRACK_PADDING * 2, Math.max(trackWidth, THUMB_SIZE)],
    extrapolate: "clamp",
  });
  const labelOpacity = translate.interpolate({
    inputRange: [0, Math.max(maxOffset.current * 0.6, 1)],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  return (
    <View
      style={[styles.track, disabled && styles.trackDisabled]}
      onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
    >
      <Animated.View style={[styles.fill, { backgroundColor: color, width: fillWidth, opacity: 0.28 }]} />
      <Animated.View style={[styles.labelWrap, { opacity: labelOpacity }]} pointerEvents="none">
        <Ionicons name="chevron-forward" size={15} color={color} />
        <Ionicons name="chevron-forward" size={15} color={color} style={styles.chevOverlap} />
        <Text style={styles.label}>{confirming ? "Odesílám…" : label}</Text>
      </Animated.View>
      <Animated.View
        {...panResponder.panHandlers}
        style={[styles.thumb, { backgroundColor: color, transform: [{ translateX: translate }] }]}
      >
        <Ionicons name={confirming ? "hourglass-outline" : "arrow-forward"} size={22} color={colors.primaryText} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: THUMB_SIZE + TRACK_PADDING * 2,
    borderRadius: (THUMB_SIZE + TRACK_PADDING * 2) / 2,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
    overflow: "hidden",
  },
  trackDisabled: { opacity: 0.5 },
  fill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: (THUMB_SIZE + TRACK_PADDING * 2) / 2,
  },
  labelWrap: {
    position: "absolute",
    left: THUMB_SIZE + 14,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  chevOverlap: { marginLeft: -9, marginRight: 6 },
  label: { color: colors.text, fontSize: 14, fontWeight: "700", flexShrink: 1 },
  thumb: {
    position: "absolute",
    left: TRACK_PADDING,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },
});
