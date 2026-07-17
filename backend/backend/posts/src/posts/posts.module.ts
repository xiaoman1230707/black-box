import { Module } from '@nestjs/common';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { EmbeddingModule } from '../embedding/embedding.module';

@Module({
    imports:[EmbeddingModule],
    controllers:[PostsController],
    providers:[PostsService],
})

export class PostsModule{

}