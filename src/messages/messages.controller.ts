import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';

@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  // Примечание: в проекте есть @CurrentUser() декоратор (src/auth/decorators/current-user.decorator.ts),
  // который является более чистой альтернативой @Req() для извлечения userId.
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Req() req: Request, @Body() createMessageDto: CreateMessageDto) {
    const userId = (req.user as { userId: string }).userId;
    return this.messagesService.create(userId, createMessageDto);
  }
}

