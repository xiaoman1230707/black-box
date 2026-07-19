import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PostPageQueryDto } from './post-page-query.dto';

export class PostQueryDto extends PostPageQueryDto {
  @IsOptional()
  @IsString()
  tag?: string;

  // 三期§六:按游戏筛选(可选,与 tag AND 叠加)。命中 Post.gameId(有 @@index)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  gameId?: number;
}
