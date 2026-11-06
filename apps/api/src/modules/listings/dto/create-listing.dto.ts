import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionType } from '@batdongsan/database';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateListingDto {
  @ApiPropertyOptional({ enum: TransactionType, default: TransactionType.rent })
  @IsOptional()
  @IsEnum(TransactionType)
  transactionType?: TransactionType = TransactionType.rent;

  @ApiProperty({ example: 'phong-tro-sinh-vien', description: 'phong-tro-sinh-vien | phong-tro-nguoi-di-lam | can-ho-chung-cu | nha-nguyen-can | studio | mat-bang-kinh-doanh | ky-tuc-xa-tu-nhan' })
  @IsString()
  propertyType!: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  locationId!: number;

  @ApiPropertyOptional({ description: 'Mã khu trọ / chung cư mini (RentalCompound/Project)' })
  @IsOptional()
  @IsInt()
  projectId?: number;

  @ApiProperty({ minLength: 10, maxLength: 150 })
  @IsString()
  @MinLength(10, { message: 'Tiêu đề nên tối thiểu 10 ký tự để mô tả rõ tin đăng.' })
  @MaxLength(150, { message: 'Tiêu đề tối đa 150 ký tự.' })
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 3500000, description: 'Giá thuê hàng tháng (VNĐ/tháng nguyên)' })
  @IsNotEmpty()
  @IsInt({ message: 'Giá thuê phải là số nguyên VNĐ.' })
  @Min(100000, { message: 'Giá thuê phải từ 100.000 đ/tháng trở lên.' })
  @Max(10000000000, { message: 'Giá thuê không được vượt quá 10 tỷ đ/tháng.' })
  price!: number;

  @ApiPropertyOptional({ example: 3500000, description: 'Tiền cọc yêu cầu (VNĐ nguyên)' })
  @IsOptional()
  @IsInt({ message: 'Tiền cọc phải là số nguyên VNĐ.' })
  @Min(0, { message: 'Tiền cọc không được là số âm.' })
  @Max(10000000000, { message: 'Tiền cọc không được vượt quá 10 tỷ đ.' })
  depositAmount?: number;

  @ApiPropertyOptional({ example: 6, description: 'Thời hạn hợp đồng tối thiểu (tháng)' })
  @IsOptional()
  @IsInt()
  @Min(1, { message: 'Hợp đồng tối thiểu 1 tháng.' })
  @Max(120, { message: 'Thời hạn hợp đồng tối đa 120 tháng.' })
  minLeaseMonths?: number;

  @ApiPropertyOptional({ example: false, description: 'Giá thuê đã bao gồm điện nước chưa' })
  @IsOptional()
  @IsBoolean()
  utilitiesIncluded?: boolean;

  @ApiPropertyOptional({ example: 3500, description: 'Đơn giá điện (đ/kWh)' })
  @IsOptional()
  @IsInt()
  @Min(0, { message: 'Đơn giá điện không được là số âm.' })
  @Max(100000, { message: 'Đơn giá điện tối đa 100.000 đ/kWh.' })
  electricityPricePerKwh?: number;

  @ApiPropertyOptional({ example: 18000, description: 'Đơn giá nước (đ/m3)' })
  @IsOptional()
  @IsInt()
  @Min(0, { message: 'Đơn giá nước không được là số âm.' })
  @Max(500000, { message: 'Đơn giá nước tối đa 500.000 đ/m³.' })
  waterPricePerM3?: number;

  @ApiPropertyOptional({ example: 100000, description: 'Giá nước khoán theo đầu người hoặc theo tháng (đ)' })
  @IsOptional()
  @IsInt()
  @Min(0, { message: 'Giá nước khoán không được là số âm.' })
  @Max(5000000, { message: 'Giá nước khoán tối đa 5.000.000 đ/tháng.' })
  waterPriceFlat?: number;

  @ApiPropertyOptional({ description: 'Tiện ích có sẵn dạng JSON object (wifi, airConditioner, mezzanine...)' })
  @IsOptional()
  amenities?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Danh sách ID các trường đại học lân cận', type: [Number] })
  @IsOptional()
  @IsArray()
  nearbyUniversityIds?: number[];

  @ApiPropertyOptional({
    description: 'Chi tiết khoảng cách các trường ĐH',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        universityId: { type: 'number' },
        distanceMeters: { type: 'number' },
        travelTimeMinutes: { type: 'number' },
      },
    },
  })
  @IsOptional()
  @IsArray()
  universityDistances?: { universityId: number; distanceMeters?: number; travelTimeMinutes?: number }[];

  @ApiProperty({ example: 25 })
  @IsNumber()
  @Min(1, { message: 'Diện tích phòng tối thiểu 1 m².' })
  @Max(50000, { message: 'Diện tích tối đa 50.000 m².' })
  areaM2!: number;

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(50) bedrooms?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(50) bathrooms?: number;

  @ApiPropertyOptional({ example: 'hop_dong_6_thang', description: 'hop_dong_6_thang | hop_dong_1_nam | linh_hoat | khong_can_hop_dong' })
  @IsOptional()
  @IsString()
  legalStatus?: string;

  @ApiPropertyOptional({ description: 'Địa chỉ chi tiết (số nhà, ngõ/hẻm, tên đường)' })
  @IsOptional()
  @IsString()
  addressDetail?: string;

  @ApiPropertyOptional({ example: 10.7769, description: 'Vĩ độ (-90 đến 90)' })
  @IsOptional()
  @IsNumber()
  @Min(-90, { message: 'Vĩ độ phải từ -90 đến 90.' })
  @Max(90, { message: 'Vĩ độ phải từ -90 đến 90.' })
  lat?: number;

  @ApiPropertyOptional({ example: 106.7009, description: 'Kinh độ (-180 đến 180)' })
  @IsOptional()
  @IsNumber()
  @Min(-180, { message: 'Kinh độ phải từ -180 đến 180.' })
  @Max(180, { message: 'Kinh độ phải từ -180 đến 180.' })
  lng?: number;

  @ApiPropertyOptional({ description: 'URL video thực tế căn phòng/mặt bằng' })
  @IsOptional()
  @IsString()
  videoUrl?: string;

  @ApiPropertyOptional({ description: 'URL ảnh bản vẽ mặt bằng / sơ đồ bố trí' })
  @IsOptional()
  @IsString()
  floorplanImageUrl?: string;

  @ApiPropertyOptional({ description: 'Thông số kỹ thuật & pháp lý chuyên biệt từng phân khúc' })
  @IsOptional()
  segmentAttributes?: Record<string, any>;

  @ApiPropertyOptional({ example: 'chinh_chu', description: 'chinh_chu | tham_dinh_nhacualand | don_vi_van_hanh' })
  @IsOptional()
  @IsString()
  posterRole?: string;
}
