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
  id_line?: string;
  email_verified?: boolean;
  id_card?: string;
  passport?: string;
  legal_address?: string;
  state?: string;
  city?: string;
  zip?: string;
  email_mcb?: string;
  avatar_url?: string;
}

export class UpdateCountryDto {
  /** ISO-3166-1 alpha-2 (canonicalised in `UserService.updateCountry`). */
  country: string;
}
