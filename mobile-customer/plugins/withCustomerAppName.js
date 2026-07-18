const { withStringsXml } = require("expo/config-plugins");

module.exports = function withCustomerAppName(config) {
  return withStringsXml(config, (stringsConfig) => {
    const strings = stringsConfig.modResults.resources.string ?? [];
    const appName = strings.find((item) => item.$?.name === "app_name");
    if (appName) appName._ = "Kuryr4You Zákazník";
    else strings.push({ $: { name: "app_name" }, _: "Kuryr4You Zákazník" });
    stringsConfig.modResults.resources.string = strings;
    return stringsConfig;
  });
};
