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
}

export class UpdateCountryDto {
  country: string;
}
