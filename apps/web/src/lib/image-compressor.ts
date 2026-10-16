export const DEFAULT_ROOM_FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&auto=format&fit=crop&q=75',
  'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=800&auto=format&fit=crop&q=70',
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&auto=format&fit=crop&q=70',
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&auto=format&fit=crop&q=75',
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&auto=format&fit=crop&q=75',
  'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&auto=format&fit=crop&q=75',
];

/**
 * Nén tệp hình ảnh client-side bằng HTML5 Canvas sang Base64 JPEG gọn nhẹ (~50-80KB)
 * Đảm bảo lưu an toàn trong localStorage và hiển thị ổn định trên mọi thiết bị
 */
export async function compressImage(file: File, maxWidth = 1200, quality = 0.75): Promise<string> {
  return new Promise((resolve) => {
    // Nếu môi trường không hỗ trợ window/Image (SSR), fallback đọc trực tiếp
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(DEFAULT_ROOM_FALLBACK_IMAGES[0]);
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve((readerEvent.target?.result as string) || DEFAULT_ROOM_FALLBACK_IMAGES[0]);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };

      img.onerror = () => {
        resolve((readerEvent.target?.result as string) || DEFAULT_ROOM_FALLBACK_IMAGES[0]);
      };

      img.src = readerEvent.target?.result as string;
    };

    reader.onerror = () => resolve(DEFAULT_ROOM_FALLBACK_IMAGES[0]);
    reader.readAsDataURL(file);
  });
}

/**
 * Kiểm tra và chuẩn hóa mảng hình ảnh tin đăng
 * Tự động thay thế các blob URL bị hết hạn bằng ảnh chất lượng cao chuẩn hệ thống
 */
export function sanitizeListingImages(images?: any[]): { imageUrl: string; sortOrder: number }[] {
  if (!images || !Array.isArray(images) || images.length === 0) {
    return [{ imageUrl: DEFAULT_ROOM_FALLBACK_IMAGES[0], sortOrder: 0 }];
  }

  return images.map((img, idx) => {
    let url = typeof img === 'string' ? img : img?.imageUrl || '';
    // Nếu là blob URL đã hết hạn hoặc chuỗi rỗng, dùng ảnh phòng đẹp thay thế
    if (!url || url.startsWith('blob:')) {
      url = DEFAULT_ROOM_FALLBACK_IMAGES[idx % DEFAULT_ROOM_FALLBACK_IMAGES.length];
    }
    return {
      imageUrl: url,
      sortOrder: typeof img === 'object' && typeof img.sortOrder === 'number' ? img.sortOrder : idx,
    };
  });
}

/**
 * Tự động kiểm tra và chữa lành các tin tự đăng cũ trong localStorage nếu chứa blob URL
 */
export function healCustomListingsInLocalStorage(): any[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('qns_custom_listings');
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];

    let hasChange = false;
    const healed = list.map((item) => {
      let itemImages = item.images;
      let changed = false;

      if (!Array.isArray(itemImages) || itemImages.length === 0) {
        itemImages = [{ imageUrl: DEFAULT_ROOM_FALLBACK_IMAGES[0], sortOrder: 0 }];
        changed = true;
      } else {
        const sanitized = itemImages.map((img: any, idx: number) => {
          const url = typeof img === 'string' ? img : img?.imageUrl;
          if (!url || url.startsWith('blob:')) {
            changed = true;
            return {
              imageUrl: DEFAULT_ROOM_FALLBACK_IMAGES[idx % DEFAULT_ROOM_FALLBACK_IMAGES.length],
              sortOrder: idx,
            };
          }
          return img;
        });
        if (changed) itemImages = sanitized;
      }

      let itemOwner = item.owner;
      if (itemOwner) {
        const rawOwner = itemOwner.fullName || '';
        if (!rawOwner || /nhacualand|qns broker|dẫn xem|đức quân|môi giới/i.test(rawOwner)) {
          itemOwner = { ...itemOwner, fullName: 'Chủ nhà' };
          changed = true;
        }
      } else {
        itemOwner = { fullName: 'Chủ nhà' };
        changed = true;
      }

      if (changed) {
        hasChange = true;
        return { ...item, images: itemImages, owner: itemOwner };
      }
      return item;
    });

    if (hasChange) {
      localStorage.setItem('qns_custom_listings', JSON.stringify(healed));
      window.dispatchEvent(new Event('qns_listings_updated'));
    }

    return healed;
  } catch (err) {
    console.warn('Lỗi tự động chữa lành ảnh tin đăng:', err);
    return [];
  }
}
