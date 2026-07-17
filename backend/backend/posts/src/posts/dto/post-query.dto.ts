import {
    IsOptional,
    IsInt,
    Min,
    IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PostQueryDto{
    @IsOptional()
    @Type(()=>Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(()=>Number)
    @IsInt()
    @Min(1)
    limit?: number = 10;

    @IsOptional()
    @IsString()
    tag?: string;

    // 三期§六:按游戏筛选(可选,与 tag AND 叠加)。命中 Post.gameId(有 @@index)
    @IsOptional()
    @Type(()=>Number)
    @IsInt()
    @Min(1)
    gameId?: number;
}