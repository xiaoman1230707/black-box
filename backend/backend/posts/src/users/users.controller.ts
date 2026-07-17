import { Controller ,Get,Post,Body} from '@nestjs/common'
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-users.dto';
import { Throttle } from '@nestjs/throttler';
import { runtimeRouteThrottle } from '../security/rate-limit.config';

@Controller('users')
export class UsersController{
    constructor(private readonly usersService:UsersService){}

    @Post('register')
  @Throttle(runtimeRouteThrottle('register'))
    async register(@Body() createUserDto:CreateUserDto){
        return this.usersService.register(createUserDto);
    }
}
