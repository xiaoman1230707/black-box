import {
    IsString,
    IsArray,//message 数组，消息列表
    ValidateNested,
    IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class Message {
    @IsString()
    @IsNotEmpty()
    role:string;

    @IsString()
    @IsNotEmpty()
    content:string;
}

export class ChatDto{
    @IsString()
    @IsNotEmpty()
    id:string; // 对话列表id 唯一标识，一组对话，用于关联对话历史

    @IsArray()
    @ValidateNested({ each: true }) // 约定每个元素 都是 Message 类的实例
    @Type(() => Message) // 每个元素 都转换为 Message 类的实例
    messages: Message[];
}