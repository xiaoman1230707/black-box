import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import sharp from 'sharp';
import { promises as fs } from 'fs';
import { join } from 'path';
import { publicMediaUrl } from '../config/public-url';

// 二期文件上传(依据 docs/design/02-phase2-social.md §五)。
// 落点:头像 uploads/avatar/resized/{base}-small|large.jpg;帖子图 缩略 uploads/resized/{base}-thumbnail.jpg、原图 uploads/{base}.jpg。
const UPLOAD_ROOT = join(process.cwd(), 'uploads');
const AVATAR_DIR = join(UPLOAD_ROOT, 'avatar', 'resized');
const THUMB_DIR = join(UPLOAD_ROOT, 'resized');
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

@Injectable()
export class UploadService {
    constructor(private readonly prisma: PrismaService) {}

    // 文件名基名:时间戳 + 随机后缀,避免碰撞
    private genBase(): string {
        return `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    }

    // 统一校验:存在 / 是图片 / 不超过 5MB,否则 400
    private validate(file?: Express.Multer.File): asserts file is Express.Multer.File {
        if (!file) throw new BadRequestException('未接收到文件');
        if (!file.mimetype?.startsWith('image/')) throw new BadRequestException('仅支持图片文件');
        if (file.size > MAX_SIZE) throw new BadRequestException('文件大小不能超过 5MB');
    }

    // POST /api/upload/avatar —— 头像:输出 small/large 两档;替换语义(事务删旧建新)
    async uploadAvatar(file: Express.Multer.File, userId: number | string) {
        this.validate(file);
        const base = this.genBase();
        await fs.mkdir(AVATAR_DIR, { recursive: true });
        try {
            await Promise.all([
                sharp(file.buffer).resize(100, 100, { fit: 'cover' }).jpeg().toFile(join(AVATAR_DIR, `${base}-small.jpg`)),
                sharp(file.buffer).resize(400, 400, { fit: 'cover' }).jpeg().toFile(join(AVATAR_DIR, `${base}-large.jpg`)),
            ]);
        } catch {
            throw new BadRequestException('图片处理失败，请确认文件是有效图片');
        }
        const uid = Number(userId); // §9.1 通则:JWT sub 为字符串,写 Prisma Int 须转 Number
        // 事务:删该用户旧头像记录 + 建新(磁盘旧文件暂留,清理归四期),保证 avatars[0] 恒为当前
        const [, avatar] = await this.prisma.$transaction([
            this.prisma.avatar.deleteMany({ where: { userId: uid } }),
            this.prisma.avatar.create({
                data: { mimetype: 'image/jpeg', filename: base, size: file.size, userId: uid },
            }),
        ]);
        return { id: avatar.id, url: publicMediaUrl(`avatar/resized/${base}-small.jpg`) };
    }

    // POST /api/upload/image —— 帖子图:缩略(宽400)+ 原图;写 File 表(postId 留空,发帖时回填)
    async uploadImage(file: Express.Multer.File, userId: number | string) {
        this.validate(file);
        const base = this.genBase();
        await Promise.all([fs.mkdir(UPLOAD_ROOT, { recursive: true }), fs.mkdir(THUMB_DIR, { recursive: true })]);
        let width = 0;
        let height = 0;
        try {
            const meta = await sharp(file.buffer).metadata();
            if (!meta.width || !meta.height) throw new Error('no dimensions');
            width = meta.width;
            height = meta.height;
            await Promise.all([
                sharp(file.buffer).jpeg().toFile(join(UPLOAD_ROOT, `${base}.jpg`)), // 原图(转 jpg、去 EXIF)
                sharp(file.buffer).resize(400).jpeg().toFile(join(THUMB_DIR, `${base}-thumbnail.jpg`)), // 缩略宽400等比
            ]);
        } catch {
            throw new BadRequestException('图片处理失败，请确认文件是有效图片');
        }
        const uid = Number(userId);
        const created = await this.prisma.file.create({
            data: {
                originalname: file.originalname,
                mimetype: 'image/jpeg',
                filename: base,
                size: file.size,
                width,
                height,
                userId: uid,
                // postId 省略 = null,发帖时回填
            },
        });
        return {
            id: created.id,
            url: publicMediaUrl(`${base}.jpg`),
            thumbnailUrl: publicMediaUrl(`resized/${base}-thumbnail.jpg`),
        };
    }
}
