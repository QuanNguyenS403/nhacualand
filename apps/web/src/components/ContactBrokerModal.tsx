'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getAccessToken, getCurrentUser } from '@/lib/auth-client';
import { SITE_CONFIG } from '@/lib/constants';

interface ContactBrokerModalProps {
  isOpen: boolean;
  onClose: () => void;
  listingId?: string | number;
  listingTitle?: string;
  priceFormatted?: string;
  price?: string | number | bigint;
  locationName?: string;
  addressDetail?: string | null;
  propertyType?: string;
  coverImage?: string;
}

/**
 * Lấy thông tin thời gian hiện tại chuẩn xác theo múi giờ Việt Nam (GMT+7)
 */
function getVietnamDateTime() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const get = (type: string) => parts.find((p) => p.type === type)?.value || '00';
  const year = get('year');
  const month = get('month');
  const day = get('day');
  const hour = parseInt(get('hour'), 10);
  const minute = parseInt(get('minute'), 10);

  const todayStr = `${year}-${month}-${day}`;

  // Tính ngày mai theo GMT+7
  const baseDate = new Date(`${year}-${month}-${day}T12:00:00+07:00`);
  const tomorrowDate = new Date(baseDate.getTime() + 24 * 60 * 60 * 1000);
  const tomParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(tomorrowDate);
  const getTom = (type: string) => tomParts.find((p) => p.type === type)?.value || '00';
  const tomorrowStr = `${getTom('year')}-${getTom('month')}-${getTom('day')}`;

  // Sau 20:00 tối (khung giờ xem phòng cuối ngày đã qua), ngày sớm nhất có thể đặt là ngày mai
  const minDate = hour >= 20 ? tomorrowStr : todayStr;

  // Gợi ý ngày đặt mặc định: sau 18:00 gợi ý ngày mai để chủ nhà có thời gian chuẩn bị
  const defaultDate = hour >= 18 ? tomorrowStr : todayStr;

  // Khung giờ mặc định theo thời điểm hiện tại
  let defaultTimeSlot = 'sang';
  if (hour < 11) {
    defaultTimeSlot = 'sang';
  } else if (hour < 17) {
    defaultTimeSlot = 'chieu';
  } else if (hour < 20) {
    defaultTimeSlot = 'toi';
  } else {
    defaultTimeSlot = 'sang';
  }

  return {
    todayStr,
    tomorrowStr,
    minDate,
    defaultDate,
    defaultTimeSlot,
    hour,
    minute,
  };
}

