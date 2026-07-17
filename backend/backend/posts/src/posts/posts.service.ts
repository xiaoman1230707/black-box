import {
    Injectable,
    BadRequestException,
} from '@nestjs/common';
import { PostQueryDto } from './dto/post-query.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { PrismaService } from '../prisma/prisma.service';
import { EmbeddingService } from '../embedding/embedding.service';
import { publicMediaUrl } from '../config/public-url';

@Injectable()
export class PostsService{
    constructor(private prisma: PrismaService, private embedding: EmbeddingService){}

    async findAll({page,limit,tag,gameId} : PostQueryDto, userId?: number){
        const skip = ((page || 1) - 1) * (limit || 10);
        const tagFilter = tag && tag !== 'all'
            ? {
                tags: {
                    some: {
                        tag: {
                            name: tag
                        }
                    }
                }
              }
            : {};
        // 三期§六:按游戏筛选(可选),与 tagFilter AND 叠加;count 与 findMany 共用同一 where
        const gameFilter = gameId ? { gameId } : {};
        const where = { ...tagFilter, ...gameFilter };
        const [total,posts] =  await Promise.all([
            this.prisma.post.count({ where }),
            this.prisma.post.findMany({
                where,
                skip,
                take: limit,
                orderBy:{id:'desc'},
                include:{ // 关系型的数据
                    user:{
                        select:{// 只要那些字段
                            id:true,
                            name:true,
                            avatars:{
                                select: {
                                    filename:true,
                                }
                            }
                        }
                    },
                    tags:{
                        select:{
                           tag:{
                                select:{
                                    id:true,
                                    name:true,
                                }
                           }
                        }
                    },
                    _count:{// 计数
                        select:{
                            likes:true,
                            comments:true,
                        }
                    },
                    files:{
                        where:{
                            mimetype:{ startsWith:'image/' }// 必须以image开头
                        },
                        select:{filename:true}
                    }
                }
            })
        ]);
        // likedByMe:登录态一次性批量查本页这批 postId 的点赞记录(避免 N+1);匿名不查、全 false
        let likedSet = new Set<number>();
        if (userId) {
            const liked = await this.prisma.userLikePost.findMany({
                where: { userId, postId: { in: posts.map(p => p.id) } },
                select: { postId: true },
            });
            likedSet = new Set(liked.map(l => l.postId));
        }
        // 整备查询数据
        const data = posts.map(post=>({
            id:post.id,
            title:post.title,
            brief:post.content?post.content.substring(0,100):'',
            publishedAt: post.createdAt.toISOString(), // 真实时间(替代列表此前缺失)
            viewCount: post.viewCount,                 // 真实浏览量(二期不自增,恒为现值)
            user:{
                id:post.user?.id,
                name:post.user?.name || '',
                // 头像三元判空,无头像返回 '',不再 undefined-small.jpg
                avatar: post.user?.avatars[0]?.filename
                    ? publicMediaUrl(`avatar/resized/${post.user.avatars[0].filename}-small.jpg`)
                    : ''
            },
            tags:post.tags.map(tag=>(tag.tag.name)),
            totalLikes:post._count.likes,
            totalComments:post._count.comments,
            likedByMe: userId ? likedSet.has(post.id) : false,
            // thumbnail 三元判空(原 `... || ''` 对模板恒真、失效)
            thumbnail: post.files[0]?.filename
                ? publicMediaUrl(`resized/${post.files[0].filename}-thumbnail.jpg`)
                : ''
        }))
        return {
            items:data,
            total,
        }
    }

    async findAllTags(){
        return this.prisma.tag.findMany({
            orderBy: { id: 'asc' },
            select: { id: true, name: true },
        });
    }

