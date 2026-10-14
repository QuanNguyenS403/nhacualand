import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
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
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB/ảnh — khớp đúng giới hạn đã ghi trong skill 04

@ApiTags('listings')
@Controller('listings')
export class ListingsController {
  constructor(
    private readonly listingsService: ListingsService,
    private readonly uploadsService: UploadsService,
  ) {}

  @Public()
  @Get()
  findAll(@Query() query: QueryListingsDto) {
    return this.listingsService.findAll(query);
  }

  /**
   * Danh sách tin đăng của CHÍNH người gọi API (mọi trạng thái) — phục vụ trang "Quản lý tin".
   * PHÁT HIỆN QUA AUDIT (01/09/2026): endpoint này TRƯỚC ĐÂY HOÀN TOÀN CHƯA TỒN TẠI — người
   * dùng đăng tin xong không có cách nào trong app để xem lại tin của mình, phải nhờ admin
   * vào Prisma Studio tra thủ công. Đây là thiếu sót phá vỡ luồng lõi "Đăng tin → Quản lý tin".
   *
   * QUAN TRỌNG VỀ THỨ TỰ ROUTE: route này PHẢI khai báo TRƯỚC `@Get(':idOrSlug')` bên dưới.
   * NestJS khớp route theo thứ tự khai báo trong class — nếu đặt SAU, mọi request tới
   * "GET /listings/mine" sẽ bị route ":idOrSlug" khớp trước, biến "mine" thành giá trị idOrSlug
   * và không bao giờ tới được handler đúng (lỗi kinh điển khi thêm route tĩnh cạnh route động).
   */
  @ApiBearerAuth()
  @Get('mine')
  findMine(@CurrentUser() user: AuthUser, @Query() query: QueryMyListingsDto) {
    return this.listingsService.findMine(user.id, query);
  }

  /**
   * Danh sách BĐS đã lưu (SavedListing) của người dùng hiện tại — hoàn thiện mục 16 README.
   * Cần khai báo TRƯỚC :idOrSlug để không bị coi là param động.
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
   * Chỉ trả pin toạ độ và thông tin cần thiết nhất, có cache control ngắn (10s).
   * PHẢI khai báo TRƯỚC @Get(':idOrSlug') để không bị nuốt bởi param động.
   */
  @Public()
  @Get('map')
  getMapPins(@Query() query: QueryMapListingsDto) {
    return this.listingsService.getMapPins(query);
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
        // TRƯỚC ĐÂY: không có bước này — bất kỳ ai đăng nhập cũng upload được file bất kỳ định dạng
        // (kể cả .exe đổi đuôi) và dung lượng bất kỳ (có thể làm đầy ổ đĩa server). Đây là lỗ hổng
        // thật, không phải chỉ thiếu tính năng.
        if (!ACCEPTED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
          callback(new UnsupportedMediaTypeException('Chỉ chấp nhận ảnh định dạng JPEG, PNG hoặc WEBP.'), false);
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
    // BẢO MẬT (audit 02/09/2026): kiểm tra quyền sở hữu TRƯỚC KHI ghi file vào đĩa server.
    // Trước đây uploadsService.saveListingImages chạy trước, ghi hàng chục file và convert webp
    // vào ổ cứng rồi mới gọi assertOwnership, mở ra lỗ hổng làm tràn đĩa server (DoS).
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

