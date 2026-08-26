import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

/** Pick an image, centre-crop it square, and return a small base64 data URI.
 * Pilot-friendly image storage: ~15-40KB rides in the DB until we host files.
 * Uses the modern system photo picker (no permission prompt, no extra crop
 * step) and does the square crop ourselves. */
export async function pickSquareImage(size = 256): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.9
  });
  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  const side = Math.min(asset.width ?? size, asset.height ?? size);
  const resized = await manipulateAsync(
    asset.uri,
    [
      {
        crop: {
          originX: Math.max(0, Math.round(((asset.width ?? side) - side) / 2)),
          originY: Math.max(0, Math.round(((asset.height ?? side) - side) / 2)),
          width: side,
          height: side
        }
      },
      { resize: { width: size, height: size } }
    ],
    { compress: 0.7, format: SaveFormat.JPEG, base64: true }
  );
  return resized.base64 ? `data:image/jpeg;base64,${resized.base64}` : null;
}
