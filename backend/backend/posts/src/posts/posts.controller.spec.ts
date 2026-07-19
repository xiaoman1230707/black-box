import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guard/optional-jwt-auth.guard';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

type PostsServiceMock = {
  findAll: jest.Mock;
  findAllTags: jest.Mock;
  findOne: jest.Mock;
  findMine: jest.Mock;
  findLiked: jest.Mock;
  create: jest.Mock;
  like: jest.Mock;
  unlike: jest.Mock;
};

describe('PostsController personal list routes', () => {
  let app: INestApplication<App>;
  let authorized: boolean;
  let service: PostsServiceMock;

  beforeAll(async () => {
    authorized = true;
    service = {
      findAll: jest.fn(),
      findAllTags: jest.fn(),
      findOne: jest.fn().mockResolvedValue({ route: 'dynamic-id' }),
      findMine: jest.fn(),
      findLiked: jest.fn(),
      create: jest.fn(),
      like: jest.fn(),
      unlike: jest.fn(),
    };

    const jwtGuard = {
      canActivate(context: ExecutionContext) {
        if (!authorized) throw new UnauthorizedException();
        const req = context
          .switchToHttp()
          .getRequest<{ user?: { id: string } }>();
        req.user = { id: '7' };
        return true;
      },
    };
    const optionalGuard = {
      canActivate() {
        return true;
      },
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [PostsController],
      providers: [{ provide: PostsService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(jwtGuard)
      .overrideGuard(OptionalJwtAuthGuard)
      .useValue(optionalGuard)
      .compile();

    app = moduleRef.createNestApplication<App>();
    app.useLogger(false);
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  beforeEach(() => {
    authorized = true;
    jest.clearAllMocks();
    service.findOne.mockResolvedValue({ route: 'dynamic-id' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /posts/mine 优先命中静态路由并只传 JWT 用户 id', async () => {
    service.findMine.mockResolvedValue({ items: [], total: 0 });

    await request(app.getHttpServer())
      .get('/posts/mine?page=2&limit=5&userId=999')
      .expect(200)
      .expect({ items: [], total: 0 });

    expect(service.findMine).toHaveBeenCalledTimes(1);
    const [query, userId] = service.findMine.mock.calls[0] as [
      Record<string, unknown>,
      number,
    ];
    expect(query).toEqual({ page: 2, limit: 5 });
    expect(query).not.toHaveProperty('userId');
    expect(userId).toBe(7);
    expect(service.findOne).not.toHaveBeenCalled();
  });

  it('GET /posts/liked 优先命中静态路由并使用默认分页', async () => {
    service.findLiked.mockResolvedValue({ items: [], total: 0 });

    await request(app.getHttpServer())
      .get('/posts/liked')
      .expect(200)
      .expect({ items: [], total: 0 });

    expect(service.findLiked).toHaveBeenCalledWith({ page: 1, limit: 10 }, 7);
    expect(service.findOne).not.toHaveBeenCalled();
  });

  it.each(['/posts/mine', '/posts/liked'])(
    '%s 未登录时由 JwtAuthGuard 返回 401',
    async (path) => {
      authorized = false;

      await request(app.getHttpServer()).get(path).expect(401);

      expect(service.findMine).not.toHaveBeenCalled();
      expect(service.findLiked).not.toHaveBeenCalled();
      expect(service.findOne).not.toHaveBeenCalled();
    },
  );

  it('service 异常保持 HTTP 错误而不是返回空列表', async () => {
    service.findMine.mockRejectedValue(new Error('database unavailable'));

    await request(app.getHttpServer()).get('/posts/mine').expect(500);
  });
});
