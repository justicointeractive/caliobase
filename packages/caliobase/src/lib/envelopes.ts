import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiResponseOptions,
  getSchemaPath,
} from '@nestjs/swagger';

export class ItemEnvelope<T> {
  constructor(public item: T) {}
}

export class ItemsEnvelope<T> {
  constructor(public items: T[]) {}
}

export const ApiPaginatedResponse =
  (
    decorator: (
      options?: ApiResponseOptions
    ) => MethodDecorator & ClassDecorator
  ) =>
  <TModel extends Type<unknown>>({ type }: { type: TModel }) => {
    return applyDecorators(
      decorator({
        schema: {
          allOf: [
            {
              properties: {
                items: {
                  type: 'array',
                  items: { $ref: getSchemaPath(type) },
                  nullable: false,
                },
                count: { type: 'number' },
                prev: { type: 'string' },
                next: { type: 'string' },
              },
            },
          ],
        },
      })
    );
  };

export const ApiOkPaginatedResponse = ApiPaginatedResponse(ApiOkResponse);

export const ApiItemResponse =
  (
    decorator: (
      options?: ApiResponseOptions
    ) => MethodDecorator & ClassDecorator
  ) =>
  <TModel extends Type<unknown>>(
    { type }: { type: TModel },
    { nullable }: { nullable: boolean }
  ) => {
    return applyDecorators(
      decorator({
        schema: {
          type: 'object',
          properties: {
            item: { $ref: getSchemaPath(type), nullable },
          },
        },
      })
    );
  };

export const ApiOkItemResponse = ApiItemResponse(ApiOkResponse);
export const ApiCreatedItemResponse = ApiItemResponse(ApiCreatedResponse);
