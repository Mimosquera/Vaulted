import CloudinaryImageService from './CloudinaryImageService.js';
import S3ImageService from './S3ImageService.js';

function createImageService() {
  const provider = process.env.IMAGE_PROVIDER || 'cloudinary';

  if (provider === 's3') {
    return new S3ImageService();
  }

  return new CloudinaryImageService();
}

const imageService = createImageService();

export default imageService;
