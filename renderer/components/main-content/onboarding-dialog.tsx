import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { useAtomValue } from "jotai";
import useTranslation from "../hooks/use-translation";
import LanguageSwitcher from "../sidebar/settings-tab/language-switcher";
import { localeAtom } from "@/atoms/translations-atom";

export function OnboardingDialog() {
  const t = useTranslation();
  const locale = useAtomValue(localeAtom);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const storedValue = localStorage.getItem("showOnboarding");
    if (storedValue !== null) {
      setOpen(JSON.parse(storedValue));
    } else {
      setOpen(true);
    }
  }, []);

  const handleStart = () => {
    setOpen(false);
    localStorage.setItem("showOnboarding", JSON.stringify(false));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="flex w-full max-w-md flex-col items-center justify-center gap-8 p-10">
        <DialogHeader>
          <DialogTitle className="text-center text-4xl">
            {t("ONBOARDING_DIALOG.STEP_1.TITLE")}
          </DialogTitle>
          <DialogDescription className="text-center text-lg text-base-content/70">
            {t("ONBOARDING_DIALOG.STEP_1.DESCRIPTION")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex w-full flex-col items-center gap-4 rounded-sm bg-primary p-8">
          <label className="text-sm font-medium uppercase text-primary-content">
            {t("SETTINGS.LANGUAGE.TITLE")}
          </label>
          <LanguageSwitcher hideLabel={true} />
        </div>

        <DialogFooter>
          <button onClick={handleStart} className="btn btn-secondary w-40">
            {t("ONBOARDING_DIALOG.GET_STARTED_BUTTON_TITLE")}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
