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
}

export class UpdateCountryDto {
  country: string;
}
