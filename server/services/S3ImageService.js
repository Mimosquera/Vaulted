import ImageService from './imageService.js';

class S3ImageService extends ImageService {
  // TODO: not implemented yet, using Cloudinary for now
  // needs: npm install @aws-sdk/client-s3 + AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_S3_BUCKET

  async upload(_imageId, _fileBuffer, _mimeType) {
    throw new Error('S3 image service not yet implemented. Use Cloudinary for now.');
  }

  async delete(_imageId) {
    throw new Error('S3 image service not yet implemented. Use Cloudinary for now.');
  }

  getUrl(_imageId) {
    throw new Error('S3 image service not yet implemented. Use Cloudinary for now.');
  }
}

export default S3ImageService;

