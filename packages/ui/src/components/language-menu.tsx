import { LanguagesIcon } from "lucide-react";

import { Button } from "#components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "#components/dropdown-menu";

type Language<T extends string> = {
  /** The app's locale, also the item's `lang`. */
  value: T;
  /** The language's own name ("Español"), so anyone finds theirs. */
  label: string;
};

type LanguageMenuProps<T extends string> = {
  languages: readonly Language<T>[];
  value: T;
  onValueChange: (value: T) => void;
  /** Accessible name of the trigger, already translated by the app. */
  label: string;
};

/** Picks the app's language. The app owns the locale and its persistence. */
function LanguageMenu<T extends string>({
  languages,
  value,
  onValueChange,
  label,
}: LanguageMenuProps<T>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="sm" aria-label={label} />}
      >
        <LanguagesIcon />
        <span className="uppercase">{value}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next: T) => {
            if (next !== value) onValueChange(next);
          }}
        >
          {languages.map((language) => (
            <DropdownMenuRadioItem
              key={language.value}
              value={language.value}
              lang={language.value}
            >
              {language.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { LanguageMenu };
