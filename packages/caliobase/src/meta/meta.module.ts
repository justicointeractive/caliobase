import { Module } from '@nestjs/common';
import { CaliobaseAuthModule } from '../auth/auth.module';
import { MetaController } from './meta.controller';
import { MetaService } from './meta.service';

@Module({
  imports: [CaliobaseAuthModule],
  providers: [MetaService],
  exports: [MetaService],
  controllers: [MetaController],
})
export class CaliobaseMetaModule {}
