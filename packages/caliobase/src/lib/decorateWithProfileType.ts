import { Type } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { OneToOne } from 'typeorm';

export function decorateWithProfileType<TEntity, TProfileEntity>({
  Entity,
  ProfileEntity,
  profileToEntityProperty,
  entityToProfileProperty,
}: {
  Entity: Type<TEntity>;
  ProfileEntity: Type<TProfileEntity> | null;
  profileToEntityProperty: keyof TProfileEntity & string;
  entityToProfileProperty: keyof TEntity & string;
}) {
  if (ProfileEntity) {
    Reflect.decorate(
      [
        OneToOne(
          () => ProfileEntity,
          (up) => up[profileToEntityProperty],
          { eager: true }
        ),
        ApiProperty({ type: ProfileEntity }),
      ],
      Entity.prototype,
      entityToProfileProperty
    );
  }
}
