import React, { useRef } from 'react';
import { 
  X, 
  Printer, 
  Building2, 
  Calendar, 
  Clock, 
  Truck, 
  FileText, 
  Scale,
  PackageCheck,
  Disc,
  Layers,
  Ruler
} from 'lucide-react';
import { WarehouseItem } from '../types';
import { formatNumber, formatWeight } from '../utils/formatters';
import { WATTEH_LOGO } from '../assets/branding';

interface WarehouseReceiptModalProps {
  item: WarehouseItem | null;
  onClose: () => void;
}

export const WarehouseReceiptModal: React.FC<WarehouseReceiptModalProps> = ({
  item,
  onClose,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!item) return null;

  const isInbound = item.entryType === 'inbound';
  const docTitle = isInbound ? 'قبض رسمی ورود مس به انبار مرکزی' : 'حواله رسمی خروج مس از انبار مرکزی';

  const itemsList = item.items && item.items.length > 0
    ? item.items
    : [
        {
          id: item.id + '-1',
          packagingType: ((item as any).packagingType === 'roll' ? 'coil' : item.packagingType) || 'coil',
          brand: item.brand || 'باهنر',
          thicknessMm: item.thicknessMm || 0.75,
          diameterInch: item.diameterInch || '5/8',
          coilLength: item.coilLength || '15m',
          quantity: item.quantity || 1,
          unitWeightKg: item.unitWeightKg || 0,
          totalWeightKg: item.totalWeightKg || 0,
          spoolWeights: item.spoolWeights,
          notes: item.notes,
        }
      ];

  const grandTotalWeight = item.totalWeightKg || itemsList.reduce((sum, it) => sum + (it.totalWeightKg || 0), 0);
  const grandTotalCount = item.totalItemsCount || itemsList.reduce((sum, it) => sum + (it.quantity || 0), 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/80 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 py-4 sm:py-6 animate-in fade-in duration-150 dir-rtl">
      <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl w-full max-w-4xl my-auto max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Modal Controls Header */}
        <div className="p-4 bg-stone-900 text-white flex items-center justify-between shrink-0 no-print">
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${isInbound ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <span className="text-sm font-bold">{docTitle}</span>
            <span className="text-xs text-stone-400 font-mono">({item.referenceDocNumber || item.id})</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>چاپ سند رسمی</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Paper */}
        <div ref={printRef} className="p-6 sm:p-8 overflow-y-auto bg-white text-stone-900 printable-document space-y-6">
          
          {/* Document Header */}
          <div className="border-b-2 border-stone-800 pb-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl overflow-hidden bg-blue-600 border border-blue-500/30 flex items-center justify-center shrink-0">
                  <img 
                    src={WATTEH_LOGO} 
                    alt="لوگوی مس واته" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-black text-stone-900 tracking-tight">
                    شرکت بازرگانی مس واته
                  </h1>
                  <p className="text-xs text-stone-500 font-semibold mt-0.5">
                    سامانه هوشمند مدیریت و انبارداری مرکزی مس و فلزات
                  </p>
                </div>
              </div>

              <div className="text-left font-mono text-xs space-y-1">
                <div className="flex items-center justify-end gap-1.5 text-stone-700">
                  <span className="text-stone-400">شماره بارنامه / سند:</span>
                  <span className="font-bold text-stone-900 bg-stone-100 px-2.5 py-0.5 rounded-md border border-stone-200">
                    {item.referenceDocNumber || item.id}
                  </span>
                </div>
                <div className="flex items-center justify-end gap-1.5 text-stone-700">
                  <span className="text-stone-400">تاریخ ثبت:</span>
                  <span className="font-bold">{item.date}</span>
                </div>
                {item.time && (
                  <div className="flex items-center justify-end gap-1.5 text-stone-700">
                    <span className="text-stone-400">ساعت ثبت:</span>
                    <span className="font-bold">{item.time}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Banner Title */}
            <div className={`mt-4 py-2.5 px-4 rounded-2xl text-center font-black text-sm sm:text-base border ${
              isInbound 
                ? 'bg-emerald-50 text-emerald-950 border-emerald-300' 
                : 'bg-amber-50 text-amber-950 border-amber-300'
            }`}>
              {isInbound ? 'قبض رسمی ورود مس به انبار مرکزی (رسید کالا)' : 'حواله رسمی خروج مس از انبار مرکزی (سند تحویل کالا)'}
            </div>
          </div>

          {/* Consignment Meta Information Box */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-stone-50 p-4 rounded-2xl border border-stone-200">
            <div>
              <span className="text-stone-500 block mb-0.5">طرف‌حساب (خریدار/فروشنده):</span>
              <span className="font-bold text-stone-900 text-sm">
                {item.targetPartyName || 'ثبت نشده'}
              </span>
            </div>
            <div>
              <span className="text-stone-500 block mb-0.5">نام راننده:</span>
              <span className="font-bold text-stone-900 text-sm">
                {item.driverName || 'ثبت نشده'}
              </span>
            </div>
            <div>
              <span className="text-stone-500 block mb-0.5">شماره پلاک خودرو:</span>
              <span className="font-bold text-stone-900 font-mono text-sm">
                {item.vehiclePlate || 'ثبت نشده'}
              </span>
            </div>
            <div>
              <span className="text-stone-500 block mb-0.5">ثبت‌کننده / انباردار:</span>
              <span className="font-bold text-stone-900 text-sm">
                {item.registeredBy || 'انباردار مس واته'}
              </span>
            </div>
          </div>

          {/* Multi-item Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
              <PackageCheck className="w-4 h-4 text-amber-600" />
              <span>ریز اقلام محموله مس ({itemsList.length} قلم کالا):</span>
            </h3>

            <div className="overflow-x-auto rounded-2xl border border-stone-200">
              <table className="w-full text-xs text-right border-collapse">
                <thead>
                  <tr className="bg-stone-100 text-stone-700 font-bold border-b border-stone-200">
                    <th className="p-2.5 text-center w-10">ردیف</th>
                    <th className="p-2.5">نوع قالب و بسته‌بندی</th>
                    <th className="p-2.5">شرکت سازنده (برند)</th>
                    <th className="p-2.5 text-center">سایز / قطر</th>
                    <th className="p-2.5 text-center">ضخامت</th>
                    <th className="p-2.5 text-center">تعداد</th>
                    <th className="p-2.5">جزئیات و وزن‌های تفکیکی</th>
                    <th className="p-2.5 text-left font-mono">وزن کل (kg)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {itemsList.map((row, idx) => {
                    const pkgLabel = row.packagingType === 'coil'
                      ? `کلاف (${row.coilLength === '50m' ? '۵۰ متری' : '۱۵ متری'})`
                      : row.packagingType === 'straight'
                      ? 'شاخه'
                      : (row.spoolType === 'non_pallet' ? 'قرقره (غیر پالتی)' : 'قرقره (پالتی)');

                    return (
                      <tr key={row.id || idx} className="hover:bg-stone-50">
                        <td className="p-2.5 text-center font-mono text-stone-500">{idx + 1}</td>
                        <td className="p-2.5 font-bold text-stone-900 flex items-center gap-1.5">
                          {row.packagingType === 'coil' ? (
                            <Layers className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                          ) : row.packagingType === 'straight' ? (
                            <Ruler className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          ) : (
                            <Disc className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          )}
                          <span>{pkgLabel}</span>
                        </td>
                        <td className="p-2.5 font-bold text-stone-800">{row.brand}</td>
                        <td className="p-2.5 text-center font-mono">{row.diameterInch} اینچ</td>
                        <td className="p-2.5 text-center font-mono">{row.thicknessMm} mm</td>
                        <td className="p-2.5 text-center font-bold font-mono">{row.quantity}</td>
                        <td className="p-2.5 font-mono text-stone-600">
                          {row.packagingType === 'spool' && row.spoolWeights && row.spoolWeights.length > 0 ? (
                            <span className="text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              وزن قرقره‌ها: [{row.spoolWeights.join(' ، ')} kg]
                            </span>
                          ) : row.unitWeightKg && row.unitWeightKg > 0 ? (
                            <span>وزن واحد: {formatNumber(row.unitWeightKg, 2)} kg</span>
                          ) : (
                            <span>-</span>
                          )}
                        </td>
                        <td className="p-2.5 text-left font-black font-mono text-stone-900">
                          {formatNumber(row.totalWeightKg, 2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-stone-900 text-white font-bold text-xs">
                    <td colSpan={5} className="p-3 text-right">
                      جمع کل محموله بارنامه:
                    </td>
                    <td className="p-3 text-center font-mono text-amber-300">
                      {grandTotalCount} واحد
                    </td>
                    <td className="p-3"></td>
                    <td className="p-3 text-left font-mono text-sm text-amber-300">
                      {formatWeight(grandTotalWeight)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Notes */}
          {item.notes && (
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs">
              <span className="font-bold text-stone-700 block mb-1">توضیحات بارنامه:</span>
              <p className="text-stone-600 leading-relaxed">{item.notes}</p>
            </div>
          )}

          {/* Signatures & Official Stamp Grid */}
          <div className="grid grid-cols-3 gap-4 pt-6 border-t-2 border-stone-200 text-center text-xs">
            <div className="space-y-12">
              <span className="font-bold text-stone-700 block">امضاء و اثر انگشت راننده / تحویل‌دهنده</span>
              <div className="h-10 border-b border-dashed border-stone-300 mx-6"></div>
              <span className="text-stone-400 text-[11px] block">{item.driverName || 'راننده'}</span>
            </div>

            <div className="space-y-12">
              <span className="font-bold text-stone-700 block">امضاء و تأیید انباردار مس واته</span>
              <div className="h-10 border-b border-dashed border-stone-300 mx-6"></div>
              <span className="text-stone-400 text-[11px] block">{item.registeredBy || 'انباردار مس واته'}</span>
            </div>

            <div className="space-y-12">
              <span className="font-bold text-stone-700 block">مهر و امضای مدیریت بازرگانی</span>
              <div className="h-10 border-b border-dashed border-stone-300 mx-6"></div>
              <span className="text-stone-400 text-[11px] block">شرکت بازرگانی مس واته</span>
            </div>
          </div>

          {/* Footer Notice */}
          <div className="text-[10px] text-stone-400 text-center pt-2 border-t border-stone-100">
            این سند بر اساس مشخصات فیزیکی ثبت‌شده در سامانه انبارداری مس واته صادر گردیده و دارای ارزش رسمی تحویل کالا می‌باشد.
          </div>

        </div>

      </div>
    </div>
  );
};
