import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as https from 'https';
import { createCrossmint, CrossmintAuth } from '@crossmint/server-sdk';
import { UserService } from 'src/user/user.service';
import { SignInDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private baseUrl: string;
  private projectId: string;
  private secret: string;
  private httpsAgent: https.Agent;
  private crossmint: any;
  private crossmintAuth: any;

  constructor(
    private readonly config: ConfigService,
    private readonly userService: UserService,
  ) {
    this.baseUrl = this.config.get<string>('env.CROSSMINT_BASE_URL')!;
    this.projectId = this.config.get<string>('env.CROSSMINT_PROJECT_ID')!;
    this.secret = this.config.get<string>('env.CROSSMINT_SECRET')!;
    this.httpsAgent = new https.Agent({ rejectUnauthorized: false });
    this.crossmint = createCrossmint({
      apiKey: this.secret!,
    });
    this.crossmintAuth = CrossmintAuth.from(this.crossmint);
  }

  private headers() {
    return { Authorization: `Bearer ${this.secret}` };
  }

  async signUp(email: string, password: string) {
    console.log('this.baseUrl', this.baseUrl);
    const res = await axios.post(
      `${this.baseUrl}/signup`,
      { email, password, projectId: this.projectId },
      { headers: this.headers() },
    );
    return res.data;
  }

  async signIn(payload: SignInDto) {
    const data = await this.crossmintAuth.getUser(payload.id_crossmint);
    // console.log('data', data);
    if (!data.id) {
      throw new Error('User not found in Crossmint');
    }
    // console.log('payload', data.id);
    const userExist = await this.userService.findOne({
      id_crossmint: data.id,
    });
    // console.log('userExist', userExist);

    if (userExist) {
      if (userExist.address) {
        const user = await this.userService.update(userExist._id, {
          email: data.email,
          username: data?.twitter
            ? data.twitter.username
            : data?.email?.split('@')[0],
          id_twitter: data?.twitter ? data.twitter.id : '',
          address: payload.address,
        });
        return user;
      }
      return userExist;
    }
    const user = await this.userService.create({
      address: payload.address,
      id_crossmint: data.id,
      email: data.email,
      username: data?.twitter
        ? data.twitter.username
        : data?.email?.split('@')[0],
      id_twitter: data?.twitter ? data.twitter.id : '',
    });
    return user; // { accessToken, refreshToken, user }
  }

  async getProfile(accessToken: string) {
    const res = await axios.get(`${this.baseUrl}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return res.data;
  }

  async signOut(refreshToken: string) {
    const res = await axios.post(
      `${this.baseUrl}/signout`,
      { refreshToken },
      { headers: this.headers() },
    );
    return res.data;
  }

  async refresh(refreshToken: string) {
    const res = await axios.post(
      `${this.baseUrl}/refresh`,
      { refreshToken, projectId: this.projectId },
      { headers: this.headers() },
    );
    return res.data; // { accessToken, refreshToken }
  }
}
