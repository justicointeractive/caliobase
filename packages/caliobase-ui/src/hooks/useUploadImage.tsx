import { useApiContext } from '../context/ApiContext';
import { useUserContext } from '../context/UserContext';

export function useUploadImage() {
  const { userOrgApi } = useUserContext();
  const { caliobaseUiConfiguration } = useApiContext();
  return caliobaseUiConfiguration.createImageHandler(userOrgApi);
}
