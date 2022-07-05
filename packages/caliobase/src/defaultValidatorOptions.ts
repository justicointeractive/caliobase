import { ValidationPipeOptions } from '@nestjs/common';

export const defaultValidatorOptions: ValidationPipeOptions = {
  transform: true,
  forbidNonWhitelisted: true,
  forbidUnknownValues: true,
  whitelist: true,
};
