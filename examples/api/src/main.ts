import { CaliobaseModule } from '@caliobase/caliobase';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  await CaliobaseModule.bootstrap(app, {
    migration: {
      migrationsDir: './tmp/test-migrations',
      generateMigrations: true,
    },
  });

  const port = process.env.PORT || 3333;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`
  );
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
