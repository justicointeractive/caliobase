import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = Symbol('is_public');

export const Public = (): PropertyDecorator => SetMetadata(IS_PUBLIC, true);
