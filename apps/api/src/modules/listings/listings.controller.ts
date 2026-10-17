import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UnsupportedMediaTypeException,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { ListingsService } from './listings.service';
import { UploadsService } from '../uploads/uploads.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { QueryListingsDto } from './dto/query-listings.dto';
import { QueryMapListingsDto } from './dto/query-map-listings.dto';
import { QueryMyListingsDto } from './dto/query-my-listings.dto';
import { ReportListingDto } from './dto/report-listing.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ParseBigIntPipe } from '../../common/pipes/parse-bigint.pipe';

interface AuthUser {
  id: bigint;
  role: string;
}

const ACCEPTED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB/ảnh

@ApiTags('listings')
@Controller('listings')
export class ListingsController {
  constructor(
    private readonly listingsService: ListingsService,
    private readonly uploadsService: UploadsService,
    private readonly jwtService: JwtService,
  ) {}

  @Public()
  @Get()
  findAll(@Query() query: QueryListingsDto) {
    return this.listingsService.findAll(query);
  }

  /**
   * Thống kê số lượng tin đăng theo từng trạng thái của CHÍNH người gọi API
   */
  @ApiBearerAuth()
  @Get('mine/counts')
  getMineCounts(@CurrentUser() user: AuthUser) {
    return this.listingsService.getMineCounts(user.id);
  }

  /**
   * Danh sách tin đăng của CHÍNH người gọi API (mọi trạng thái)
   */
  @ApiBearerAuth()
  @Get('mine')
  findMine(@CurrentUser() user: AuthUser, @Query() query: QueryMyListingsDto) {
    return this.listingsService.findMine(user.id, query);
  }

  /**
   * Lấy danh sách ID các tin đăng mà người dùng hiện tại đã lưu
   */
  @ApiBearerAuth()
  @Get('saved/ids')
  getSavedIds(@CurrentUser() user: AuthUser) {
    return this.listingsService.getSavedIds(user.id);
  }

  /**
   * Danh sách BĐS đã lưu (SavedListing) của người dùng hiện tại
   */
  @ApiBearerAuth()
  @Get('saved/mine')
  findSaved(@CurrentUser() user: AuthUser, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.listingsService.findSaved(user.id, {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  /**
   * Endpoint bản đồ siêu nhẹ phục vụ /danh-gia và /thue.
   * Pin pending chỉ hiển thị cho chính chủ nhân dựa trên token JWT gửi kèm.
   */
  @Public()
  @Get('map')
  getMapPins(
    @Query() query: QueryMapListingsDto,
    @Headers('authorization') authHeader?: string,
  ) {
    let currentUserId: bigint | undefined;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const accessSecret = process.env.JWT_ACCESS_SECRET;
        if (accessSecret) {
          const payload = this.jwtService.verify(token, { secret: accessSecret }) as any;
          if (payload?.sub) {
            currentUserId = BigInt(payload.sub);
          }
        }
      } catch {
        // Token không hợp lệ thì coi như khách vãng lai
      }
    }
    return this.listingsService.getMapPins(query, currentUserId);
  }

  @Public()
  @Get(':idOrSlug')
  findOne(@Param('idOrSlug') idOrSlug: string) {
    return this.listingsService.findOne(idOrSlug);
  }

  @ApiBearerAuth()
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateListingDto) {
    return this.listingsService.create(user.id, dto);
  }

  @ApiBearerAuth()
  @Put(':id')
  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseBigIntPipe) id: bigint, @Body() dto: UpdateListingDto) {
    return this.listingsService.update(id, user, dto);
  }

  @ApiBearerAuth()
  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseBigIntPipe) id: bigint) {
    return this.listingsService.remove(id, user);
  }

  @ApiBearerAuth()
  @Patch(':id/rented')
  markAsRented(@CurrentUser() user: AuthUser, @Param('id', ParseBigIntPipe) id: bigint) {
    return this.listingsService.markAsRented(id, user);
  }

  /**
   * Gửi duyệt lại tin đăng đã bị từ chối
   */
  @ApiBearerAuth()
  @Post(':id/resubmit')
  resubmitListing(@CurrentUser() user: AuthUser, @Param('id', ParseBigIntPipe) id: bigint) {
    return this.listingsService.resubmitListing(id, user);
  }

  /**
   * Xác nhận phòng vẫn còn trống theo chu kỳ 7 ngày (§7, Gate E).
   */
  @ApiBearerAuth()
  @Post(':id/confirm-availability')
  confirmAvailability(@CurrentUser() user: AuthUser, @Param('id', ParseBigIntPipe) id: bigint) {
    return this.listingsService.confirmAvailability(id, user);
  }

  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @Post(':id/images')
  @UseInterceptors(
    FilesInterceptor('files', 20, {
      limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
      fileFilter: (_req, file, callback) => {
        if (!ACCEPTED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
          callback(new UnsupportedMediaTypeException('Chỉ chấp nhận ảnh định dạng JPEG, PNG hoặc WEBP'), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  async addImages(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseBigIntPipe) id: bigint,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Vui lòng chọn ít nhất 1 ảnh để tải lên');
    }
    await this.listingsService.assertOwnership(id, user);
    const currentCount = await this.listingsService.getImageCount(id);
    if (currentCount + files.length > 20) {
      throw new BadRequestException(
        `Một tin đăng chỉ được phép có tối đa 20 ảnh (hiện đã có ${currentCount} ảnh, không thể thêm ${files.length} ảnh nữa)`,
      );
    }
    const urls = await this.uploadsService.saveListingImages(id.toString(), files);
    return this.listingsService.addImages(id, user, urls);
  }

  /**
   * Lưu tin đăng (idempotent, không cho phép tự lưu tin của chính mình)
   */
  @ApiBearerAuth()
  @Put(':id/save')
  saveListing(@CurrentUser() user: AuthUser, @Param('id', ParseBigIntPipe) id: bigint) {
    return this.listingsService.saveListing(id, user.id);
  }

  /**
   * Bỏ lưu tin đăng (idempotent, luôn được phép bất kể trạng thái tin)
   */
  @ApiBearerAuth()
  @Delete(':id/save')
  unsaveListing(@CurrentUser() user: AuthUser, @Param('id', ParseBigIntPipe) id: bigint) {
    return this.listingsService.unsaveListing(id, user.id);
  }

  /**
   * Toggle lưu/bỏ lưu tin đăng (giữ lại tương thích ngược)
   */
  @ApiBearerAuth()
  @Post(':id/save')
  toggleSave(@CurrentUser() user: AuthUser, @Param('id', ParseBigIntPipe) id: bigint) {
    return this.listingsService.toggleSave(id, user.id);
  }

  @ApiBearerAuth()
  @Get(':id/is-saved')
  isSaved(@CurrentUser() user: AuthUser, @Param('id', ParseBigIntPipe) id: bigint) {
    return this.listingsService.isSaved(id, user.id);
  }

  @Public()
  @Get(':id/contact')
  getContact(@Param('id', ParseBigIntPipe) id: bigint) {
    return this.listingsService.getPublicContact(id);
  }

  @ApiBearerAuth()
  @Post(':id/reveal-phone')
  revealPhone(@CurrentUser() user: AuthUser, @Param('id', ParseBigIntPipe) id: bigint) {
    return this.listingsService.revealPhone(id, user.id);
  }

  @Public()
  @Post(':id/report')
  report(@Param('id', ParseBigIntPipe) id: bigint, @Body() dto: ReportListingDto) {
    return this.listingsService.report(id, dto.reason, dto.note);
  }
}
