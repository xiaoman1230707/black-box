import {
  Controller,
  Post,
  Body,
  Res,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AIService } from './ai.service';
import { ChatDto } from './dto/chat.dto';
import { SearchDto } from './dto/search.dto';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { runtimeRouteThrottle } from '../security/rate-limit.config';
import { UseRateLimitIdentity } from '../security/rate-limit-identity.decorator';
import { isAIRequestTimeoutError } from './ai-timeout';

const AI_TIMEOUT_MESSAGE = 'AI 服务响应超时，请稍后重试';
const AI_ERROR_MESSAGE = 'AI 服务暂时不可用，请稍后重试';

@Controller('ai')
export class AIController {
  constructor(private readonly aiService: AIService) {}
  @Post('chat')
  @Throttle(runtimeRouteThrottle('aiChat'))
  @UseRateLimitIdentity('user-or-ip')
  @UseGuards(JwtAuthGuard) // 三期:登录才可用(纯鉴权,不取 req.user;前端带 token 见 §五)
  async chat(@Body() chatDto: ChatDto, @Res() res: Response) {
    // console.log(chatDto);
    // return {
    //     chatDto
    // };
    // §五 SSE 对齐 @ai-sdk/react@1.2.12 data stream protocol:
    //   x-vercel-ai-data-stream:v1 头 + text part(0:) + finish part(d:)。具体字节以握手实测为准。
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('x-vercel-ai-data-stream', 'v1');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    try {
      await this.aiService.chat(
        chatDto.messages,
        (token: string) => {
          res.write(`0:${JSON.stringify(token)}\n`);
        },
        // §5.4 引用:message annotation part(8:),在 text part 前写出,
        //   附到当前 assistant 消息的 annotations(前端渲染为可点帖子 chip)。
        (citations) => {
          res.write(`8:${JSON.stringify(citations)}\n`);
        },
      );
      // finish message part(流结束标记;usage 暂占位,chat service 未返回真实 token 数)
      res.write(
        `d:${JSON.stringify({ finishReason: 'stop', usage: { promptTokens: 0, completionTokens: 0 } })}\n`,
      );
      res.end();
    } catch (err) {
      const isTimeout = isAIRequestTimeoutError(err);
      const message = isTimeout ? AI_TIMEOUT_MESSAGE : AI_ERROR_MESSAGE;

      if (res.headersSent) {
        res.write(`3:${JSON.stringify(message)}\n`);
        res.end();
        return;
      }

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.status(isTimeout ? 504 : 500).json({
        statusCode: isTimeout ? 504 : 500,
        code: isTimeout ? 'AI_TIMEOUT' : 'AI_UNAVAILABLE',
        message,
      });
    }
  }

  @Get('search')
  @Throttle(runtimeRouteThrottle('aiSearch'))
  @UseRateLimitIdentity('user-or-ip')
  @UseGuards(JwtAuthGuard) // 三期:登录才可用(纯鉴权,不取 req.user)
  async search(@Query() dto: SearchDto) {
    // 使用 @Query('keyword') —— 只取单个参数
    const { keyword } = dto;
    const decoded = decodeURIComponent(keyword);
    return this.aiService.search(decoded);
  }
}
