import { camelCase } from 'lodash';
import { join } from 'path';
import { generateApi } from 'swagger-typescript-api-nextgen';
import { SwaggerClientExecutorSchema } from './schema';

export async function runExecutor(options: SwaggerClientExecutorSchema) {
  await generateApi({
    input: join(process.cwd(), options.input),
    output: join(process.cwd(), options.output),
    name: options.name ?? 'index.ts',
    httpClientType: 'fetch',
    moduleNameFirstTag: true,
    hooks: {
      onCreateRoute(routeInfo) {
        const operationIdParts = routeInfo.raw.operationId.split('_');
        const methodName = operationIdParts.at(-1);
        // routeInfo.namespace = camelCase(controller.replace("Controller", ""));
        routeInfo.routeName.original = camelCase(methodName);
        routeInfo.routeName.usage = camelCase(methodName);
      },
    },
  });

  return {
    success: true,
  };
}

export default runExecutor;