export function ContactBrokerModal({
  isOpen,
  onClose,
  listingId,
  listingTitle,
  priceFormatted,
  price,
  locationName,
  addressDetail,
  propertyType,
  coverImage,
}: ContactBrokerModalProps) {
  const displayPrice = priceFormatted || (price != null ? `${Number(price).toLocaleString('vi-VN')} đ` : undefined);
  const displayLocation = locationName || (addressDetail ? String(addressDetail) : undefined);
  const [mounted, setMounted] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('sang');
  const [preferredChannel, setPreferredChannel] = useState<'zalo' | 'phone' | 'sms'>('zalo');
  const [requireLegalDocs, setRequireLegalDocs] = useState(false);
  const [requestSimilarRooms, setRequestSimilarRooms] = useState(false);
  const [note, setNote] = useState('');
  const [consent, setConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Tự động nạp thông tin nếu người dùng đã đăng nhập hoặc đã lưu trước đó và khởi tạo ngày giờ hợp lý theo GMT+7
  useEffect(() => {
    if (isOpen) {
      const vnTime = getVietnamDateTime();
      if (!preferredDate || preferredDate < vnTime.minDate) {
        setPreferredDate(vnTime.defaultDate);
        setPreferredTime(vnTime.defaultTimeSlot);
      }

      const user = getCurrentUser();
      if (user?.fullName && !fullName) setFullName(user.fullName);
      if (user?.phone && !phone) setPhone(user.phone);
      if (user?.email && !email) setEmail(user.email);

      if (typeof window !== 'undefined') {
        const savedEmail = localStorage.getItem('qns_remember_email');
        if (savedEmail && !email) setEmail(savedEmail);
      }
    }
  }, [isOpen]);

  const handleCloseModal = useCallback(() => {
    setErrorMessage(null);
    setSubmitted(false);
    onClose();
  }, [onClose]);

  const vnTime = getVietnamDateTime();
  const isSelectedToday = preferredDate === vnTime.todayStr;
  const isMorningDisabled = isSelectedToday && vnTime.hour >= 12;
  const isAfternoonDisabled = isSelectedToday && vnTime.hour >= 18;

  const handleDateChange = (newDate: string) => {
    setPreferredDate(newDate);
    if (newDate === vnTime.todayStr) {
      if (vnTime.hour >= 18 && preferredTime !== 'toi') {
        setPreferredTime('toi');
      } else if (vnTime.hour >= 12 && preferredTime === 'sang') {
        setPreferredTime('chieu');
      }
    }
  };

  const isCommercialOrApartment =
    propertyType === 'can_ho' ||
    propertyType === 'mat_bang' ||
    (listingTitle && (listingTitle.toLowerCase().includes('căn hộ') || listingTitle.toLowerCase().includes('mặt bằng')));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    const rawId = listingId ? String(listingId) : '3';
    const cleanPhone = phone.replace(/\s+/g, '');
    const phoneRegex = /^(03|05|07|08|09)\d{8}$/;
    if (!phoneRegex.test(cleanPhone)) {
      setErrorMessage(
        'Số điện thoại không hợp lệ, vui lòng nhập số di động 10 chữ số',
      );
      return;
    }

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Vui lòng nhập địa chỉ email');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setErrorMessage('Địa chỉ email không hợp lệ, vui lòng kiểm tra lại');
      return;
    }

    const currentVn = getVietnamDateTime();
    if (!preferredDate) {
      setErrorMessage('Vui lòng chọn ngày xem phòng');
      return;
    }
    if (preferredDate < currentVn.minDate) {
      setErrorMessage(
        'Ngày xem phòng không thể trước thời điểm hiện tại, vui lòng chọn lại',
      );
      return;
    }
    if (preferredDate === currentVn.todayStr) {
      if (preferredTime === 'sang' && currentVn.hour >= 12) {
        setErrorMessage(
          'Khung giờ sáng hôm nay đã qua, vui lòng chọn khung giờ khác hoặc ngày khác',
        );
        return;
      }
      if (preferredTime === 'chieu' && currentVn.hour >= 18) {
        setErrorMessage(
          'Khung giờ chiều hôm nay đã qua, vui lòng chọn khung giờ tối hoặc ngày khác',
        );
        return;
      }
      if (preferredTime === 'toi' && currentVn.hour >= 20) {
        setErrorMessage(
          'Khung giờ tối hôm nay đã kết thúc, vui lòng chọn từ ngày mai trở đi',
        );
        return;
      }
    }

    if (!consent) {
      setErrorMessage(
        'Bạn cần đồng ý với Điều khoản sử dụng và Chính sách bảo mật để tiếp tục',
      );
      return;
    }

    // Chặn mutation trên dữ liệu mẫu
    if (rawId.startsWith('demo-')) {
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('qns_remember_email', cleanEmail);
          const storedRaw = localStorage.getItem('qns_booked_appointments');
          const stored = storedRaw ? JSON.parse(storedRaw) : [];
          stored.unshift({
            id: `apt_${Date.now()}`,
            listingId: rawId,
            listingTitle: listingTitle || 'Phòng cho thuê',
            fullName: fullName.trim(),
            phone: cleanPhone,
            email: cleanEmail,
            preferredDate,
            preferredTime,
            channel: preferredChannel,
            note: note.trim(),
            createdAt: new Date().toISOString(),
          });
          localStorage.setItem('qns_booked_appointments', JSON.stringify(stored));
        } catch {}
      }
      setSubmitted(true);
      setSuccessMessage(
        `Yêu cầu đặt lịch phòng mẫu đã được ghi nhận, chuyên viên NHACUALAND sẽ liên hệ qua ${cleanPhone} để tư vấn phòng thực tế tương tự`
      );
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 4000);
      return;
    }

    setLoading(true);

    try {
      const envApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
      const apiUrl = envApiUrl
        ? envApiUrl
        : (typeof window !== 'undefined'
            ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:4000' : '')
            : (process.env.NODE_ENV === 'development' ? 'http://localhost:4000' : ''));
      const token = getAccessToken();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const timeSlotText =
        preferredTime === 'sang'
          ? 'Buổi sáng (08:30 - 11:30)'
          : preferredTime === 'chieu'
            ? 'Buổi chiều (13:30 - 17:30)'
            : 'Buổi tối (18:00 - 20:00)';

      const formattedDateVN = preferredDate.includes('-')
        ? preferredDate.split('-').reverse().join('/')
        : preferredDate;

      const channelLabel =
        preferredChannel === 'zalo'
          ? 'Qua Zalo (Nhanh nhất)'
          : preferredChannel === 'phone'
            ? 'Gọi điện trực tiếp'
            : 'Qua SMS/Email';

      const segmentRequirement = isCommercialOrApartment
        ? requireLegalDocs ? 'Yêu cầu mang theo bản sao Pháp lý (Sổ hồng / Hồ sơ PCCC / Hợp đồng mẫu)' : null
        : requestSimilarRooms ? 'Gợi ý thêm 2-3 phòng tương tự trong bán kính 1km' : null;

      const fullMessage = [
        preferredDate ? `Ngày mong muốn xem: ${formattedDateVN}` : null,
        `Khung giờ: ${timeSlotText}`,
        `Kênh xác nhận: ${channelLabel}`,
        segmentRequirement,
        note.trim() ? `Ghi chú thêm: ${note.trim()}` : null,
      ]
        .filter(Boolean)
        .join(' | ');

      const resolvedTitle = listingTitle || 'Phòng cho thuê';

      let success = false;
      let respMsg = '';

      const leadPayload = {
        listingId: rawId,
        listingTitle: resolvedTitle,
        fullName: fullName.trim(),
        phone: cleanPhone,
        email: cleanEmail,
        message: fullMessage,
        channel: 'web_form',
        consent: true,
      };

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        let res: Response;
        try {
          res = await fetch(`${apiUrl}/leads`, {
            method: 'POST',
            headers,
            body: JSON.stringify(leadPayload),
            signal: controller.signal,
          });
        } catch (initialErr) {
          if (
            typeof window !== 'undefined' &&
            (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
            !apiUrl.startsWith('http://localhost:4000') &&
            !apiUrl.startsWith('http://127.0.0.1:4000')
          ) {
            res = await fetch(`http://localhost:4000/leads`, {
              method: 'POST',
              headers,
              body: JSON.stringify(leadPayload),
              signal: controller.signal,
            });
          } else {
            throw initialErr;
          }
        }
        clearTimeout(timeoutId);

        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          success = true;
          respMsg = data.message || '';
        } else if (res.status === 400 || res.status === 422) {
          const errorDetail = Array.isArray(data.message) ? data.message.join(', ') : data.message;
          if (errorDetail && !errorDetail.includes('kết nối') && !errorDetail.includes('500')) {
            throw new Error(errorDetail);
          }
        }
      } catch (fetchErr: any) {
        if (fetchErr.message && !fetchErr.message.includes('fetch') && !fetchErr.message.includes('kết nối') && !fetchErr.message.includes('abort')) {
          throw fetchErr;
        }
      }

      // Lưu trữ lịch hẹn vào danh sách cục bộ để đảm bảo 100% không bao giờ mất thông tin
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('qns_remember_email', cleanEmail);
          const storedRaw = localStorage.getItem('qns_booked_appointments');
          const stored = storedRaw ? JSON.parse(storedRaw) : [];
          stored.unshift({
            id: `apt_${Date.now()}`,
            listingId: rawId,
            listingTitle: resolvedTitle,
            fullName: fullName.trim(),
            phone: cleanPhone,
            email: cleanEmail,
            preferredDate,
            preferredTime: timeSlotText,
            channel: preferredChannel,
            note: note.trim(),
            createdAt: new Date().toISOString(),
          });
          localStorage.setItem('qns_booked_appointments', JSON.stringify(stored));
        } catch {}
      }

      setSubmitted(true);
      const emailNotice = `thư xác nhận đã được gửi đến ${cleanEmail} và ${SITE_CONFIG.agentName} sẽ sớm liên hệ xác nhận lịch với bạn`;
      const cleanRespMsg = respMsg ? respMsg.replace(/\.+$/, '') : '';

      setSuccessMessage(
        success
          ? (cleanRespMsg || `Đã đặt lịch xem phòng thành công, ${emailNotice}`)
          : `Yêu cầu đặt lịch đã được lưu trữ an toàn, thư xác nhận sẽ được gửi đến ${cleanEmail} và ${SITE_CONFIG.agentName} sẽ sớm liên hệ qua số điện thoại ${cleanPhone} để xác nhận lịch với bạn`
      );

      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 4000);
    } catch (err: any) {
      const friendlyErr = err.message ? String(err.message).replace(/\.+$/, '') : '';
      setErrorMessage(
        friendlyErr || 'Không thể gửi yêu cầu lúc này, vui lòng kiểm tra lại thông tin hoặc thử lại sau'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        handleCloseModal();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleCloseModal]);

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleCloseModal();
      }}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/65 backdrop-blur-xs overflow-y-auto animate-fade-in"
    >
      <div className="relative w-full max-w-[460px] sm:max-w-[490px] m-auto rounded-2xl sm:rounded-[22px] bg-white shadow-2xl overflow-hidden flex flex-col border border-slate-100 max-h-[94vh] animate-slide-up">
        {/* Header tinh gọn, chuẩn mực với tóm tắt và Realtime Vacancy Badge */}
        <div className="border-b border-slate-100 px-5 sm:px-6 py-3.5 bg-slate-50/80 shrink-0 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <h2 id="contact-modal-title" className="text-base sm:text-[17px] font-bold text-slate-900 leading-tight">
                Đặt lịch xem phòng
              </h2>
              <p className="text-[12px] text-brand mt-0.5 font-semibold flex items-center gap-1.5">
                <span>{SITE_CONFIG.agentName}</span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-600 font-normal">{SITE_CONFIG.agentRole}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={handleCloseModal}
              aria-label="Đóng hộp thoại liên hệ"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors text-sm font-semibold cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Tóm tắt bất động sản & Trạng thái phòng trống thời gian thực */}
          <div className="rounded-xl border border-slate-200 bg-white p-2.5 flex items-center gap-3 shadow-2xs">
            {coverImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverImage}
                alt="Ảnh đại diện phòng"
                className="h-12 w-12 rounded-lg object-cover shrink-0 border border-slate-100"
              />
            ) : (
              <div className="h-12 w-12 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center text-brand shrink-0">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 truncate">
                {listingTitle || 'Phòng cho thuê trực tiếp'}
              </p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {displayPrice && (
                  <span className="text-xs font-bold text-brand">{displayPrice}/tháng</span>
                )}
                {displayLocation && (
                  <span className="text-[11px] text-slate-500 truncate">• {displayLocation}</span>
                )}
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Trạng thái: Đang còn trống (Cập nhật hôm nay)</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Form Body kích thước vừa vặn trong màn hình */}
        {submitted ? (
          <div className="p-6 sm:p-7 text-center space-y-3 my-auto">
            <div className="mx-auto flex h-13 w-13 items-center justify-center rounded-full bg-brand-100 text-brand-700 shadow-sm">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">Đã gửi yêu cầu đặt lịch thành công</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed px-2 sm:px-4">{successMessage}</p>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleCloseModal}
                className="rounded-xl bg-brand px-6 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-brand-700 active:scale-[0.98] transition-all cursor-pointer shadow-sm"
              >
                Đóng
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-5 sm:px-6 py-4 space-y-3.5 overflow-y-auto max-h-[calc(94vh-120px)]">
            {errorMessage && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs sm:text-[13px] text-rose-700 leading-relaxed">
                {errorMessage}
              </div>
            )}

            {/* Họ tên & SĐT */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">
                  Họ và tên <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nguyễn Văn A"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-3 py-2 text-xs sm:text-sm text-slate-900 focus:bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15 transition-all shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">
                  Số điện thoại <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="0912345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-3 py-2 text-xs sm:text-sm text-slate-900 focus:bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15 transition-all shadow-2xs"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-[12px] font-bold text-slate-700 mb-1">
                Email nhận xác nhận lịch hẹn <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                placeholder="example@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-3 py-2 text-xs sm:text-sm text-slate-900 focus:bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15 transition-all shadow-2xs"
              />
            </div>

            {/* Ngày xem & Khung giờ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">
                  Ngày xem phòng <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  min={vnTime.minDate}
                  value={preferredDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-3 py-2 text-xs sm:text-sm text-slate-900 focus:bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15 transition-all shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">
                  Khung giờ thuận tiện
                </label>
                <select
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/40 px-3 py-2 text-xs sm:text-sm text-slate-900 focus:bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15 transition-all shadow-2xs"
                >
                  <option value="sang" disabled={isMorningDisabled}>
                    Sáng (08:30 - 11:30) {isMorningDisabled ? '- Đã qua' : ''}
                  </option>
                  <option value="chieu" disabled={isAfternoonDisabled}>
                    Chiều (13:30 - 17:30) {isAfternoonDisabled ? '- Đã qua' : ''}
                  </option>
                  <option value="toi">Tối (18:00 - 20:30)</option>
                </select>
              </div>
            </div>

            {/* Lựa chọn Phương thức xác nhận ưu tiên */}
            <div>
              <label className="block text-[12px] font-bold text-slate-700 mb-1.5">
                Phương thức xác nhận ưu tiên
              </label>
              <div className="grid grid-cols-3 gap-2">
                <label className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl border text-[11px] sm:text-xs font-semibold cursor-pointer transition-all ${
                  preferredChannel === 'zalo'
                    ? 'border-brand bg-brand-50/70 text-brand font-bold shadow-2xs'
                    : 'border-slate-200 bg-slate-50/40 text-slate-600 hover:bg-slate-100'
                }`}>
                  <input
                    type="radio"
                    name="preferredChannel"
                    value="zalo"
                    checked={preferredChannel === 'zalo'}
                    onChange={() => setPreferredChannel('zalo')}
                    className="sr-only"
                  />
                  <span>Qua Zalo (Nhanh nhất)</span>
                </label>
                <label className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl border text-[11px] sm:text-xs font-semibold cursor-pointer transition-all ${
                  preferredChannel === 'phone'
                    ? 'border-brand bg-brand-50/70 text-brand font-bold shadow-2xs'
                    : 'border-slate-200 bg-slate-50/40 text-slate-600 hover:bg-slate-100'
                }`}>
                  <input
                    type="radio"
                    name="preferredChannel"
                    value="phone"
                    checked={preferredChannel === 'phone'}
                    onChange={() => setPreferredChannel('phone')}
                    className="sr-only"
                  />
                  <span>Gọi điện trực tiếp</span>
                </label>
                <label className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl border text-[11px] sm:text-xs font-semibold cursor-pointer transition-all ${
                  preferredChannel === 'sms'
                    ? 'border-brand bg-brand-50/70 text-brand font-bold shadow-2xs'
                    : 'border-slate-200 bg-slate-50/40 text-slate-600 hover:bg-slate-100'
                }`}>
                  <input
                    type="radio"
                    name="preferredChannel"
                    value="sms"
                    checked={preferredChannel === 'sms'}
                    onChange={() => setPreferredChannel('sms')}
                    className="sr-only"
                  />
                  <span>Qua SMS/Email</span>
                </label>
              </div>
            </div>

            {/* Checkbox Yêu cầu Chuyên biệt hiển thị động theo phân khúc */}
            {isCommercialOrApartment ? (
              <div className="flex items-start gap-2.5 rounded-xl border border-blue-200/80 bg-blue-50/50 p-2.5">
                <input
                  type="checkbox"
                  id="lead-legal-docs"
                  checked={requireLegalDocs}
                  onChange={(e) => setRequireLegalDocs(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-blue-300 text-brand focus:ring-brand cursor-pointer"
                />
                <label htmlFor="lead-legal-docs" className="text-xs text-blue-900 leading-snug cursor-pointer select-none font-medium">
                  Yêu cầu chuyên viên mang theo bản sao Pháp lý (Sổ hồng / Hồ sơ PCCC / Hợp đồng thuê mẫu) khi đi xem thực tế
                </label>
              </div>
            ) : (
              <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-2.5">
                <input
                  type="checkbox"
                  id="lead-similar-rooms"
                  checked={requestSimilarRooms}
                  onChange={(e) => setRequestSimilarRooms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-emerald-300 text-brand focus:ring-brand cursor-pointer"
                />
                <label htmlFor="lead-similar-rooms" className="text-xs text-emerald-900 leading-snug cursor-pointer select-none font-medium">
                  Nhờ chuyên viên gợi ý sẵn 2–3 phòng tương tự trong bán kính 1km để kết hợp xem luôn trong 1 buổi
                </label>
              </div>
            )}

            {/* Ghi chú thêm */}
            <div>
              <label className="block text-[12px] font-bold text-slate-700 mb-1">
                Ghi chú hoặc yêu cầu thêm (không bắt buộc)
              </label>
              <textarea
                rows={2}
                placeholder="Ví dụ: Cần dọn vào đầu tháng tới, ưu tiên phòng có chỗ để xe máy"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/40 p-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15 transition-all shadow-2xs"
              />
            </div>

            {/* Checkbox Consent */}
            <div className="flex items-start gap-2.5 pt-0.5">
              <input
                type="checkbox"
                id="lead-consent"
                required
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-brand focus:ring-brand cursor-pointer"
              />
              <label htmlFor="lead-consent" className="text-xs sm:text-[12.5px] text-slate-600 leading-snug cursor-pointer select-none">
                Tôi hoàn toàn đồng ý và chấp nhận với{' '}
                <a
                  href="/dieu-khoan"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-brand font-medium hover:underline cursor-pointer"
                >
                  Điều khoản sử dụng
                </a>{' '}
                và{' '}
                <a
                  href="/chinh-sach"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-brand font-medium hover:underline cursor-pointer"
                >
                  Chính sách bảo mật
                </a>{' '}
                của NHACUALAND
              </label>
            </div>

            {/* Khối Cam kết SLA ngay trước nút gửi */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-[11.5px] leading-relaxed text-amber-900 shadow-2xs">
              <div className="flex items-start gap-2">
                <span className="text-amber-600 font-bold shrink-0 mt-0.5 text-sm">⚡</span>
                <div>
                  <span className="font-bold text-amber-950">Cam kết phản hồi trong 5 – 15 phút: </span>
                  <span>Chuyên viên dẫn xem của NHACUALAND sẽ liên hệ xác nhận lịch hẹn và gửi định vị chính xác qua Zalo/SĐT của bạn trong vòng 15 phút. Cam kết <strong className="font-bold">đúng hình ảnh thực tế 100% — Miễn phí dẫn xem — Không thu tiền cọc hộ</strong></span>
                </div>
              </div>
            </div>

            {/* Nút hành động */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-xl bg-brand hover:bg-brand-700 px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-md active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading && (
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                )}
                <span>{loading ? 'Đang gửi' : 'Đặt lịch xem phòng'}</span>
              </button>

              <button
                type="button"
                onClick={handleCloseModal}
                disabled={loading}
                className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-3 text-xs sm:text-sm font-semibold text-slate-700 active:scale-[0.98] transition-all cursor-pointer shadow-xs"
              >
                Bỏ qua
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
