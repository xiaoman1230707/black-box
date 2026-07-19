import {
    Controller,
    Get,
    Query,
    Post,
    Delete,
    Body,
    UseGuards,
    Req,
    Param,
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { PostQueryDto } from './dto/post-query.dto';
import { PostPageQueryDto } from './dto/post-page-query.dto';
import { CreatePostDto } from './dto/create-post.dto';
// 鉴权目录下的路由守卫
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guard/optional-jwt-auth.guard';

// req.user.id 源自 JWT sub(字符串),用于 Prisma Int 需 Number 转换(§9.1 通则);匿名时 undefined
function resolveUserId(req: any): number | undefined {
    return req.user?.id ? Number(req.user.id) : undefined;
}

type AuthenticatedRequest = {
  user: { id: string | number };
};


@Controller('/posts')
export class PostsController{
    constructor(private readonly postsService:PostsService){}

    // 公开读 + 可选鉴权:登录态附加 likedByMe,匿名 false(不抛 401)
    @Get()
    @UseGuards(OptionalJwtAuthGuard)
    async getPosts(@Query() query: PostQueryDto, @Req() req){
        return this.postsService.findAll(query, resolveUserId(req))
    }

    @Get('tags')
    async getTags(){
        return this.postsService.findAllTags();
    }

  // O2:只读取当前 JWT 用户发布的帖子，不接受外部 userId
  @Get('mine')
  @UseGuards(JwtAuthGuard)
  async getMyPosts(
    @Query() query: PostPageQueryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.postsService.findMine(query, Number(req.user.id));
  }

  // O2:UI 称“我的收藏”，数据语义继续复用 UserLikePost
  @Get('liked')
  @UseGuards(JwtAuthGuard)
  async getLikedPosts(
    @Query() query: PostPageQueryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.postsService.findLiked(query, Number(req.user.id));
  }

    // 获取单篇文章(公开读 + 可选鉴权)
    @Get(':id')
    @UseGuards(OptionalJwtAuthGuard)
    async getPostById(@Param('id') id: string, @Req() req){
        return this.postsService.findOne(Number(id), resolveUserId(req))
    }

    // 发布文章的处理函数
    // 不需要设置路由，因为在posts下的Post方法不会冲突
    // restful 风格 一切皆资源
    @Post()
    @UseGuards(JwtAuthGuard) // 守卫 保护路由
    async createPost(@Body() dto: CreatePostDto, @Req() req){
        return this.postsService.create(dto, Number(req.user.id))
    }

    // 点赞(需登录,幂等)
    @Post(':id/like')
    @UseGuards(JwtAuthGuard)
    async likePost(@Param('id') id: string, @Req() req){
        return this.postsService.like(Number(id), Number(req.user.id))
    }

    // 取消点赞(需登录,静默)
    @Delete(':id/like')
    @UseGuards(JwtAuthGuard)
    async unlikePost(@Param('id') id: string, @Req() req){
        return this.postsService.unlike(Number(id), Number(req.user.id))
    }
}
