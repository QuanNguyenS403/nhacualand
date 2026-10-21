import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleLoginDto {
  @ApiProperty({ description: 'Google ID Token / Credential từ Google Identity Services', required: false })
  @IsString()
  @IsOptional()
  credential?: string;

  @ApiProperty({ description: 'Google OAuth2 Access Token từ Google Identity Services', required: false })
  @IsString()
  @IsOptional()
  accessToken?: string;
}
