import { useState, useEffect } from 'react';
import { Building2, Smartphone, QrCode, CheckCircle, Plus, Trash2 } from 'lucide-react';
import { Button, Input, Alert, Card, CardBody } from '../components/ui';
import { Container } from '../components/layout';
import { useLanguage } from '../context/LanguageContext';
import { paymentApi } from '../api/client';

export function PaymentSettings() {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState('upi');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
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
      
      // Map API response to component state format
      setPaymentMethods({
        upi: data.upiData && data.upiData.length > 0 
          ? data.upiData 
          : [{ id: 1, upiId: '', name: '' }],
        bank: data.bankAccount || { accountName: '', accountNumber: '', ifsc: '', bankName: '' },
        qr: data.qrCodeUrl || null
      });
    } catch (e) {
      console.error('Failed to load payment settings:', e);
      // Use defaults if API fails
    } finally {
      setLoading(false);
    }
  };

  const labels = {
    en: {
      title: 'Payment Settings',
      subtitle: 'Add your payment details to receive payments from customers',
      upi: 'UPI',
      bank: 'Bank Account',
      qr: 'QR Code',
      upiId: 'UPI ID',
      upiName: 'Name on UPI',
      addUpi: 'Add Another UPI',
      accountName: 'Account Holder Name',
      accountNumber: 'Account Number',
      ifsc: 'IFSC Code',
      bankName: 'Bank Name',
      uploadQr: 'Upload QR Code',
      save: 'Save Payment Details',
      saved: 'Payment details saved successfully!',
      remove: 'Remove',
      placeholder: {
        upiId: 'yourname@upi',
        upiName: 'Your Name',
        accountName: 'Account Holder Name',
        accountNumber: '1234567890',
        ifsc: 'SBIN0001234',
        bankName: 'State Bank of India'
      }
    },
    hi: {
      title: 'भुगतान सेटिंग्स',
      subtitle: 'ग्राहकों से भुगतान प्राप्त करने के लिए अपना भुगतान विवरण जोड़ें',
      upi: 'यूपीआई',
      bank: 'बैंक खाता',
      qr: 'क्यूआर कोड',
      upiId: 'यूपीआई आईडी',
      upiName: 'यूपीआई पर नाम',
      addUpi: 'एक और यूपीआई जोड़ें',
      accountName: 'खाताधारक का नाम',
      accountNumber: 'खाता संख्या',
      ifsc: 'आईएफएससी कोड',
      bankName: 'बैंक का नाम',
      uploadQr: 'क्यूआर कोड अपलोड करें',
      save: 'भुगतान विवरण सहेजें',
      saved: 'भुगतान विवरण सफलतापूर्वक सहेजा गया!',
      remove: 'हटाएं',
      placeholder: {
        upiId: 'yourname@upi',
        upiName: 'आपका नाम',
        accountName: 'खाताधारक का नाम',
        accountNumber: '1234567890',
        ifsc: 'SBIN0001234',
        bankName: 'भारतीय स्टेट बैंक'
      }
    }
  };

  const l = labels[language] || labels.en;

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
      // Map component state to API format
      await paymentApi.save({
        upiData: paymentMethods.upi,
        bankAccount: paymentMethods.bank,
        qrCodeUrl: paymentMethods.qr
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
    { id: 'upi', label: l.upi, icon: Smartphone },
    { id: 'bank', label: l.bank, icon: Building2 },
    { id: 'qr', label: l.qr, icon: QrCode },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <Container>
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{l.title}</h1>
            <p className="text-gray-600">{l.subtitle}</p>
          </div>

          {saved && (
            <Alert type="success" message={l.saved} className="mb-6" />
          )}
          
          {error && (
            <Alert type="error" message={error} className="mb-6" onClose={() => setError('')} />
          )}

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
          ) : (
            <>
            {/* Tabs */}
          <div className="flex gap-2 mb-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary-500 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* UPI Tab */}
          {activeTab === 'upi' && (
            <Card>
              <CardBody>
                <div className="space-y-6">
                  {paymentMethods.upi.map((upi, index) => (
                    <div key={upi.id} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center mb-4">
                        <span className="font-medium text-gray-700">UPI {index + 1}</span>
                        {paymentMethods.upi.length > 1 && (
                          <button
                            onClick={() => removeUpi(index)}
                            className="text-red-500 hover:text-red-600 text-sm flex items-center gap-1"
                          >
                            <Trash2 className="w-4 h-4" />
                            {l.remove}
                          </button>
                        )}
                      </div>
                      <div className="grid gap-4">
                        <Input
                          label={l.upiId}
                          value={upi.upiId}
                          onChange={(e) => handleUpiChange(index, 'upiId', e.target.value)}
                          placeholder={l.placeholder.upiId}
                        />
                        <Input
                          label={l.upiName}
                          value={upi.name}
                          onChange={(e) => handleUpiChange(index, 'name', e.target.value)}
                          placeholder={l.placeholder.upiName}
                        />
                      </div>
                    </div>
                  ))}
                  
                  <button
                    onClick={addUpi}
                    className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-primary-500 hover:text-primary-500 flex items-center justify-center gap-2 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    {l.addUpi}
                  </button>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Bank Tab */}
          {activeTab === 'bank' && (
            <Card>
              <CardBody>
                <div className="space-y-4">
                  <Input
                    label={l.accountName}
                    value={paymentMethods.bank.accountName}
                    onChange={(e) => handleBankChange('accountName', e.target.value)}
                    placeholder={l.placeholder.accountName}
                  />
                  <Input
                    label={l.accountNumber}
                    value={paymentMethods.bank.accountNumber}
                    onChange={(e) => handleBankChange('accountNumber', e.target.value)}
                    placeholder={l.placeholder.accountNumber}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label={l.ifsc}
                      value={paymentMethods.bank.ifsc}
                      onChange={(e) => handleBankChange('ifsc', e.target.value.toUpperCase())}
                      placeholder={l.placeholder.ifsc}
                    />
                    <Input
                      label={l.bankName}
                      value={paymentMethods.bank.bankName}
                      onChange={(e) => handleBankChange('bankName', e.target.value)}
                      placeholder={l.placeholder.bankName}
                    />
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {/* QR Tab */}
          {activeTab === 'qr' && (
            <Card>
              <CardBody>
                <div className="text-center">
                  {paymentMethods.qr ? (
                    <div className="space-y-4">
                      <img
                        src={paymentMethods.qr}
                        alt="Payment QR Code"
                        className="max-w-xs mx-auto rounded-lg border"
                      />
                      <button
                        onClick={() => setPaymentMethods({ ...paymentMethods, qr: null })}
                        className="text-red-500 hover:text-red-600 text-sm"
                      >
                        {l.remove}
                      </button>
                    </div>
                  ) : (
                    <label className="block cursor-pointer">
                      <div className="py-12 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 transition-colors">
                        <QrCode className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-500">{l.uploadQr}</p>
                        <p className="text-sm text-gray-400 mt-1">PNG, JPG up to 5MB</p>
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
              </CardBody>
            </Card>
          )}

          {/* Save Button */}
          <div className="mt-6">
            <Button variant="primary" className="w-full" onClick={handleSave} disabled={saving}>
              <CheckCircle className="w-5 h-5 mr-2" />
              {saving ? 'Saving...' : l.save}
            </Button>
          </div>
          </>
          )}
        </div>
      </Container>
    </div>
  );
}
