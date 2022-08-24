import { camelCase } from 'lodash';
import { generateApi } from 'swagger-typescript-api-nextgen';
import { SwaggerClientExecutorSchema } from './schema';

export default async function runExecutor(
  options: SwaggerClientExecutorSchema
) {
  await generateApi({
    input: options.input,
    output: options.output,
    name: 'index.ts',
    httpClientType: 'fetch',
    moduleNameFirstTag: true,
    hooks: {
      onCreateRoute(routeInfo) {
        const [controller, method] = routeInfo.raw.operationId.split('_');
        // routeInfo.namespace = camelCase(controller.replace("Controller", ""));
        routeInfo.routeName.original = camelCase(method);
        routeInfo.routeName.usage = camelCase(method);
      },
    },
  });

  return {
    success: true,
  };
}
