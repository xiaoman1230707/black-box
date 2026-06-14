import { Controller ,Get,Post,Body} from '@nestjs/common'
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-users.dto';

@Controller('users')
export class UsersController{
    constructor(private readonly usersService:UsersService){}

    @Post('register')
    async register(@Body() createUserDto:CreateUserDto){
        return this.usersService.register(createUserDto);
    }
}