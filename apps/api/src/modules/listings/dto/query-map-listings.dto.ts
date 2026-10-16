import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryMapListingsDto {
  @ApiPropertyOptional({ description: 'Khung toạ độ tìm kiếm dạng minLng,minLat,maxLng,maxLat' })
  @IsOptional()
  @IsString()
  bbox?: string;

  @ApiPropertyOptional({ description: 'Loại hình phòng (phong_tro, chung_cu_mini, can_ho, nha_nguyen_can, o_ghep, studio, mat_bang)' })
  @IsOptional()
  @IsString()
  propertyType?: string;

  @ApiPropertyOptional({ description: 'Giá tối thiểu VNĐ/tháng' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Giá tối đa VNĐ/tháng' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ description: 'Danh sách tiện ích cách nhau bởi dấu phẩy' })
  @IsOptional()
  @IsString()
  amenities?: string;

  @ApiPropertyOptional({ description: 'Thời điểm cập nhật ISO để polling thay đổi mới nhất' })
  @IsOptional()
  @IsString()
  updatedSince?: string;

  @ApiPropertyOptional({ description: 'Số lượng pin tối đa trả về (mặc định 500, tối đa 2000)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2000)
  limit?: number = 500;
}
