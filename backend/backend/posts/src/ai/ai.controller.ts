import{
    Controller,
    Post,
    Body,
    Res,
    Get,
    Query,
} from '@nestjs/common';
import { AIService } from './ai.service';
import { ChatDto } from './dto/chat.dto';
import { SearchDto } from './dto/search.dto';

@Controller('ai')
export class AIController{
    constructor(private readonly aiService:AIService){}
    @Post('chat')
    async chat(@Body() chatDto: ChatDto,@Res() res){
        // console.log(chatDto);
        // return {
        //     chatDto
        // };
        // 设置响应头为 流式输出
        res.setHeader('Content-Type','text/event-stream');
        res.setHeader('Cache-Control','no-cache');// 不缓存 每次llm 都重新生成
        res.setHeader('Connection','keep-alive');// 保持连接 ，不关闭
        try{
            await this.aiService.chat(chatDto.messages,(token:string)=>{
                res.write(`0:${JSON.stringify(token)}\n`);
            });
            res.end();
        }catch(err){
            res.status(500).end();
        }
    }

    @Get('search')
    async search(@Query() dto:SearchDto){// 使用 @Query('keyword') —— 只取单个参数
        const {keyword} = dto;
        let decoded = decodeURIComponent(keyword);
        return this.aiService.search(decoded);
    }

    @Get('avatar')
    async avatar(@Query('name') name:string){
        return this.aiService.avatar(name);
    }

    @Post('rag')
    async rag(@Body() {question}:{question:string}){
        const answer = await this.aiService.rag(question);
        // console.log(answer,'////');
        return {
            code:0,
            answer
        }
    }

    @Post('git')
    async git(@Body() {diff}:{diff:string}){
        const commit = await this.aiService.git(diff);
        // console.log(answer,'////');
        return {
            code:0,
            commit
        }
    }
}