import {
    Controller,
    Get,
    Query,
    Post,
    Body,
    UseGuards,
    Req,
    Param,
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { PostQueryDto } from './dto/post-query.dto';
// 鉴权目录下的路由守卫
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';



@Controller('/posts')
export class PostsController{
    constructor(private readonly postsService:PostsService){}

    @Get()
    async getPosts(@Query() query: PostQueryDto){
        return this.postsService.findAll(query)
    }

    @Get('tags')
    async getTags(){
        return this.postsService.findAllTags();
    }

    // 获取单篇文章
    @Get(':id')
    async getPostById(@Param('id') id: string){
        return this.postsService.findOne(Number(id))
    }

    // 发布文章的处理函数
    // 不需要设置路由，因为在posts下的Post方法不会冲突
    // restful 风格 一切皆资源
    @Post()
    @UseGuards(JwtAuthGuard) // 守卫 保护路由
    async createPost(
        @Body("title") title:string,
        @Body("content") content:string,
        @Req() req,
    ){
        // console.log(req)
        return this.postsService.create({
            title,
            content,
            userId:req.user.id,
        })
    }
}
