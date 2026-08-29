const { withPodfile } = require("expo/config-plugins");

/** TestFlight "Upload Symbols Failed" fix: pods default to plain DWARF, so
 * their frameworks ship without dSYMs. Force dSYM generation for Release. */
module.exports = function withReleaseDsym(config) {
  return withPodfile(config, (c) => {
    if (!c.modResults.contents.includes("DEBUG_INFORMATION_FORMAT")) {
      c.modResults.contents = c.modResults.contents.replace(
        /post_install do \|installer\|/,
        [
          "post_install do |installer|",
          "    installer.pods_project.targets.each do |dsym_target|",
          "      dsym_target.build_configurations.each do |dsym_config|",
          "        dsym_config.build_settings['DEBUG_INFORMATION_FORMAT'] = 'dwarf-with-dsym' if dsym_config.name == 'Release'",
          "      end",
          "    end"
        ].join("\n")
      );
    }
    return c;
  });
};
