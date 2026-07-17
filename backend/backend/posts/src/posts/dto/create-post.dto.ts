import {
    IsNotEmpty,
    IsString,
    MaxLength,
    IsOptional,
    IsInt,
    IsArray,
} from 'class-validator';

// 二期发帖扩展入参(POST /api/posts)。依据 docs/design/02-phase2-social.md §六。
export class CreatePostDto {
    @IsNotEmpty()
    @IsString()
    @MaxLength(255)
    title: string;

    // 正文纯文本,业务层必填(schema 虽 String? 可空,发帖要求有正文)
    @IsNotEmpty()
    @IsString()
    content: string;

    @IsOptional()
    @IsInt()
    gameId?: number;

    // 内容类型 tag(多选,决议 I)
    @IsOptional()
    @IsArray()
    @IsInt({ each: true })
    tagIds?: number[];

    // 已上传图片 id(POST /upload/image 返回),发帖时回填 postId
    @IsOptional()
    @IsArray()
    @IsInt({ each: true })
    fileIds?: number[];
}
