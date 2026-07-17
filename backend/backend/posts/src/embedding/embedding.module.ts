import { Module } from '@nestjs/common';
import { EmbeddingService } from './embedding.service';

// 三期·embedding 能力独立模块,exports 给 posts(发帖写入向量)与 ai(语义检索)显式 import 复用。
// 不走 @Global——让依赖方显式声明,依赖关系清晰(03 §3.2:优于全局隐藏依赖)。
@Module({
    providers: [EmbeddingService],
    exports: [EmbeddingService],
})
export class EmbeddingModule {}
