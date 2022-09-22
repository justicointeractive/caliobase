import { AbstractUserProfile, CaliobaseEntity } from '@caliobase/caliobase';
import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { Column } from 'typeorm';

@CaliobaseEntity({
  controller: { name: 'user_profile' },
  accessPolicy: [
    {
      effect: 'allow',
      action: ['get'],
    },
    { effect: 'allow', action: '*', users: { role: 'owner' } },
  ],
})
export class UserProfile extends AbstractUserProfile {
  @IsString()
  @Column()
  @ApiProperty()
  firstName!: string;

  @IsString()
  @Column()
  @ApiProperty()
  lastName!: string;
}
