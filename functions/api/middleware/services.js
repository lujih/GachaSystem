import { AuthService } from '../../../src/services/auth-service.js';
import { UserService } from '../../../src/services/user-service.js';
import { GachaService } from '../../../src/services/gacha-service.js';
import { GalleryService } from '../../../src/services/gallery-service.js';
import { AdminService } from '../../../src/services/admin-service.js';
import { UploadService } from '../../../src/services/upload-service.js';
import { ImagePipeline } from '../../../src/services/image-pipeline.js';

/** 每请求装配一次服务实例（轻量，无状态） */
export async function servicesMiddleware(c, next) {
  const env = c.env;
  const ctx = c.executionCtx;
  const services = {
    auth: new AuthService(env, ctx),
    user: new UserService(env, ctx),
    image: new ImagePipeline(env, ctx),
    gallery: new GalleryService(env, ctx),
    admin: new AdminService(env, ctx),
    upload: new UploadService(env, ctx),
  };
  services.gacha = new GachaService(env, ctx, {
    userService: services.user,
    imagePipeline: services.image,
    galleryService: services.gallery,
  });
  c.set('services', services);
  await next();
}
