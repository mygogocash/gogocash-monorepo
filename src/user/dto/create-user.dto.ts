export class CreateUserDto {
  address: string;
  id_crossmint: number;
  email?: string;
  username?: string;
  id_twitter?: string;
  mobile?: string;
}

export class UpdateCountryDto {
  country: string;
}
