import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { publicMediaUrl } from '../config/public-url';

// 二期评论后端:两层树(顶层 + replies),嵌套限 2 层。
// 依据 docs/design/02-phase2-social.md §三。
@Injectable()
export class CommentsService {
    constructor(private readonly prisma: PrismaService) {}

    // 头像 URL 三元判空(对齐 §八#3 修复模式,不写出 undefined-small.jpg)。
    private avatarUrl(filename?: string | null): string {
        return filename
            ? publicMediaUrl(`avatar/resized/${filename}-small.jpg`)
            : '';
    }

    // 单条评论 → 节点(不含 replies,由 findByPost 组装)
    private toNode(c: {
        id: number;
        content: string | null;
        user: { id: number; name: string; avatars: { filename: string }[] } | null;
    }) {
        return {
            id: c.id,
            content: c.content ?? '',
            user: {
                id: c.user?.id,
                name: c.user?.name || '',
                avatar: this.avatarUrl(c.user?.avatars[0]?.filename),
            },
            replies: [] as ReturnType<CommentsService['toNode']>[],
        };
    }

    // GET /api/posts/:id/comments —— 两层树。一次查询 + 内存分组,避免 N+1。
    async findByPost(postId: number) {
        const comments = await this.prisma.comment.findMany({
            where: { postId },
            orderBy: { id: 'asc' }, // Comment 无 createdAt,自增 id ≈ 时间序(§3.3)
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        avatars: { select: { filename: true } },
                    },
                },
            },
        });

        // 先建所有顶层节点的索引,再把回复挂到对应顶层
        const topMap = new Map<number, ReturnType<CommentsService['toNode']>>();
        const items: ReturnType<CommentsService['toNode']>[] = [];
        for (const c of comments) {
            if (c.parentId === null) {
                const node = this.toNode(c);
                topMap.set(c.id, node);
                items.push(node);
            }
        }
        for (const c of comments) {
            if (c.parentId !== null) {
                const top = topMap.get(c.parentId);
                if (top) top.replies.push(this.toNode(c));
            }
        }
        return { items };
    }

    // POST /api/posts/:id/comments —— 发评论/回复(需登录)
    async create(postId: number, userId: number, dto: CreateCommentDto) {
        // req.user.id 源自 JWT payload.sub(字符串),Prisma 需 Int,显式转换(对齐 posts.service.create)
        const uid = Number(userId);
        // 帖子需存在
        const post = await this.prisma.post.findUnique({ where: { id: postId } });
        if (!post) throw new NotFoundException('帖子不存在');

        // 规整 parentId:保证只有两层
        let parentId: number | null = null;
        if (dto.parentId !== undefined && dto.parentId !== null) {
            const parent = await this.prisma.comment.findUnique({
                where: { id: dto.parentId },
            });
            if (!parent) throw new NotFoundException('父评论不存在');
            if (parent.postId !== postId)
                throw new BadRequestException('父评论不属于该帖子');
            // 若父评论本身是回复,则挂到其所属顶层;否则父评论即顶层
            parentId = parent.parentId !== null ? parent.parentId : parent.id;
        }

        const created = await this.prisma.comment.create({
            data: { content: dto.content, postId, userId: uid, parentId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        avatars: { select: { filename: true } },
                    },
                },
            },
        });
        return this.toNode(created);
    }

    // DELETE /api/comments/:id —— 删自己的评论(Cascade 自动删 replies)
    async remove(id: number, userId: number) {
        const uid = Number(userId); // 同 create:JWT sub 为字符串,需转 Int 再比较
        const comment = await this.prisma.comment.findUnique({ where: { id } });
        if (!comment) throw new NotFoundException('评论不存在');
        if (comment.userId !== uid)
            throw new ForbiddenException('只能删除自己的评论');
        await this.prisma.comment.delete({ where: { id } });
        return { success: true };
    }
}
