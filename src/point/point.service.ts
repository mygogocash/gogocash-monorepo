import { Injectable } from '@nestjs/common';
import { CreatePointDto } from './dto/create-point.dto';
import { UpdatePointDto } from './dto/update-point.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User } from 'src/user/schemas/user.schema';
import { Model, Types } from 'mongoose';
import { Point } from './schemas/point.schema';

@Injectable()
export class PointService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Point.name) private pointModel: Model<Point>,
  ) {}

  async addPointsToUser(
    userId: string,
    points: number,
    conversion_id: number,
  ): Promise<Point> {
    const pointDup = await this.pointModel
      .findOne({
        user_id: new Types.ObjectId(userId),
        conversion_id,
        type: 'add',
        action: 'purchase',
      })
      .exec();
    console.log('pointDup', pointDup);

    if (!pointDup) {
      const pointEntry = new this.pointModel({
        user_id: new Types.ObjectId(userId),
        point: points,
        conversion_id,
        type: 'add',
        action: 'purchase',
      });
      return pointEntry.save();
    }
  }
  create(createPointDto: CreatePointDto) {
    console.log(createPointDto);
    return 'This action adds a new point';
  }

  findAll() {
    return `This action returns all point`;
  }

  async getPoint(id_crossmint: string) {
    const user = await this.userModel.findOne({ id_crossmint });
    if (!user) {
      return { point: 0 };
    }
    const resultAdd = await this.pointModel.aggregate([
      {
        $match: {
          user_id: user._id,
          type: 'add',
        },
      },
      {
        $group: {
          _id: null,
          totalPoints: { $sum: '$point' },
        },
      },
    ]);
    const resultRemove = await this.pointModel.aggregate([
      {
        $match: {
          user_id: user._id,
          type: 'remove',
        },
      },
      {
        $group: {
          _id: null,
          totalPoints: { $sum: '$point' },
        },
      },
    ]);
    const result = [...resultAdd];
    const totalPointsAdd = result.length > 0 ? result[0].totalPoints : 0;
    const totalPointsRemove =
      resultRemove.length > 0 ? resultRemove[0].totalPoints : 0;
    const totalPoints =
      totalPointsAdd - totalPointsRemove > -1
        ? totalPointsAdd - totalPointsRemove
        : 0;
    return { point: totalPoints };
  }

  update(id: number, updatePointDto: UpdatePointDto) {
    console.log(updatePointDto);
    return `This action updates a #${id} point`;
  }

  remove(id: number) {
    return `This action removes a #${id} point`;
  }

  async getListReferral(id_crossmint: string) {
    const user = await this.userModel.findOne({ id_crossmint });
    if (!user) {
      return [];
    }
    return this.pointModel
      .find({ user_id: user._id, action: 'referral' })
      .populate({
        path: 'user_id',
        model: 'User',
        // select: 'id_crossmint',
      })
      .populate({
        path: 'referral_id',
        model: 'User',
        // select: 'id_crossmint',
      })
      .exec();
  }
}
