import { PrismaClient } from '@prisma/client';
import { OpenAIEmbeddings } from '@langchain/openai';
import * as fs from 'fs/promises';
import * as path from 'path';

interface Post {
    postId: number;
    title: string;
    category: string;
    embedding: number[];
}

async function regenerateEmbeddings() {
    const prisma = new PrismaClient();
    const embeddings = new OpenAIEmbeddings({
        configuration: {
            apiKey: process.env.OPENAI_API_KEY,
            baseURL: process.env.OPENAI_BASE_URL,
        },
        model: 'text-embedding-ada-002',
    });

    try {
        // 获取所有帖子
        const posts = await prisma.post.findMany({
            include: {
                tags: {
                    include: {
                        tag: true
                    }
                }
            }
        });

        console.log(`Found ${posts.length} posts`);

        const embeddingsData: Post[] = [];

        for (const post of posts) {
            // 使用标题和标签生成 embedding
            const tagNames = post.tags.map(t => t.tag.name).join(', ');
            const textToEmbed = `${post.title} ${tagNames} ${post.content?.substring(0, 200) || ''}`;

            console.log(`Generating embedding for: ${post.title}`);

            try {
                const embedding = await embeddings.embedQuery(textToEmbed);

                embeddingsData.push({
                    postId: post.id,
                    title: post.title,
                    category: tagNames || 'general',
                    embedding: embedding,
                });
            } catch (err) {
                console.error(`Error embedding post ${post.id}:`, err);
            }
        }

        // 保存到文件
        const filePath = path.join(__dirname, '../data/posts-embedding.json');
        await fs.writeFile(filePath, JSON.stringify(embeddingsData, null, 2), 'utf-8');

        console.log(`Successfully saved ${embeddingsData.length} embeddings to ${filePath}`);

    } finally {
        await prisma.$disconnect();
    }
}

regenerateEmbeddings().catch(console.error);
