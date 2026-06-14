import { 
    Injectable,
    BadRequestException, // 错误处理
} from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateUserDto } from "./dto/create-users.dto";
import * as bcrypt from 'bcrypt';


@Injectable()
export class UsersService{
    constructor(private readonly prisma:PrismaService){}
    async register(createUserDto:CreateUserDto){
      const { name, password } = createUserDto;
    // console.log(name, "--------");
    const existingUser = await this.prisma.user.findUnique({
      where: {
        name
      }
    })
    if (existingUser) {
      // 抛出异常
      // nest 企业级框架 捕获并返回给用户错误信息
      // 弱类型，单线程，出错的话可能带来灾难性的后果
      // 
      throw new BadRequestException("用户名已存在")
    }
    // 10 是加密算法的强度
    const hashPassword = await bcrypt.hash(password, 10);
    // console.log(hashPassword, "--------");
    // console.log(await bcrypt.compare("223332",hashPassword))// ture

    const user = await this.prisma.user.create({
      data: {
        name,
        password: hashPassword,
      },
      select: {
        id: true,
        name: true,
        password: false,
      }
    })
    return user;
  }
  
}