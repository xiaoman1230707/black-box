import {
    Controller,
    Get,
    Post,
    Delete,
    Param,
    Body,
    Req,
    UseGuards,
} from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
// 直接复用守卫类(JwtStrategy 已全局注册,与现状 PostsController 一致,无需 imports:[AuthModule])
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';

// 二期评论后端三接口。无前缀:各方法写完整路径(全局 /api 自动加)。
@Controller()
export class CommentsController {
    constructor(private readonly commentsService: CommentsService) {}

    // 查看评论树:公开(不含 per-user 字段,无需登录)
    @Get('posts/:id/comments')
    async getComments(@Param('id') id: string) {
        return this.commentsService.findByPost(Number(id));
    }

    // 发评论/回复:需登录
    @Post('posts/:id/comments')
    @UseGuards(JwtAuthGuard)
    async createComment(
        @Param('id') id: string,
        @Body() dto: CreateCommentDto,
        @Req() req,
    ) {
        return this.commentsService.create(Number(id), req.user.id, dto);
    }

    // 删自己的评论:需登录
    @Delete('comments/:id')
    @UseGuards(JwtAuthGuard)
    async deleteComment(@Param('id') id: string, @Req() req) {
        return this.commentsService.remove(Number(id), req.user.id);
    }
}
