import { Injectable } from '@nestjs/common';
import type { Message } from './dto/chat.dto';
import { ChatDeepSeek } from '@langchain/deepseek';
import { SystemMessage, HumanMessage, AIMessage } from 'langchain';
import { OpenAIEmbeddings, DallEAPIWrapper } from '@langchain/openai';
import * as fs from 'fs/promises';
import * as path from 'path';
import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory';
import { Document } from 'langchain';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { PrismaService } from '../prisma/prisma.service';

interface Post{
    title:string;
    category:string;
    embedding:number[];
}

export function convertToLangChainMessages(messages:Message[])
:(HumanMessage | AIMessage | SystemMessage)[]{
    return messages.map(msg=>{
        switch(msg.role){
            case 'user':
                 return new HumanMessage(msg.content);
            case 'assistant':
                 return new AIMessage(msg.content);
            case 'system':
                 return new SystemMessage(msg.content);
            default:
                 throw new Error(`Unsupported role: ${msg.role}`);
        }
    })
}

export function cosineSimilarity(v1: number[], v2: number[]): number {
    const dotProduct = v1.reduce((sum, val, i) => sum + val * v2[i], 0);
    const normV1 = Math.sqrt(v1.reduce((sum, val) => sum + val * val, 0));
    const normV2 = Math.sqrt(v2.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (normV1 * normV2);
}

@Injectable()
export class AIService{
    private imagGenerator:DallEAPIWrapper;
    private posts:Post[] = [];
    private embeddings:OpenAIEmbeddings;
    private chatModel:ChatDeepSeek;
    constructor(private prisma: PrismaService){
        this.chatModel = new ChatDeepSeek({
            configuration:{
                apiKey:process.env.DEEPSEEK_API_KEY,
                baseURL:process.env.DEEPSEEK_BASE_URL,
            },
            model:'deepseek-chat',
            temperature:0.7,
            streaming:true,
        });
        this.embeddings = new OpenAIEmbeddings({
            configuration:{
                apiKey:process.env.OPENAI_API_KEY,
                baseURL:process.env.OPENAI_BASE_URL,
            },
            model:'text-embedding-ada-002',
        });
        this.loadPosts();
        this.imagGenerator = new DallEAPIWrapper({
            openAIApiKey:process.env.OPENAI_API_KEY,
            n:1,
            size:'1024x1024',
            quality:'standard',
        });
    }

    private async loadPosts(){
        try{
            // nestjs 会自动编译 ts -> js 放在 dist 目录下
            // 配置 nest-cli.json 中的 assets 选项为
            // {
            //     "include": "data/**/*",
            //     "outDir": "dist"
            // }
            // 所以 这里需要 ../../ 才能找到 dist 目录下的 data 目录
            const filePath = path.join(__dirname,'../../','data','posts-embedding.json');
            const data = await fs.readFile(filePath,'utf-8');
            // console.log(data,'data');
            this.posts = JSON.parse(data);
        }catch(err){
            console.error('Error loading posts:',err);
            this.posts = [];
        }
    }

    async chat(messages:Message[],onToken:(token:string)=>void){
        const langChainMessages = convertToLangChainMessages(messages);
        // console.log(langChainMessages,'????????');
        const stream = await this.chatModel.stream(langChainMessages);
        for await (const chunk of stream){
            const content = chunk.content as string; // 断言 内容一定为字符串
            // console.log(content,'///////');
            // 用模块化，回调传递 
            // service 层负责 数据处理(获取)
            // controller 层负责 响应(输出) res
            if(content){
                onToken(content);
            }
        }
    }

    async search(keyword:string,topK:number=3){
        try{
            const vector = await this.embeddings.embedQuery(keyword);
            const results = this.posts.map(post=>({
                ...post,
                similarity:cosineSimilarity(vector,post.embedding),
            })).sort((a,b)=>b.similarity-a.similarity)
            .slice(0,topK);

            const titles = results.map(r=>r.title);
            const dbPosts = await this.prisma.post.findMany({
                where:{
                    title: { in: titles },
                },
                include:{
                    user:{
                        select:{
                            id:true,
                            name:true,
                            avatars:{
                                select:{ filename:true }
                            }
                        }
                    },
                    tags:{
                        select:{
                            tag:{
                                select:{ id:true, name:true }
                            }
                        }
                    },
                    _count:{
                        select:{ likes:true, comments:true }
                    },
                    files:{
                        where:{ mimetype:{ startsWith:'image/' } },
                        select:{ filename:true }
                    }
                },
                orderBy:{ id:'desc' },
            });

            const orderedPosts = titles
                .map(title=>dbPosts.find(p=>p.title===title))
                .filter(Boolean)
                .map(post=>({
                    id: post!.id,
                    title: post!.title,
                    brief: post!.content ? post!.content.substring(0,100) : '',
                    publishedAt: new Date().toISOString(),
                    user:{
                        id: post!.user?.id,
                        name: post!.user?.name || '',
                        avatar: post!.user?.avatars[0]
                            ? `http://localhost:3000/uploads/avatar/resized/${post!.user!.avatars[0].filename}-small.jpg`
                            : '',
                    },
                    tags: post!.tags.map(t=>t.tag.name),
                    totalLikes: post!._count.likes,
                    totalComments: post!._count.comments,
                    thumbnail: post!.files[0]
                        ? `http://localhost:3000/uploads/resized/${post!.files[0].filename}-thumbnail.jpg`
                        : '',
                }));

            return {
                code:0,
                message:'success',
                data:orderedPosts,
            };
        }catch(error){
            console.error('Search error:', error);
            return {
                code:1,
                message:'search failed',
                data:[],
            };
        }
    }

    async avatar(name:string){
        const imgURL = await this.imagGenerator.invoke(`
            你是一位头像设计师，
            根据用户的姓名${name}，
            设计一个专业的头像。
            风格卡通，时尚，好看。
            `);
        // console.log(imgURL,'imgURL');
        return imgURL;
    }

    async rag(question:string){
   // google 
    // 知识库 embedding 
    // 内存向量数据库， 
    // 向量-> 向量存储 源文件（Document）this.embeddings(llm) 结果存储下来
    const vectorStore = await MemoryVectorStore.fromDocuments(
      [
        new Document({
          pageContent: "React是一个用于构建用户界面的JavaScript库"
        }),
        new Document({
          pageContent: "NestJS 是一个用于构建服务器应用的node.js框架，擅长企业级开发"
        }),
        new Document({
          pageContent: "RAG 通过检索外部知识增强大模型的回答能力"
        }),
      ],
      this.embeddings
    )
    // 相似度
    const docs = await vectorStore.similaritySearch(question, 1);
    console.log(docs);
    // llm chat 的上下文 增强Augument
    // 检索 retrieve
    const context = docs.map(d => d.pageContent).join('\n');
    // 增强 Augmented
    const prompt = `
      你是一个专业的JS工程师，请基于下面资料回答问题。
      资料：
      ${context}

      问题:
      ${question}
    `;
    // 生成 Generation
    const res = await this.chatModel.invoke(prompt);
    // console.log(res);
    return res.content;
  }

    async git(diff:string){
        const prompt = ChatPromptTemplate.fromMessages([
            ['system', `你是资深代码审核专家，请根据用户提供的 git diff 内容，生成一段符合 Conventional Commits 规范的提交日志。
        要求:
        1. 格式为 <type>(scope): <subject>
        2. 保持简洁
        3. 不要输出 markdown 格式，只输出文本
        4. 类型 (type) 必须是以下之一:
          feat: 新增功能
          fix: 修复 bug
          docs: 文档更新（如 README）
          style: 代码格式调整（不影响逻辑，如空格、分号）
          refactor: 重构代码（既不是新增功能，也不是修复 bug）
          perf: 性能优化
          test: 添加或修改测试用例
          build: 影响构建系统或外部依赖的改动（如 npm、Webpack）
          ci: 持续集成配置文件和脚本改动（如 GitHub Actions、Docker）
          chore: 其他杂项维护工作（如代码格式化、依赖升级）
          revert: 回滚之前的 commit
          release: 版本发布相关提交
      `],
             ["user", "{diff_content}"]
        ]);
        const chain = prompt.pipe(this.chatModel).pipe(new StringOutputParser());
        const res = await chain.invoke({diff_content:diff});
        return res;
    }
}