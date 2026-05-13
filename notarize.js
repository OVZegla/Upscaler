require("dotenv").config();

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== "darwin") {
    return;
  }

  // Skip notarization if Apple credentials are not provided
  if (!process.env.APPLEID || !process.env.APPLEIDPASS || !process.env.TEAMID) {
    console.log("Skipping notarization — APPLEID / APPLEIDPASS / TEAMID not set.");
    return;
  }

  const { notarize } = require("@electron/notarize");
  const appName = context.packager.appInfo.productFilename;

  return await notarize({
    appBundleId: "org.upscayl.Upscayl",
    appPath: `${appOutDir}/${appName}.app`,
    appleId: process.env.APPLEID,
    appleIdPassword: process.env.APPLEIDPASS,
    teamId: process.env.TEAMID,
  });
};
