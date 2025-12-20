import { useState, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { authApi } from '../api/client';
import { Button, Input, Alert } from '../components/ui';
import { Container } from '../components/layout';

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const errorKey = useRef(0);

  const from = location.state?.from?.pathname || '/dashboard';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authApi.login(formData);
      login(response.data.token, response.data.user);
      navigate(from, { replace: true });
    } catch (err) {
      errorKey.current += 1;
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('Something went wrong. Please try again.');
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
            <h1 className="text-3xl font-bold text-gray-900">{t('login_title')}</h1>
            <p className="text-gray-600 mt-2">Login to manage your catalog</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-8">
            {error && (
              <Alert key={errorKey.current} type="error" message={error} className="mb-6" />
            )}

            <form onSubmit={handleSubmit}>
              <Input
                label={t('email')}
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                required
              />

              <Input
                label={t('password')}
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                required
              />

              <Button
                type="submit"
                variant="primary"
                disabled={loading}
                className="w-full mt-4"
              >
                {loading ? 'Logging in...' : t('login_btn')}
              </Button>
            </form>

            <p className="text-center text-gray-600 mt-6">
              {t('no_account')}{' '}
              <Link to="/signup" className="text-primary-600 hover:text-primary-700 font-medium">
                {t('nav_signup')}
              </Link>
            </p>
          </div>
        </div>
      </Container>
    </div>
  );
}
