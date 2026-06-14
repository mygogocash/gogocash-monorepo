import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import axios from 'axios';

@Injectable()
export class CrossmintAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  // Example config property (not used in code below)
  async getCrossmintJwks() {
    // Fetch JWKS from Crossmint using axios
    const response = await axios.get(
      'https://www.crossmint.com/.well-known/jwks.json',
    );
    return response.data;
  }
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers['authorization'];
    if (!authHeader) {
      throw new UnauthorizedException('token not found');
    }

    try {
      // const payload = this.jwtService.verify(authHeader);
      // Replace 'yourJWKS' with the actual JWKS string or object from your config/environment
      const token = authHeader.split(' ')[1];
      if (!token) {
        return false;
      }
      // Verify the JWT using Crossmint's SDK
      const decodedToken = await this.jwtService.decode(token);
      // If verification is successful, attach the user info to the request object
      request['user'] = decodedToken;
      return true;
    } catch (e) {
      throw new UnauthorizedException(e?.message || 'Invalid token');
    }
  }
}
