import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiResponseOptions,
  getSchemaPath,
} from '@nestjs/swagger';

export class PaginationItemResponse<T> {
  constructor(public item: T) {}
}

export class PaginationItemsResponse<T> {
  constructor(public items: T[], public count?: number) {}
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
                },
                count: { type: 'number' },
              },
              required: ['items'],
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
            item: { $ref: getSchemaPath(type) },
          },
          required: [...(nullable ? [] : ['item'])],
        },
      })
    );
  };

export const ApiOkItemResponse = ApiItemResponse(ApiOkResponse);
export const ApiCreatedItemResponse = ApiItemResponse(ApiCreatedResponse);
