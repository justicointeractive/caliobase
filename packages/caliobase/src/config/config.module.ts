import { DynamicModule, Module, Provider } from '@nestjs/common';
import { CaliobaseConfig, CaliobaseConfigOptions } from './config';

@Module({})
export class CaliobaseConfigModule {
  static async forRootAsync(
    options: CaliobaseConfigOptions
  ): Promise<DynamicModule> {
    const configProvider: Provider<CaliobaseConfig> = {
      provide: CaliobaseConfig,
      useValue: new CaliobaseConfig(options),
    };

    return {
      module: CaliobaseConfigModule,
      global: true,
      providers: [configProvider],
      exports: [configProvider],
    };
  }
}
