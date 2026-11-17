import { ELECTRON_COMMANDS } from "@common/electron-commands";
import { useEffect } from "react";
import useLogger from "./use-logger";

export const initCustomModels = () => {
  const logit = useLogger();

  useEffect(() => {
    // Unparseable storage used to throw here, during the first render of the
    // page, which black-screens the app over a setting nothing depends on.
    // The folder picker is gone, so this only ever fires for installs that set
    // a path before it was removed.
    let customModelsPath: unknown = null;
    try {
      const raw = localStorage.getItem("customModelsPath");
      customModelsPath = raw === null ? null : JSON.parse(raw);
    } catch {
      customModelsPath = null;
    }

    if (typeof customModelsPath === "string" && customModelsPath.length > 0) {
      window.electron.send(ELECTRON_COMMANDS.GET_MODELS_LIST, customModelsPath);
      logit("🎯 GET_MODELS_LIST: ", customModelsPath);
    }
  }, []);
};
