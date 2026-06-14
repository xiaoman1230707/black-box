import {
    Injectable,
} from '@nestjs/common';
import { PostQueryDto } from './dto/post-query.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PostsService{
    constructor(private prisma: PrismaService){}

    async findAll({page,limit,tag} : PostQueryDto){
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
        const [total,posts] =  await Promise.all([
            this.prisma.post.count({ where: tagFilter }),
            this.prisma.post.findMany({
                where: tagFilter,
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
        // 整备查询数据
        const data = posts.map(post=>({
            id:post.id,
            title:post.title,
            brief:post.content?post.content.substring(0,100):'',
            user:{
                id:post.user?.id,
                name:post.user?.name || '',
                avatar: `http://localhost:3000/uploads/avatar/resized/${post.user?.avatars[0]?.filename}-small.jpg`
            },
            tags:post.tags.map(tag=>(tag.tag.name)),
            totalLikes:post._count.likes,
            totalComments:post._count.comments,
            thumbnail:`http://localhost:3000/uploads/resized/${post.files[0]?.filename}-thumbnail.jpg` || ''
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

    async create(data:{
        title:string,
        content:string,
        userId:number
    }){
        return this.prisma.post.create({
            data:{
                title:data.title,
                content:data.content,
                userId:Number(data.userId),
            }
        })
    }

    async findOne(id: number){
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

        return {
            id: post.id,
            title: post.title,
            content: post.content,
            brief: post.content ? post.content.substring(0, 200) : '',
            publishedAt: new Date().toISOString(),
            user:{
                id: post.user?.id,
                name: post.user?.name || '',
                avatar: `http://localhost:3000/uploads/avatar/resized/${post.user?.avatars[0]?.filename}-small.jpg`
            },
            tags: post.tags.map(tag => tag.tag.name),
            totalLikes: post._count.likes,
            totalComments: post._count.comments,
            thumbnail: post.files[0] ? `http://localhost:3000/uploads/resized/${post.files[0]?.filename}-thumbnail.jpg` : ''
        }
    }
}