// app/components/ZipPromptModal.tsx
import React, { useState } from "react";
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

type Props = {
  visible: boolean;
  // onSubmit(null) = user canceled, onSubmit("06010") = user provided zip
  onSubmit: (zip: string | null) => void;
};

export const ZipPromptModal: React.FC<Props> = ({ visible, onSubmit }) => {
  const [zip, setZip] = useState("");

  function handleUseZip() {
    // allow only 5 digits; if invalid, still pass it back so logic can show an error
    const cleaned = zip.trim();
    onSubmit(cleaned.length ? cleaned : null);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => onSubmit(null)}
    >
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={{ flex: 1 }}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.45)",
            justifyContent: "center",
            padding: 24,
          }}
          onPress={() => onSubmit(null)} // tap outside to cancel
        >
          <Pressable
            onPress={() => {}}
            style={{
              backgroundColor: "white",
              borderRadius: 16,
              padding: 18,
              shadowColor: "#000",
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 4,
            }}
          >
            <Text style={{ fontWeight: "800", fontSize: 18, marginBottom: 6 }}>
              Enter Zip Code
            </Text>
            <Text style={{ color: "#374151", marginBottom: 12 }}>
              We couldn’t access your GPS. Enter your 5-digit ZIP so we can pull
              local conditions for better lure picks.
            </Text>

            <TextInput
              value={zip}
              onChangeText={(t) => setZip(t.replace(/[^\d]/g, "").slice(0, 5))}
              placeholder="e.g., 06010"
              keyboardType="number-pad"
              maxLength={5}
              autoFocus
              style={{
                borderWidth: 1,
                borderColor: "#E5E7EB",
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 16,
              }}
            />

            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 16 }}>
              <TouchableOpacity
                onPress={() => onSubmit(null)}
                style={{ paddingVertical: 10, paddingHorizontal: 12 }}
              >
                <Text style={{ textDecorationLine: "underline" }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleUseZip}
                style={{
                  backgroundColor: "#111827",
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  borderRadius: 10,
                }}
              >
                <Text style={{ color: "white", fontWeight: "700" }}>Use ZIP</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default ZipPromptModal;
