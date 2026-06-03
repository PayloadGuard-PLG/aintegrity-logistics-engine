import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

// Mutable object — object reference is shared across all importers, so mutations
// are visible immediately. A plain `export let` primitive would be frozen at the
// import-time value in Metro's CommonJS output and never update.
export const picker = { active: false };

export async function pickImage(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (perm.status !== 'granted') {
    Alert.alert('Permission required', 'Allow access to your photo library to scan screenshots.');
    return null;
  }
  picker.active = true;
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsEditing: false,
      base64: false,
      exif: false,
    });
    if (result.canceled || result.assets.length === 0) return null;
    return result.assets[0].uri;
  } finally {
    picker.active = false;
  }
}
