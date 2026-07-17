import {
    IsNotEmpty,
    IsString,
    MaxLength,
    IsOptional,
    IsInt,
} from 'class-validator';

// 二期评论:发评论入参(POST /api/posts/:id/comments)
export class CreateCommentDto {
    @IsNotEmpty()
    @IsString()
    @MaxLength(1000)
    content: string;

    // 可选:回复某条评论。指向回复时,service 会规整到所属顶层(保证只两层)
    @IsOptional()
    @IsInt()
    parentId?: number;
}
