export interface ResponseCountry {
  flags: Flags;
  name: Name;
  cca2: string;
}

export interface Flags {
  png: string;
  svg: string;
  alt: string;
}

export interface Name {
  common: string;
  official: string;
  nativeName: NativeName;
}

export interface NativeName {
  ara: Ara;
}

export interface Ara {
  official: string;
  common: string;
}

export interface OptionsCountries {
  label: string;
  code: string;
  value: string;
  /** Flag image URL for preference / picker UI */
  flagPng?: string;
}
