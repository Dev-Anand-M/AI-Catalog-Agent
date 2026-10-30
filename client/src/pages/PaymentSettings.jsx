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
      const data = response.data || {};

      // The API returns `upi`/`bank`/`qr`; the older `upiData`/`bankAccount`
      // shape is still accepted so an out-of-date server cannot blank the form.
      const upi = data.upi ?? data.upiData;
      const bank = data.bank ?? data.bankAccount;
      const qr = data.qr ?? data.qrCodeUrl;

      setPaymentMethods({
        upi: Array.isArray(upi) && upi.length > 0
          ? upi
          : [{ id: 1, upiId: '', name: '' }],
        bank: bank || { accountName: '', accountNumber: '', ifsc: '', bankName: '' },
        qr: qr || null
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

  const isValidUpi = (val) => {
    if (!val || typeof val !== 'string') return false;
    return /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(val.trim());
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');

    // Ensure all non-empty UPI IDs are in valid format
    for (let i = 0; i < paymentMethods.upi.length; i++) {
      const upi = paymentMethods.upi[i];
      const trimmed = (upi.upiId || '').trim();
      if (trimmed && !isValidUpi(trimmed)) {
        setError(`"${trimmed}" is not a valid UPI ID. Format must be username@bank (e.g. 9876543210@paytm or artisan@okhdfcbank).`);
        setSaving(false);
        return;
      }
    }

    try {
      await paymentApi.save({
        upi: paymentMethods.upi.filter(u => (u.upiId || '').trim()),
        bank: paymentMethods.bank,
        qr: null,
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
    { id: 'upi', label: 'UPI & QR Code', icon: Smartphone },
    { id: 'bank', label: t('bank_account') || 'Bank Account', icon: Building2 },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8 text-gray-900">
      <div className="mx-auto max-w-3xl">
        {/* Page Header */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-gray-100 border border-gray-200 rounded-md text-xs font-medium text-gray-800 mb-2">
            {t('direct_buyer_settlement')}
          </div>
          <h1 className="text-xl font-semibold text-gray-900 tracking-tight mb-1">{t('payment_title') || 'Payment & Settlement Settings'}</h1>
          <p className="text-gray-500 text-xs sm:text-sm">
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
            <div className="animate-spin rounded-full h-7 w-7 border-2 border-primary-600 border-t-transparent mb-2.5"></div>
            <p className="text-xs text-gray-500">{t('loading_payment')}</p>
          </div>
        ) : (
          <>
            {/* WhatsApp Phone Number Card */}
            <div className="merchant-card p-5 mb-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-primary-600 rounded-md flex items-center justify-center text-white">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">{t('whatsapp_number') || 'WhatsApp Business Number'}</h3>
                  <p className="text-xs text-gray-500">{t('whatsapp_number_desc') || 'Buyers on your public storefront can send order inquiries to this number.'}</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <div className="flex-1">
                  <input
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9+]/g, ''))}
                    placeholder="+91 9876543210"
                    type="tel"
                    className="w-full px-3 py-2 rounded-md border border-gray-200 text-gray-900 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-600 min-h-[40px]"
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
              <p className="text-[11px] text-gray-400">{t('whatsapp_format') || 'Include country code (e.g., +91 for India)'}</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1.5 mb-5 bg-gray-100 p-1 rounded-md border border-gray-200/80">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded text-xs font-medium transition-all min-h-[38px] ${
                      isActive
                        ? 'bg-white text-gray-900 shadow-2xs font-semibold'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-gray-900' : 'text-gray-500'}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* UPI & QR Code Integrated Tab */}
            {activeTab === 'upi' && (
              <div className="merchant-card p-5 mb-5 space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">{t('upi_id', 'UPI ID & Storefront QR Code')}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Enter your UPI handle (Google Pay, PhonePe, Paytm, BHIM). A verified QR code is automatically generated for your catalog storefront.
                  </p>
                </div>

                <div className="space-y-3">
                  {paymentMethods.upi.map((upi, index) => {
                    const trimmed = (upi.upiId || '').trim();
                    const hasInput = trimmed.length > 0;
                    const isUpiValid = hasInput && isValidUpi(trimmed);

                    return (
                      <div key={upi.id} className="p-3.5 bg-gray-50/70 rounded-md border border-gray-200/80 space-y-2.5">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold tracking-normal text-gray-500">UPI Handle #{index + 1}</span>
                            {hasInput && (
                              isUpiValid ? (
                                <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  <CheckCircle className="w-3 h-3 text-emerald-600" /> Valid UPI
                                </span>
                              ) : (
                                <span className="text-[10px] text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                  Must be username@bank (e.g. 9876543210@paytm)
                                </span>
                              )
                            )}
                          </div>
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
                            <label className="block text-xs font-semibold text-gray-600 mb-1">{t('upi_id') || 'UPI ID / VPA'}</label>
                            <input
                              type="text"
                              value={upi.upiId}
                              onChange={(e) => handleUpiChange(index, 'upiId', e.target.value)}
                              placeholder="e.g. 9876543210@paytm or artisan@okhdfcbank"
                              className={`w-full px-3 py-2 rounded-md border text-sm text-gray-900 focus:outline-none min-h-[40px] ${
                                hasInput && !isUpiValid
                                  ? 'border-amber-300 focus:ring-1 focus:ring-amber-500 bg-amber-50/20'
                                  : 'border-gray-200 focus:ring-1 focus:ring-primary-500 focus:border-primary-600'
                              }`}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">{t('upi_name') || 'Payee Name'}</label>
                            <input
                              type="text"
                              value={upi.name}
                              onChange={(e) => handleUpiChange(index, 'name', e.target.value)}
                              placeholder="Store or Artisan Name"
                              className="w-full px-3 py-2 rounded-md border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-600 min-h-[40px]"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    onClick={addUpi}
                    className="w-full py-2.5 border border-dashed border-gray-300 rounded-md text-gray-600 hover:border-gray-400 hover:text-gray-900 hover:bg-gray-50 flex items-center justify-center gap-1.5 text-xs font-medium transition-colors min-h-[40px]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t('add_upi') || '+ Add Another UPI ID'}</span>
                  </button>

                  {/* Live Auto-Generated QR Code Preview */}
                  {(() => {
                    const primaryValidUpi = paymentMethods.upi.find(u => isValidUpi(u.upiId));
                    if (primaryValidUpi) {
                      const qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(`upi://pay?pa=${primaryValidUpi.upiId.trim()}&pn=${encodeURIComponent(primaryValidUpi.name || 'Merchant')}&cu=INR`)}`;
                      return (
                        <div className="mt-4 p-4 bg-emerald-50/60 border border-emerald-200/90 rounded-xl flex flex-col sm:flex-row items-center gap-4">
                          <div className="w-36 h-36 bg-white p-2 rounded-lg border border-emerald-200 shadow-2xs flex-shrink-0 flex items-center justify-center">
                            <img
                              src={qrDataUrl}
                              alt="Live Generated UPI QR Code"
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div className="space-y-1.5 text-center sm:text-left">
                            <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                              <CheckCircle className="w-3 h-3 text-emerald-600" /> Live Storefront QR Preview
                            </div>
                            <h4 className="text-sm font-semibold text-gray-900">
                              Auto-Generated from <span className="font-mono text-emerald-800">{primaryValidUpi.upiId.trim()}</span>
                            </h4>
                            <p className="text-xs text-gray-600 leading-relaxed">
                              When customers browse your digital catalog, this QR code will be displayed automatically. Any customer can scan this using Google Pay, PhonePe, Paytm, or BHIM.
                            </p>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div className="mt-4 p-4 bg-gray-50 border border-dashed border-gray-300 rounded-xl flex items-center justify-center gap-3 text-gray-500 text-xs">
                        <QrCode className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <span>Enter a valid UPI handle above to generate your live storefront QR code.</span>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Bank Tab */}
            {activeTab === 'bank' && (
              <div className="merchant-card p-5 mb-5 space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">{t('bank_account_details') || 'Direct Bank Account Details'}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">For NEFT / RTGS / IMPS payments from bulk buyers and institutional customers</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">{t('account_name') || 'Account Holder Name'}</label>
                    <input
                      type="text"
                      value={paymentMethods.bank.accountName}
                      onChange={(e) => handleBankChange('accountName', e.target.value)}
                      placeholder="e.g. Anand Handicrafts"
                      className="w-full px-3 py-2 rounded-md border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-600 min-h-[40px]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">{t('account_number') || 'Account Number'}</label>
                    <input
                      type="text"
                      value={paymentMethods.bank.accountNumber}
                      onChange={(e) => handleBankChange('accountNumber', e.target.value)}
                      placeholder="e.g. 50100234567890"
                      className="w-full px-3 py-2 rounded-md border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-600 min-h-[40px]"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">{t('ifsc_code') || 'IFSC Code'}</label>
                      <input
                        type="text"
                        value={paymentMethods.bank.ifsc}
                        onChange={(e) => handleBankChange('ifsc', e.target.value.toUpperCase())}
                        placeholder="e.g. SBIN0001234"
                        className="w-full px-3 py-2 rounded-md border border-gray-200 text-sm uppercase text-gray-900 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-600 min-h-[40px]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">{t('bank_name') || 'Bank Name'}</label>
                      <input
                        type="text"
                        value={paymentMethods.bank.bankName}
                        onChange={(e) => handleBankChange('bankName', e.target.value)}
                        placeholder="e.g. State Bank of India"
                        className="w-full px-3 py-2 rounded-md border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-600 min-h-[40px]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Save Button — right-aligned at its natural width. Full-width it
                read as a banner and competed with the page heading. */}
            <div className="mt-6 flex justify-end">
              <Button
                variant="primary"
                className="px-6 min-h-[42px] text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5"
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
