class ImageService {
  async upload(imageId, fileBuffer, mimeType) {
    throw new Error('upload() must be implemented by subclass');
  }

  async delete(imageId) {
    throw new Error('delete() must be implemented by subclass');
  }

  getUrl(imageId) {
    throw new Error('getUrl() must be implemented by subclass');
  }
}

export default ImageService;
