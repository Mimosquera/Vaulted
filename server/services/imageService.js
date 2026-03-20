class ImageService {
  async upload(_imageId, _fileBuffer, _mimeType) {
    throw new Error('upload() must be implemented by subclass');
  }

  async delete(_imageId) {
    throw new Error('delete() must be implemented by subclass');
  }

  getUrl(_imageId) {
    throw new Error('getUrl() must be implemented by subclass');
  }
}

export default ImageService;
