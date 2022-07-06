import { Injectable, Type } from '@nestjs/common';
import {
  DataSource,
  DeepPartial,
  FindOptionsWhere,
  ObjectLiteral,
} from 'typeorm';
import { CaliobaseFindOptions, RenameClass } from '.';
import {
  getAclAccessLevels,
  getAclEntity,
  getCaliobaseOwnerOrganizationMixin,
  ToFindOptions,
} from '..';
import { entityServiceQueryBuilder } from './entityServiceQueryBuilder';
import {
  ICaliobaseService,
  ICaliobaseServiceOptions,
  ICaliobaseServiceType,
} from './ICaliobaseService';

export function createEntityServiceClass<
  TEntity,
  TCreate extends DeepPartial<TEntity>,
  TUpdate extends DeepPartial<TEntity>
>(
  entityType: Type<TEntity>,
  findManyOptions: Type<ToFindOptions<TEntity>>,
  createDto: Type<TCreate>,
  updateDto: Type<TUpdate>
): ICaliobaseServiceType<TEntity, TCreate, TUpdate> {
  const AclEntity = getAclEntity(entityType);

  @Injectable()
  @RenameClass(entityType)
  class CaliobaseServiceClass
    implements ICaliobaseService<TEntity, TCreate, TUpdate>
  {
    public static Entity = entityType;

    public static CreateDto = createDto;

    public static UpdateDto = updateDto;

    public static FindManyOptions = findManyOptions;

    constructor(private dataSource: DataSource) {}

    async create(createDto: TCreate, { owner }: ICaliobaseServiceOptions) {
      return await this.dataSource.transaction(async (manager) => {
        const entityRepository = manager.getRepository(entityType);

        const created: TEntity = await entityRepository.save(
          entityRepository.create({
            ...createDto,
            ...getCaliobaseOwnerOrganizationMixin(entityType, owner),
          }) as TEntity & ObjectLiteral // todo more narrow type
        );
        if (AclEntity != null) {
          const aclEntityRepository = manager.getRepository(AclEntity);
          const createdAcl = aclEntityRepository.create({
            access: 'owner',
            object: created as any, // todo remove any
            organization: owner,
          }) as ObjectLiteral; // todo more narrow type
          await aclEntityRepository.save(createdAcl);
        }
        return created;
      });
    }

    async findAll(
      { where, order }: CaliobaseFindOptions<TEntity>,
      { owner }: ICaliobaseServiceOptions
    ) {
      return await this.dataSource.transaction(async (manager) => {
        return await entityServiceQueryBuilder(
          entityType,
          manager,
          { where, order },
          owner
        ).getMany();
      });
    }

    async findOne(
      { where, order }: CaliobaseFindOptions<TEntity>,
      { owner }: ICaliobaseServiceOptions
    ) {
      return await this.dataSource.transaction(async (manager) => {
        return await entityServiceQueryBuilder(
          entityType,
          manager,
          { where, order },
          owner
        ).getOne();
      });
    }

    async update(
      conditions: FindOptionsWhere<TEntity>,
      updateDto: TUpdate,
      { owner }: ICaliobaseServiceOptions
    ) {
      return await this.dataSource.transaction(async (manager) => {
        const allFound = await entityServiceQueryBuilder(
          entityType,
          manager,
          { where: conditions },
          owner,
          getAclAccessLevels('writer')
        ).getMany();
        for (const found of allFound) {
          Object.assign(found, updateDto);
          await manager
            .getRepository(entityType)
            .save(found as TEntity & ObjectLiteral);
        }
        return allFound;
      });
    }

    async remove(
      conditions: FindOptionsWhere<TEntity>,
      { owner }: ICaliobaseServiceOptions
    ) {
      return await this.dataSource.transaction(async (manager) => {
        const allFound = await entityServiceQueryBuilder(
          entityType,
          manager,
          { where: conditions },
          owner,
          getAclAccessLevels('writer')
        ).getMany();
        for (const found of allFound) {
          Object.assign(found, updateDto);
          await manager.getRepository(entityType).remove(found);
        }
        return allFound;
      });
    }
  }

  return CaliobaseServiceClass;
}
