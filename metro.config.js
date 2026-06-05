const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// allow .txt files
config.resolver.assetExts.push("txt");

module.exports = config;
