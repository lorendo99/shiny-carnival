const { withAppBuildGradle } = require("expo/config-plugins");

const signingConfig = `
        release {
            if (System.getenv()["CI"] == "true") {
                storeFile file(System.getenv()["CM_KEYSTORE_PATH"])
                storePassword System.getenv()["CM_KEYSTORE_PASSWORD"]
                keyAlias System.getenv()["CM_KEY_ALIAS"]
                keyPassword System.getenv()["CM_KEY_PASSWORD"]
            } else {
                storeFile file('debug.keystore')
                storePassword 'android'
                keyAlias 'androiddebugkey'
                keyPassword 'android'
            }
        }`;

function configureGradle(contents) {
  if (!contents.includes("CM_KEYSTORE_PATH")) {
    const signingStart = contents.indexOf("\n    signingConfigs {");
    const buildTypesStart = contents.indexOf(
      "\n    buildTypes {",
      signingStart,
    );

    if (signingStart === -1 || buildTypesStart === -1) {
      throw new Error(
        "Could not find the Android signingConfigs/buildTypes blocks in app/build.gradle.",
      );
    }

    const signingClose = contents.lastIndexOf("\n    }", buildTypesStart);
    if (signingClose === -1 || signingClose <= signingStart) {
      throw new Error("Could not locate the end of Android signingConfigs.");
    }

    contents =
      contents.slice(0, signingClose) +
      signingConfig +
      contents.slice(signingClose);

    const updatedBuildTypesStart = contents.indexOf(
      "\n    buildTypes {",
      signingStart,
    );
    const releaseStart = contents.indexOf(
      "\n        release {",
      updatedBuildTypesStart,
    );
    const signingLine = "signingConfig signingConfigs.debug";
    const releaseSigningLine = contents.indexOf(signingLine, releaseStart);

    if (releaseStart === -1 || releaseSigningLine === -1) {
      throw new Error(
        "Could not find the generated release signing configuration.",
      );
    }

    contents =
      contents.slice(0, releaseSigningLine) +
      "signingConfig signingConfigs.release" +
      contents.slice(releaseSigningLine + signingLine.length);
  }

  if (!contents.includes("CM_BUILD_NUMBER")) {
    const versionCodePattern = /^(\s*)versionCode\s+1\s*$/m;
    if (!versionCodePattern.test(contents)) {
      throw new Error("Could not find the generated Android versionCode.");
    }

    contents = contents.replace(
      versionCodePattern,
      '$1versionCode = (System.getenv()["CM_BUILD_NUMBER"] ?: "1").toInteger()',
    );
  }

  return contents;
}

module.exports = function withCodemagicAndroidSigning(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language !== "groovy") {
      throw new Error(
        "FixMate's Codemagic signing plugin requires Groovy build.gradle.",
      );
    }

    config.modResults.contents = configureGradle(config.modResults.contents);
    return config;
  });
};
