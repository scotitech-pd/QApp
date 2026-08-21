// Idempotently wires the OnQ release keystore into android/app/build.gradle.
// Run after `expo prebuild` (which regenerates the android folder).
// Reads android/keystore.properties (never committed); falls back to the
// debug key when it is absent so CI/dev machines still build.
import fs from "node:fs";
import path from "node:path";

const gradlePath = path.resolve("android/app/build.gradle");
let src = fs.readFileSync(gradlePath, "utf8");

if (src.includes("onqReleaseSigning")) {
  console.log("release signing already applied");
  process.exit(0);
}

src = src.replace(
  /    signingConfigs \{\n        debug \{/,
  `    def onqKeystoreProps = new Properties()
    def onqKeystoreFile = rootProject.file("keystore.properties")
    def onqReleaseSigning = onqKeystoreFile.exists()
    if (onqReleaseSigning) {
        onqKeystoreFile.withInputStream { onqKeystoreProps.load(it) }
    }
    signingConfigs {
        release {
            if (onqReleaseSigning) {
                storeFile file(onqKeystoreProps['ONQ_UPLOAD_STORE_FILE'])
                storePassword onqKeystoreProps['ONQ_UPLOAD_STORE_PASSWORD']
                keyAlias onqKeystoreProps['ONQ_UPLOAD_KEY_ALIAS']
                keyPassword onqKeystoreProps['ONQ_UPLOAD_KEY_PASSWORD']
            }
        }
        debug {`
);

src = src.replace(
  /(release \{\n(?:.*\n)*?)\s*signingConfig signingConfigs\.debug\n/,
  (match) => match.replace("signingConfig signingConfigs.debug", "signingConfig onqReleaseSigning ? signingConfigs.release : signingConfigs.debug")
);

fs.writeFileSync(gradlePath, src);
console.log("release signing applied");
