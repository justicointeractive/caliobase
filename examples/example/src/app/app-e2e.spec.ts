import { useSuperTestRequest } from '../../test/useSuperTestRequest';
import { AppModule } from '../app/app.module';

describe('app', () => {
  const request = useSuperTestRequest({
    imports: [AppModule],
  });

  it('should get root metadata', async () => {
    return request().get('/root').expect(200);
  });

  it('should not get banks unauthed', async () => {
    return request().get('/bank').expect(401);
  });
});
