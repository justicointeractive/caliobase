import { AbstractUserProfile, CaliobaseEntity } from '@caliobase/caliobase';
import { Column } from 'typeorm';

@CaliobaseEntity({
  controller: { name: 'user_profile' },
})
export class UserProfile extends AbstractUserProfile {
  @Column()
  firstName!: string;

  @Column()
  lastName!: string;
}