    // 发帖(二期扩展):收 gameId/tagIds/fileIds。userId 由 controller 传入(已 Number)。
    // 最小校验防脏 id 触发外键 500:gameId 不存在→400;tagIds 只关联真实存在的(脏 id 静默忽略);
    // fileIds 回填 where 限本人(不存在/他人的不匹配即跳过,不会 500)。
    async create(dto: CreatePostDto, userId: number){
        const { title, content, gameId, tagIds, fileIds } = dto;

        // gameId:传了就必须存在,否则 400(单个查询,成本低)
        if (gameId !== undefined && gameId !== null) {
            const game = await this.prisma.game.findUnique({ where: { id: gameId } });
            if (!game) throw new BadRequestException('游戏不存在');
        }

        // tagIds:只关联真实存在的(防 nested create 遇脏 tagId 外键 500)
        let validTagIds: number[] = [];
        if (tagIds?.length) {
            const existing = await this.prisma.tag.findMany({
                where: { id: { in: tagIds } },
                select: { id: true },
            });
            validTagIds = existing.map(t => t.id);
        }

        const post = await this.prisma.post.create({
            data: {
                title,
                content,
                userId,
                ...(gameId ? { gameId } : {}),
                ...(validTagIds.length ? { tags: { create: validTagIds.map(tagId => ({ tagId })) } } : {}),
            },
        });

        // fileIds 回填 postId,where 限本人(防回填他人文件;不存在的 id 不匹配即跳过)
        if (fileIds?.length) {
            await this.prisma.file.updateMany({
                where: { id: { in: fileIds }, userId },
                data: { postId: post.id },
            });
        }

        // 三期·标题向量(同步 await,失败不阻塞发帖):为 title 生成 embedding 写入 titleEmbedding。
        // embedding 是外部调用、可能慢/失败 → try/catch 吞错、留 null、记日志、发帖照常成功(绝不 throw)。
        // 失败项可由 backfill-embeddings 脚本补;搜索时 null 不参与余弦。
        try {
            const vec = await this.embedding.embed(title);
            await this.prisma.post.update({
                where: { id: post.id },
                data: { titleEmbedding: vec },
            });
        } catch (e) {
            console.error(`[embedding] 发帖向量生成失败,titleEmbedding 留 null(发帖不受影响) postId=${post.id}:`, e);
        }

        return { id: post.id };
    }

    async findOne(id: number, userId?: number){
        const post = await this.prisma.post.findUnique({
            where: { id: Number(id) },
            include:{
                user:{
                    select:{
                        id:true,
                        name:true,
                        avatars:{
                            select: { filename:true }
                        }
                    }
                },
                tags:{
                    select:{
                        tag:{
                            select:{
                                id:true,
                                name:true,
                            }
                        }
                    }
                },
                _count:{
                    select:{
                        likes:true,
                        comments:true,
                    }
                },
                files:{
                    where:{
                        mimetype:{ startsWith:'image/' }
                    },
                    select:{filename:true}
                }
            }
        });

        if(!post) return null;

        // likedByMe:登录态查单条点赞记录是否存在;匿名 false、不查库
        const likedByMe = userId
            ? !!(await this.prisma.userLikePost.findUnique({
                  where: { userId_postId: { userId, postId: id } },
              }))
            : false;

        return {
            id: post.id,
            title: post.title,
            content: post.content,
            brief: post.content ? post.content.substring(0, 200) : '',
            publishedAt: post.createdAt.toISOString(), // 真实时间(替代伪造的 new Date())
            viewCount: post.viewCount,                 // 真实浏览量(二期不自增)
            user:{
                id: post.user?.id,
                name: post.user?.name || '',
                // 头像三元判空,无头像返回 '',不再 undefined-small.jpg
                avatar: post.user?.avatars[0]?.filename
                    ? publicMediaUrl(`avatar/resized/${post.user.avatars[0].filename}-small.jpg`)
                    : ''
            },
            tags: post.tags.map(tag => tag.tag.name),
            totalLikes: post._count.likes,
            totalComments: post._count.comments,
            likedByMe,
            thumbnail: post.files[0] ? publicMediaUrl(`resized/${post.files[0].filename}-thumbnail.jpg`) : ''
        }
    }

    // 点赞(幂等):写 UserLikePost,重复点赞不报错。userId 由 controller 传入(已 Number 转换)
    async like(postId: number, userId: number){
        await this.prisma.userLikePost.upsert({
            where: { userId_postId: { userId, postId } },
            create: { userId, postId },
            update: {},
        });
        const totalLikes = await this.prisma.userLikePost.count({ where: { postId } });
        return { liked: true, totalLikes };
    }

    // 取消点赞(静默):不存在时不报错
    async unlike(postId: number, userId: number){
        await this.prisma.userLikePost.deleteMany({ where: { userId, postId } });
        const totalLikes = await this.prisma.userLikePost.count({ where: { postId } });
        return { liked: false, totalLikes };
    }
}
