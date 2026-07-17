import {
  IsNotEmpty,
  IsString,
  MinLength,
  Matches,
} from 'class-validator';

export class CreateUserDto{
    @IsNotEmpty()
    @IsString()
    name:string;

    // 二期密码强度:≥8 位 + 含字母和数字(对齐前端强度条与 11.5 裁定)。登录 DTO 不动(保旧账号可登)。
    @IsNotEmpty()
    @IsString()
    @MinLength(8)
    @Matches(/(?=.*[A-Za-z])(?=.*\d)/, { message: '密码需包含字母和数字' })
    password:string;
}
