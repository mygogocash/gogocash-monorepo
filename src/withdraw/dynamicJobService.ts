import { Injectable } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';

@Injectable()
export class DynamicJobService {
  constructor(private schedulerRegistry: SchedulerRegistry) {}

  // สร้าง Job ใหม่ตามชื่อและเวลาที่ได้รับมา
  addDynamicJob(name: string, date: Date) {
    const job = new CronJob(date, () => {
      console.log(`งาน ${name} กำลังทำงาน ณ เวลาที่กำหนด!`);
    });

    this.schedulerRegistry.addCronJob(name, job);
    job.start();

    console.log(`สร้าง Job: ${name} สำหรับเวลา ${date} เรียบร้อยแล้ว`);
  }
}
