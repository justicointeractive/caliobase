import { CaliobaseModule } from '@caliobase/caliobase';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as morgan from 'morgan';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(morgan('tiny'));

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  await CaliobaseModule.bootstrap(app, {
    migration: {
      migrationsDir: './tmp/test-migrations',
      generateMigrations: true,
    },
  });

  const port = process.env.PORT || 5201;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`
  );
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
