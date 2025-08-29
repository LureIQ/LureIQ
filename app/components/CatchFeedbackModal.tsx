// app/components/CatchFeedbackModal.tsx
import React from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type Props = {
  visible: boolean;
  lureName?: string;
  submitting?: boolean;
  onYes: () => void;
  onNo: () => void;
  onDismiss: () => void;
};

export default function CatchFeedbackModal({
  visible,
  lureName,
  submitting,
  onYes,
  onNo,
  onDismiss,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={{ flex: 1 }}
      >
        <View style={styles.backdrop}>
          <View style={styles.card}>
            <Text style={styles.title}>Quick check-in</Text>
            <Text style={styles.subtitle}>
              Did you catch a fish using{" "}
              <Text style={styles.lure}>{lureName || "that lure"}</Text>?
            </Text>

            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.btn, styles.no]}
                disabled={!!submitting}
                onPress={onNo}
                activeOpacity={0.9}
              >
                <Text style={styles.btnText}>No</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btn, styles.yes]}
                disabled={!!submitting}
                onPress={onYes}
                activeOpacity={0.9}
              >
                <Text style={styles.btnText}>Yes</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={onDismiss}
              disabled={!!submitting}
              style={{ marginTop: 8 }}
            >
              <Text style={styles.skip}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  card: {
    backgroundColor: "white",
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  title: { fontSize: 18, fontWeight: "700" },
  subtitle: { marginTop: 6, fontSize: 15 },
  lure: { fontWeight: "800" },
  row: { flexDirection: "row", gap: 12, marginTop: 14 },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  yes: { backgroundColor: "#16a34a" },
  no: { backgroundColor: "#ef4444" },
  btnText: { color: "white", fontWeight: "800", fontSize: 16 },
  skip: { textAlign: "center", textDecorationLine: "underline", color: "#555" },
});
