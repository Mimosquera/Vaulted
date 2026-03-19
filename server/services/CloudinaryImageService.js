import { v2 as cloudinary } from 'cloudinary';
import ImageService from './imageService.js';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

class CloudinaryImageService extends ImageService {
  async upload(imageId, fileBuffer, mimeType) {
    return new Promise((resolve, reject) => {
      console.log('Uploading to Cloudinary:', {
        imageId,
        bufferSize: fileBuffer.length,
        mimeType,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME ? 'SET' : 'MISSING',
      });

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          public_id: imageId,
          resource_type: 'auto',
          folder: 'collection-app',
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(error);
          } else {
            console.log('Cloudinary upload success:', result.secure_url);
            resolve(result);
          }
        }
      );
      uploadStream.end(fileBuffer);
    });
  }

  async delete(imageId) {
    try {
      return await cloudinary.uploader.destroy(imageId);
    } catch (error) {
      console.error('Error deleting image from Cloudinary:', error);
      throw error;
    }
  }

  getUrl(imageId) {
    return cloudinary.url(imageId, {
      secure: true,
      transformation: [{ fetch_format: 'auto' }],
    });
  }
}

export default CloudinaryImageService;
