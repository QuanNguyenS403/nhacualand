'use client';

import { useState } from 'react';

interface MoveInCostEstimatorProps {
  initialRentPrice: number | string;
  depositAmount?: number | string | null;
  electricityPricePerKwh?: number | null;
  waterPricePerM3?: number | null;
  waterPriceFlat?: number | null;
  utilitiesIncluded?: boolean;
}

export function MoveInCostEstimator({
  initialRentPrice,
  depositAmount,
  electricityPricePerKwh = 3500,
  waterPricePerM3 = 18000,
  waterPriceFlat,
  utilitiesIncluded = false,
}: MoveInCostEstimatorProps) {
  const rent = typeof initialRentPrice === 'string' ? Number(initialRentPrice) || 0 : initialRentPrice;
  
  // F11 / FE-N17: Phân biệt rõ cọc 0đ (không cọc) với trường hợp chưa khai báo cọc (null/undefined)
  const isDepositDeclared = depositAmount !== undefined && depositAmount !== null && depositAmount !== '';
  const parsedDeposit = isDepositDeclared ? Number(depositAmount) : NaN;
  const initialDeposit = !isNaN(parsedDeposit) ? Math.max(0, parsedDeposit) : rent;

  const [customDeposit, setCustomDeposit] = useState<number>(initialDeposit);
  const [electricityKwh, setElectricityKwh] = useState<number>(80); // Trung bình phòng trọ dùng 80 kWh/tháng
  const [waterAmount, setWaterAmount] = useState<number>(waterPriceFlat ? 1 : 4); // Nếu tính khoán thì mặc định 1 người, nếu m3 thì 4m3
  const [internetFee, setInternetFee] = useState<number>(100000); // 100k/tháng

  // Tính tiền điện
  const elecCost = utilitiesIncluded ? 0 : (electricityPricePerKwh ?? 3500) * electricityKwh;
  // Tính tiền nước: tách rõ khoán theo người vs theo m3
  const waterCost = utilitiesIncluded
    ? 0
    : waterPriceFlat
      ? waterPriceFlat * Math.max(1, waterAmount)
      : (waterPricePerM3 ?? 18000) * waterAmount;

  // Chi phí phát sinh tháng đầu
  const monthlyUtilitiesEstimate = elecCost + waterCost + internetFee;

  // Tổng tiền cần chuẩn bị dọn vào = Tiền cọc + Tiền thuê tháng đầu + Dự trù điện nước tháng đầu
  const totalMoveInCost = customDeposit + rent + monthlyUtilitiesEstimate;

  return (
    <div id="move-in-estimator" className="rounded-2xl border border-brand-200 bg-white p-6 shadow-card scroll-mt-28">
      <div className="flex items-center justify-between gap-3 border-b border-surface-border pb-4">
        <div>
          <h3 className="text-lg font-bold text-text-primary">
            Ước tính chi phí dọn vào ở
          </h3>
          <p className="mt-0.5 text-xs text-text-muted">
            Minh bạch chi phí tháng đầu: Tiền cọc + Tiền thuê + Dự trù điện nước
          </p>
        </div>
        {utilitiesIncluded && (
          <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-900">
            Đã bao điện nước
          </span>
        )}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* Cột trái: Điều chỉnh thông số */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs font-medium text-text-secondary mb-1.5">
              <span>Tiền đặt cọc phòng</span>
              <span className="font-bold text-text-primary">{customDeposit.toLocaleString('vi-VN')} đ</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Cọc 1 tháng', val: rent },
                { label: 'Cọc 2 tháng', val: rent * 2 },
                { label: 'Không cọc', val: 0 },
              ].map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCustomDeposit(item.val)}
                  className={`rounded-lg py-1.5 text-xs font-medium transition-colors border ${
                    customDeposit === item.val
                      ? 'border-brand bg-brand/10 text-brand font-semibold'
                      : 'border-surface-border bg-surface hover:bg-surface-muted text-text-secondary'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {!utilitiesIncluded && (
            <>
              <div>
                <div className="flex justify-between text-xs font-medium text-text-secondary mb-1">
                  <span>Ước tính số điện ({electricityPricePerKwh?.toLocaleString('vi-VN') ?? '3.500'} đ/kWh)</span>
                  <span className="font-semibold text-text-primary">{electricityKwh} kWh (~{elecCost.toLocaleString('vi-VN')} đ)</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="300"
                  step="10"
                  value={electricityKwh}
                  onChange={(e) => setElectricityKwh(Number(e.target.value))}
                  className="w-full accent-brand cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-text-muted">
                  <span>Ít (20 kWh)</span>
                  <span>Trung bình (80 kWh)</span>
                  <span>Bật máy lạnh nhiều (200+ kWh)</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium text-text-secondary mb-1">
                  <span>
                    Ước tính nước ({waterPriceFlat ? `${waterPriceFlat.toLocaleString('vi-VN')} đ/người` : `${waterPricePerM3?.toLocaleString('vi-VN') ?? '18.000'} đ/m³`})
                  </span>
                  <span className="font-semibold text-text-primary">
                    {waterPriceFlat ? `${waterAmount} người` : `${waterAmount} m³`} (~{waterCost.toLocaleString('vi-VN')} đ)
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max={waterPriceFlat ? 6 : 20}
                  step="1"
                  value={waterAmount}
                  onChange={(e) => setWaterAmount(Number(e.target.value))}
                  className="w-full accent-brand cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-text-muted">
                  <span>{waterPriceFlat ? '1 người ở' : 'Tiết kiệm (2-4 m³)'}</span>
                  <span>{waterPriceFlat ? '2-3 người' : 'Trung bình (6-8 m³)'}</span>
                  <span>{waterPriceFlat ? '4+ người' : 'Nhiều (15+ m³)'}</span>
                </div>
              </div>
            </>
          )}

          <div>
            <div className="flex justify-between text-xs font-medium text-text-secondary mb-1">
              <span>Phí dịch vụ & Internet dự kiến</span>
              <span className="font-semibold text-text-primary">{internetFee.toLocaleString('vi-VN')} đ</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[50000, 100000, 150000].map((fee) => (
                <button
                  key={fee}
                  type="button"
                  onClick={() => setInternetFee(fee)}
                  className={`rounded-lg py-1.5 text-xs font-medium transition-colors border ${
                    internetFee === fee
                      ? 'border-brand bg-brand/10 text-brand font-semibold'
                      : 'border-surface-border bg-surface hover:bg-surface-muted text-text-secondary'
                  }`}
                >
                  {fee.toLocaleString('vi-VN')} đ
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Cột phải: Bảng kết quả tổng hợp */}
        <div className="rounded-xl bg-gradient-to-br from-brand-50 to-amber-100/50 border border-brand-200 p-5 flex flex-col justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider font-semibold text-brand-900">
              Tổng chi phí cần chuẩn bị (Tháng đầu)
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-brand tracking-tight">
                {totalMoveInCost.toLocaleString('vi-VN')}
              </span>
              <span className="text-sm font-semibold text-brand-800">VNĐ</span>
            </div>
            <p className="mt-1 text-xs text-text-muted">
              Đã bao gồm tiền cọc hoàn lại khi trả phòng
            </p>

            <div className="mt-4 space-y-2 border-t border-brand-200/80 pt-3 text-xs">
              <div className="flex justify-between text-text-secondary">
                <span>1. Tiền cọc (hoàn lại):</span>
                <span className="font-semibold text-text-primary">{customDeposit.toLocaleString('vi-VN')} đ</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>2. Tiền thuê tháng đầu:</span>
                <span className="font-semibold text-text-primary">{rent.toLocaleString('vi-VN')} đ</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>3. Dự trù điện/nước/wifi tháng đầu:</span>
                <span className="font-semibold text-text-primary">{monthlyUtilitiesEstimate.toLocaleString('vi-VN')} đ</span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-brand-200/80">
            <div className="flex justify-between text-xs font-bold text-brand-900">
              <span>Các tháng tiếp theo chỉ trả:</span>
              <span className="text-sm text-brand-800">
                ~{(rent + monthlyUtilitiesEstimate).toLocaleString('vi-VN')} đ/tháng
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
