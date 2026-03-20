import ImageService from './imageService.js';

class S3ImageService extends ImageService {
  // TODO: Implement AWS S3 integration when ready for production
  // Requires: npm install @aws-sdk/client-s3
  // And environment variables: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_S3_BUCKET

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

