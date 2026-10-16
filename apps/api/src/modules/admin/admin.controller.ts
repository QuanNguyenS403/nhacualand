import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ParseBigIntPipe } from '../../common/pipes/parse-bigint.pipe';
import { RejectListingDto } from './dto/reject-listing.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';
import { QueryAdminListingsDto } from './dto/query-admin-listings.dto';
import { QueryAdminReportsDto } from './dto/query-admin-reports.dto';
import { QueryAdminUsersDto } from './dto/query-admin-users.dto';
import { AdminCapability, RequireAdminMfa, RequireCapabilities } from '../../common/decorators/capabilities.decorator';

interface AuthUser {
  id: bigint;
  role: string;
}

@ApiTags('admin')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @ApiOperation({ summary: 'Thống kê tổng quan Dashboard (3 bảng MONEY / GROWTH / RISK theo §8.1)' })
  @RequireCapabilities(
    AdminCapability.LISTINGS_MODERATE,
    AdminCapability.FINANCE_MANAGE,
    AdminCapability.SYSTEM_ADMIN,
    AdminCapability.LEADS_SUPPORT,
  )
  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboard();
  }

  @ApiOperation({ summary: 'Kích hoạt quét dọn tin quá hạn và OTP thủ công' })
  @RequireCapabilities(AdminCapability.SYSTEM_ADMIN)
  @Post('tasks/run-sweep')
  runSweep() {
    return this.adminService.runSweep();
  }

  @ApiOperation({ summary: 'Danh sách tin đăng chờ duyệt' })
  @RequireCapabilities(AdminCapability.LISTINGS_MODERATE)
  @Get('listings/pending')
  getPendingListings(@Query() query: QueryAdminListingsDto) {
    return this.adminService.getPendingListings(query);
  }

  @ApiOperation({ summary: 'Duyệt tin đăng (POST/PATCH)' })
  @RequireCapabilities(AdminCapability.LISTINGS_MODERATE)
  @Post('listings/:id/approve')
  approveListing(@CurrentUser() admin: AuthUser, @Param('id', ParseBigIntPipe) id: bigint) {
    return this.adminService.approveListing(id, admin.id);
  }

  @RequireCapabilities(AdminCapability.LISTINGS_MODERATE)
  @Patch('listings/:id/approve')
  approveListingPatch(@CurrentUser() admin: AuthUser, @Param('id', ParseBigIntPipe) id: bigint) {
    return this.adminService.approveListing(id, admin.id);
  }

  @ApiOperation({ summary: 'Từ chối tin đăng (POST/PATCH)' })
  @RequireCapabilities(AdminCapability.LISTINGS_MODERATE)
  @Post('listings/:id/reject')
  rejectListing(
    @CurrentUser() admin: AuthUser,
    @Param('id', ParseBigIntPipe) id: bigint,
    @Body() dto: RejectListingDto,
  ) {
    const finalReason = dto.reason ?? dto.rejectionReason ?? 'Vi phạm quy định kiểm duyệt';
    return this.adminService.rejectListing(id, finalReason, admin.id);
  }

  @RequireCapabilities(AdminCapability.LISTINGS_MODERATE)
  @Patch('listings/:id/reject')
  rejectListingPatch(
    @CurrentUser() admin: AuthUser,
    @Param('id', ParseBigIntPipe) id: bigint,
    @Body() dto: RejectListingDto,
  ) {
    const finalReason = dto.reason ?? dto.rejectionReason ?? 'Vi phạm quy định kiểm duyệt';
    return this.adminService.rejectListing(id, finalReason, admin.id);
  }

  @ApiOperation({ summary: 'Admin đánh dấu tin đã xác thực thực tế (Giai đoạn 2 Trust-as-a-Service)' })
  @RequireCapabilities(AdminCapability.LISTINGS_MODERATE)
  @Post('listings/:id/verify')
  verifyListing(@CurrentUser() admin: AuthUser, @Param('id', ParseBigIntPipe) id: bigint) {
    return this.adminService.verifyListing(id, admin.id);
  }

  @ApiOperation({ summary: 'Admin huỷ nhãn xác thực thực tế' })
  @RequireCapabilities(AdminCapability.LISTINGS_MODERATE)
  @Post('listings/:id/unverify')
  unverifyListing(@CurrentUser() admin: AuthUser, @Param('id', ParseBigIntPipe) id: bigint) {
    return this.adminService.unverifyListing(id, admin.id);
  }

  @ApiOperation({ summary: 'Danh sách báo cáo vi phạm' })
  @RequireCapabilities(AdminCapability.LISTINGS_MODERATE)
  @Get('reports')
  getReports(@Query() query: QueryAdminReportsDto) {
    return this.adminService.getReports(query);
  }

  @ApiOperation({ summary: 'Xử lý báo cáo vi phạm (gỡ tin hoặc bỏ qua)' })
  @RequireCapabilities(AdminCapability.LISTINGS_MODERATE)
  @Post('reports/:id/resolve')
  resolveReport(@Param('id', ParseBigIntPipe) id: bigint, @Body() dto: ResolveReportDto) {
    return this.adminService.resolveReport(id, dto.action);
  }

  @ApiOperation({ summary: 'Danh sách người dùng' })
  @RequireCapabilities(AdminCapability.SYSTEM_ADMIN)
  @Get('users')
  getUsers(@Query() query: QueryAdminUsersDto) {
    return this.adminService.getUsers(query);
  }

  @ApiOperation({ summary: 'Khóa hoặc mở khóa tài khoản người dùng - Yêu cầu MFA' })
  @RequireCapabilities(AdminCapability.SYSTEM_ADMIN)
  @RequireAdminMfa()
  @Post('users/:id/toggle-block')
  toggleBlockUser(@CurrentUser() admin: AuthUser, @Param('id', ParseBigIntPipe) id: bigint) {
    return this.adminService.toggleBlockUser(id, admin.id);
  }

  @ApiOperation({ summary: 'Danh sách sự kiện Outbox trong Dead Letter Queue (FAILED)' })
  @RequireCapabilities(AdminCapability.SYSTEM_ADMIN)
  @Get('outbox/dlq')
  getOutboxDlq(@Query('page') page = '1', @Query('pageSize') pageSize = '20') {
    return this.adminService.getOutboxDlq(Number(page) || 1, Number(pageSize) || 20);
  }

  @ApiOperation({ summary: 'Thử lại sự kiện trong Dead Letter Queue' })
  @RequireCapabilities(AdminCapability.SYSTEM_ADMIN)
  @Post('outbox/dlq/:id/retry')
  retryOutboxDlq(@Param('id', ParseBigIntPipe) id: bigint) {
    return this.adminService.retryOutboxDlq(id);
  }

  @Post('agreements')
  createAgreement(@Body() body: any) {
    return this.adminService.createOwnerAgreement({
      ownerId: BigInt(body.ownerId),
      agreementCode: body.agreementCode,
      commissionRateBps: body.commissionRateBps ? Number(body.commissionRateBps) : undefined,
      termsVersion: body.termsVersion,
      status: body.status,
      validFrom: body.validFrom ? new Date(body.validFrom) : undefined,
      validUntil: body.validUntil ? new Date(body.validUntil) : undefined,
      unitIds: body.unitIds?.map((id: string) => BigInt(id)),
    });
  }

  @Get('owners/:ownerId/agreements')
  getOwnerAgreements(@Param('ownerId', ParseBigIntPipe) ownerId: bigint) {
    return this.adminService.getOwnerAgreements(ownerId);
  }

  @Patch('owners/:userId/verify-authority')
  verifyOwnerAuthority(
    @Param('userId', ParseBigIntPipe) userId: bigint,
    @Body('isVerified') isVerified: boolean,
  ) {
    return this.adminService.verifyOwnerProfile(userId, Boolean(isVerified));
  }

  @Get('audit-logs')
  getAuditLogs(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.adminService.getAuditLogs(
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
    );
  }
}

