import { translationAtom } from "@/atoms/translations-atom";
import { useAtomValue } from "jotai";
import React, { useEffect } from "react";
import { themeChange } from "theme-change";

const SelectTheme = ({ hideLabel }: { hideLabel?: boolean }) => {
  const availableThemes = [
    { label: "Light", value: "symp" },
    { label: "Dark", value: "symp-dark" },
    { label: "Cupcake", value: "cupcake" },
    { label: "Bumblebee", value: "bumblebee" },
    { label: "Emerald", value: "emerald" },
    { label: "Corporate", value: "corporate" },
    { label: "Synthwave", value: "synthwave" },
    { label: "Retro", value: "retro" },
    { label: "Cyberpunk", value: "cyberpunk" },
    { label: "Halloween", value: "halloween" },
    { label: "Forest", value: "forest" },
    { label: "Aqua", value: "aqua" },
    { label: "Lofi", value: "lofi" },
    { label: "Pastel", value: "pastel" },
    { label: "Fantasy", value: "fantasy" },
    { label: "Black", value: "black" },
    { label: "Luxury", value: "luxury" },
    { label: "Dracula", value: "dracula" },
    { label: "Autumn", value: "autumn" },
    { label: "Business", value: "business" },
    { label: "Night", value: "night" },
    { label: "Coffee", value: "coffee" },
    { label: "Winter", value: "winter" },
  ];
  const t = useAtomValue(translationAtom);

  useEffect(() => {
    themeChange(false);
  }, []);

  return (
    <div className="flex w-full flex-col gap-2">
      {!hideLabel && (
        <p className="text-sm font-medium">{t("SETTINGS.THEME.TITLE")}</p>
      )}
      <select data-choose-theme className="select select-primary">
        {availableThemes.map((theme) => {
          return (
            <option value={theme.value} key={theme.value}>
              {theme.label.toLocaleUpperCase()}
            </option>
          );
        })}
      </select>
    </div>
  );
};

export default SelectTheme;
