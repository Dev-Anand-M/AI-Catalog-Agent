import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { authApi } from '../api/client';
import { Button, Input, Alert } from '../components/ui';
import { Container } from '../components/layout';

export function Signup() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [fieldErrors, setFieldErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear field error when user types
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setLoading(true);

    try {
      const response = await authApi.signup(formData);
      login(response.data.token, response.data.user);
      navigate('/dashboard');
    } catch (err) {
      if (err.response?.data?.details) {
        setFieldErrors(err.response.data.details);
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError(t('something_wrong'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <Container>
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">{t('signup_title')}</h1>
            <p className="text-gray-600 mt-2">{t('signup_subtitle')}</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-8">
            {error && (
              <Alert type="error" message={error} className="mb-6" />
            )}

            <form onSubmit={handleSubmit}>
              <Input
                label={t('full_name')}
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder={t('enter_name')}
                error={fieldErrors.name}
                required
              />

              <Input
                label={t('email')}
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder={t('enter_email')}
                error={fieldErrors.email}
                required
              />

              <Input
                label={t('password')}
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder={t('password_min')}
                error={fieldErrors.password}
                required
              />

              <Input
                label={t('confirm_password')}
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder={t('confirm_password_placeholder')}
                error={fieldErrors.confirmPassword}
                required
              />

              <Button
                type="submit"
                variant="primary"
                disabled={loading}
                className="w-full mt-4"
              >
                {loading ? t('creating_account') : t('signup_btn')}
              </Button>
            </form>

            <p className="text-center text-gray-600 mt-6">
              {t('have_account')}{' '}
              <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                {t('login_btn')}
              </Link>
            </p>
          </div>
        </div>
      </Container>
    </div>
  );
}
