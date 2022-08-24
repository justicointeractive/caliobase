import { readFile } from 'fs/promises';
import { runExecutor } from './executor';
import { SwaggerClientExecutorSchema } from './schema';

describe('swagger-client', () => {
  it('should generate client', async () => {
    const options: SwaggerClientExecutorSchema = {
      input: './packages/caliobase-nx/test-assets/openapi.json',
      output: './tmp/generated-client',
    };

    await runExecutor(options);

    expect(
      await readFile('./tmp/generated-client/index.ts', 'utf8')
    ).toMatchSnapshot();
  });
});
