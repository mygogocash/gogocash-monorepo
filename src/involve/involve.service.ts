import { Injectable } from '@nestjs/common';
import { CreateInvolveDto } from './dto/create-involve.dto';
import { UpdateInvolveDto } from './dto/update-involve.dto';
import axios from 'axios';

@Injectable()
export class InvolveService {
  private endpoint: string;
  constructor() {
    this.endpoint = `https://api.involve.asia/api`;
  }
  async signIn() {
    console.log(' process.env.INVOVLE_SECRET', process.env.INVOVLE_SECRET);

    const res = await axios.post(`${this.endpoint}/authenticate`, {
      secret: process.env.INVOVLE_SECRET,
      key: 'general',
    });
    return res.data;
  }
  create(createInvolveDto: CreateInvolveDto) {
    return 'This action adds a new involve';
  }

  findAll() {
    const res = this.signIn();
    console.log(res);
    return `This action returns all involve`;
  }

  findOne(id: number) {
    return `This action returns a #${id} involve`;
  }

  update(id: number, updateInvolveDto: UpdateInvolveDto) {
    return `This action updates a #${id} involve`;
  }

  remove(id: number) {
    return `This action removes a #${id} involve`;
  }
}
