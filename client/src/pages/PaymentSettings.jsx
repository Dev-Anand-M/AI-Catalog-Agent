import { useState, useEffect } from 'react';
import { Building2, Smartphone, QrCode, CheckCircle, Plus, Trash2, Phone } from 'lucide-react';
import { Button, Alert } from '../components/ui';
import { useLanguage } from '../context/LanguageContext';
import { paymentApi } from '../api/client';

export function PaymentSettings() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('upi');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [paymentMethods, setPaymentMethods] = useState({
    upi: [{ id: 1, upiId: '', name: '' }],
    bank: { accountName: '', accountNumber: '', ifsc: '', bankName: '' },
    qr: null
  });

  // Load saved payment methods from server
  useEffect(() => {
    loadPaymentSettings();
  }, []);

  const loadPaymentSettings = async () => {
    try {
      const response = await paymentApi.get();
      const data = response.data;

      setPaymentMethods({
        upi: data.upiData && data.upiData.length > 0
          ? data.upiData
          : [{ id: 1, upiId: '', name: '' }],
        bank: data.bankAccount || { accountName: '', accountNumber: '', ifsc: '', bankName: '' },
        qr: data.qrCodeUrl || null
      });
      setPhoneNumber(data.phoneNumber || '');
    } catch (e) {
      console.error('Failed to load payment settings:', e);
      // Use defaults if API fails
    } finally {
      setLoading(false);
    }
  };

  const handleUpiChange = (index, field, value) => {
    const newUpi = [...paymentMethods.upi];
    newUpi[index][field] = value;
    setPaymentMethods({ ...paymentMethods, upi: newUpi });
  };

  const addUpi = () => {
    setPaymentMethods({
      ...paymentMethods,
      upi: [...paymentMethods.upi, { id: Date.now(), upiId: '', name: '' }]
    });
  };

  const removeUpi = (index) => {
    if (paymentMethods.upi.length > 1) {
      const newUpi = paymentMethods.upi.filter((_, i) => i !== index);
      setPaymentMethods({ ...paymentMethods, upi: newUpi });
    }
  };

  const handleBankChange = (field, value) => {
    setPaymentMethods({
      ...paymentMethods,
      bank: { ...paymentMethods.bank, [field]: value }
    });
  };

  const handleQrUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPaymentMethods({ ...paymentMethods, qr: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await paymentApi.save({
        upiData: paymentMethods.upi,
        bankAccount: paymentMethods.bank,
        qrCodeUrl: paymentMethods.qr,
        phoneNumber: phoneNumber
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error('Failed to save payment settings:', e);
      setError('Failed to save payment settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'upi', label: t('upi'), icon: Smartphone },
    { id: 'bank', label: t('bank_account'), icon: Building2 },
    { id: 'qr', label: t('qr_code'), icon: QrCode },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 py-8 text-zinc-900">
      <div className="mx-auto max-w-3xl">
        {/* Page Header */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-zinc-100 border border-zinc-200 rounded-md text-xs font-medium text-zinc-800 mb-2">
            {t('direct_buyer_settlement')}
          </div>
          <h1 className="text-xl font-semibold text-zinc-900 tracking-tight mb-1">{t('payment_title') || 'Payment & Settlement Settings'}</h1>
          <p className="text-zinc-500 text-xs sm:text-sm">
            {t('payment_subtitle') || 'Configure your UPI, Bank Transfer and WhatsApp contact for zero-commission direct customer payments.'}
          </p>
        </div>

        {saved && (
          <Alert type="success" message={t('payment_saved') || 'Payment details saved successfully!'} className="mb-4" />
        )}

        {error && (
          <Alert type="error" message={error} className="mb-4" onClose={() => setError('')} />
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin rounded-full h-7 w-7 border-2 border-zinc-900 border-t-transparent mb-2.5"></div>
            <p className="text-xs text-zinc-500">{t('loading_payment')}</p>
          </div>
        ) : (
          <>
            {/* WhatsApp Phone Number Card */}
            <div className="merchant-card p-5 mb-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-zinc-900 rounded-md flex items-center justify-center text-white">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900 text-sm">{t('whatsapp_number') || 'WhatsApp Business Number'}</h3>
                  <p className="text-xs text-zinc-500">{t('whatsapp_number_desc') || 'Buyers on your public storefront can send order inquiries to this number.'}</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <div className="flex-1">
                  <input
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9+]/g, ''))}
                    placeholder="+91 9876543210"
                    type="tel"
                    className="w-full px-3 py-2 rounded-md border border-zinc-200 text-zinc-900 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 min-h-[40px]"
                  />
                </div>
                <Button
                  variant="primary"
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 min-h-[40px] text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>{saving ? t('saving_btn') : t('save_number')}</span>
                </Button>
              </div>
              <p className="text-[11px] text-zinc-400">{t('whatsapp_format') || 'Include country code (e.g., +91 for India)'}</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1.5 mb-5 bg-zinc-100 p-1 rounded-md border border-zinc-200/80">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded text-xs font-medium transition-all min-h-[38px] ${
                      isActive
                        ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                        : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-zinc-900' : 'text-zinc-500'}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* UPI Tab */}
            {activeTab === 'upi' && (
              <div className="merchant-card p-5 mb-5 space-y-4">
                <div>
                  <h3 className="font-semibold text-zinc-900 text-sm">{t('upi_id')} ({t('direct_upi_pay')})</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">{t('upi_sub')}</p>
                </div>

                <div className="space-y-3">
                  {paymentMethods.upi.map((upi, index) => (
                    <div key={upi.id} className="p-3.5 bg-zinc-50/70 rounded-md border border-zinc-200/80 space-y-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{t('upi')} #{index + 1}</span>
                        {paymentMethods.upi.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeUpi(index)}
                            className="text-rose-600 hover:text-rose-700 text-xs font-medium flex items-center gap-1 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{t('remove') || 'Remove'}</span>
                          </button>
                        )}
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-600 uppercase mb-1">{t('upi_id') || 'UPI ID / VPA'}</label>
                          <input
                            type="text"
                            value={upi.upiId}
                            onChange={(e) => handleUpiChange(index, 'upiId', e.target.value)}
                            placeholder="merchant@okhdfcbank"
                            className="w-full px-3 py-2 rounded-md border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 min-h-[40px]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-600 uppercase mb-1">{t('upi_name') || 'Payee Name'}</label>
                          <input
                            type="text"
                            value={upi.name}
                            onChange={(e) => handleUpiChange(index, 'name', e.target.value)}
                            placeholder="Store or Artisan Name"
                            className="w-full px-3 py-2 rounded-md border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 min-h-[40px]"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addUpi}
                    className="w-full py-2.5 border border-dashed border-zinc-300 rounded-md text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 flex items-center justify-center gap-1.5 text-xs font-medium transition-colors min-h-[40px]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t('add_upi') || '+ Add Another UPI ID'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Bank Tab */}
            {activeTab === 'bank' && (
              <div className="merchant-card p-5 mb-5 space-y-4">
                <div>
                  <h3 className="font-semibold text-zinc-900 text-sm">{t('bank_account_details') || 'Direct Bank Account Details'}</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">For NEFT / RTGS / IMPS payments from bulk buyers and institutional customers</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-600 uppercase mb-1">{t('account_name') || 'Account Holder Name'}</label>
                    <input
                      type="text"
                      value={paymentMethods.bank.accountName}
                      onChange={(e) => handleBankChange('accountName', e.target.value)}
                      placeholder="e.g. Anand Handicrafts"
                      className="w-full px-3 py-2 rounded-md border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 min-h-[40px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-600 uppercase mb-1">{t('account_number') || 'Account Number'}</label>
                    <input
                      type="text"
                      value={paymentMethods.bank.accountNumber}
                      onChange={(e) => handleBankChange('accountNumber', e.target.value)}
                      placeholder="e.g. 50100234567890"
                      className="w-full px-3 py-2 rounded-md border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 min-h-[40px]"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-600 uppercase mb-1">{t('ifsc_code') || 'IFSC Code'}</label>
                      <input
                        type="text"
                        value={paymentMethods.bank.ifsc}
                        onChange={(e) => handleBankChange('ifsc', e.target.value.toUpperCase())}
                        placeholder="e.g. SBIN0001234"
                        className="w-full px-3 py-2 rounded-md border border-zinc-200 text-sm uppercase text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 min-h-[40px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-600 uppercase mb-1">{t('bank_name') || 'Bank Name'}</label>
                      <input
                        type="text"
                        value={paymentMethods.bank.bankName}
                        onChange={(e) => handleBankChange('bankName', e.target.value)}
                        placeholder="e.g. State Bank of India"
                        className="w-full px-3 py-2 rounded-md border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 min-h-[40px]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* QR Tab */}
            {activeTab === 'qr' && (
              <div className="merchant-card p-5 mb-5">
                <div className="text-center">
                  {paymentMethods.qr ? (
                    <div className="space-y-3">
                      <div className="p-3 bg-zinc-50 border border-zinc-200/80 rounded-md inline-block max-w-xs mx-auto">
                        <img
                          src={paymentMethods.qr}
                          alt="Payment QR Code"
                          className="max-w-[200px] max-h-[200px] mx-auto rounded"
                        />
                      </div>
                      <div>
                        <button
                          type="button"
                          onClick={() => setPaymentMethods({ ...paymentMethods, qr: null })}
                          className="text-rose-600 hover:text-rose-700 text-xs font-medium inline-flex items-center gap-1 min-h-[36px]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{t('remove') || 'Remove this QR code'}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="block cursor-pointer">
                      <div className="py-10 px-6 border border-dashed border-zinc-300 rounded-md hover:border-zinc-400 hover:bg-zinc-50 transition-colors">
                        <QrCode className="w-10 h-10 mx-auto text-zinc-400 mb-2" />
                        <p className="text-xs font-semibold text-zinc-700">{t('upload_qr') || 'Upload Store QR Code (PhonePe, GPay, Paytm)'}</p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">PNG or JPG up to 5MB</p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleQrUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="mt-5">
              <Button
                variant="primary"
                className="w-full min-h-[42px] text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5"
                onClick={handleSave}
                disabled={saving}
              >
                <CheckCircle className="w-4 h-4" />
                {saving ? (t('saving_text') || 'Saving Changes...') : (t('save_payment') || 'Save All Payment Settings')}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
