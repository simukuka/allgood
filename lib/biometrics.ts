/**
 * Biometric authentication utilities.
 * Uses expo-local-authentication to check hardware support and prompt the user.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";

const BIOMETRIC_ENABLED_KEY = "@allgood_biometric_enabled";

/** Check whether the device has biometric hardware and enrolled biometrics */
export async function isBiometricAvailable(): Promise<boolean> {
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) return false;
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return enrolled;
  } catch {
    return false;
  }
}

/** Get the available biometric type label (Face ID, fingerprint, etc.) */
export async function getBiometricType(): Promise<string> {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (
      types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
    ) {
      return "Face ID";
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return "Fingerprint";
    }
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return "Iris";
    }
    return "Biometric";
  } catch {
    return "Biometric";
  }
}

/** Prompt the user for biometric authentication. Returns true on success. */
export async function authenticateWithBiometrics(
  promptMessage = "Authenticate to sign in",
): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: "Cancel",
      disableDeviceFallback: false,
    });
    return result.success;
  } catch {
    return false;
  }
}

/** Persist user's preference for biometric login */
export async function setBiometricPreference(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, JSON.stringify(enabled));
}

/** Read user's stored biometric preference */
export async function getBiometricPreference(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
    return val ? JSON.parse(val) === true : false;
  } catch {
    return false;
  }
}
