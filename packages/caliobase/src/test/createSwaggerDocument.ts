import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { TestingModule } from '@nestjs/testing';

export function createSwaggerDocument(module: TestingModule) {
  const config = new DocumentBuilder()
    .setTitle('example')
    .setDescription('The example app API description')
    .setVersion('1.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'Bearer',
      name: 'JWT',
      description: 'Access Token',
      in: 'header',
    })
    .build();

  const app = module.createNestApplication();

  const document = SwaggerModule.createDocument(app, config);
  return document;
}
