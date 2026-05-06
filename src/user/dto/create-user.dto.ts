export class CreateUserDto {
  address: string;
  id_crossmint: string;
  email?: string;
  username?: string;
  id_twitter?: string;
  mobile?: string;
  gender?: string;
  birthdate?: string;
  id_firebase?: string;
  /** ISO-3166-1 alpha-2 (canonicalised in `UserService.withCanonicalCountry`). */
  country?: string;
  provider?: string;
  id_telegram?: string;
}

export class UpdateCountryDto {
  /** ISO-3166-1 alpha-2 (canonicalised in `UserService.updateCountry`). */
  country: string;
}
