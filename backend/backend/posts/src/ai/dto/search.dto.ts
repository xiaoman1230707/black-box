import {
    IsString,
    IsNotEmpty,
} from 'class-validator';

export class SearchDto{
    @IsString({message:'keyword 必须为字符串'})
    @IsNotEmpty({message:'keyword is required'})
    keyword:string;
}