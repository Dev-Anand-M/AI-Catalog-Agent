import { Link } from 'react-router-dom';
import { Mic, Camera, Globe, Store, Sparkles, Languages, Smartphone, Wifi, Shield, Users, ArrowRight, CheckCircle, Volume2, Eye } from 'lucide-react';
import { Button } from '../components/ui';
import { Container } from '../components/layout';
import { useLanguage } from '../context/LanguageContext';
import { LanguageSelector } from '../components/LanguageSelector';

export function Landing() {
  const { t } = useLanguage();
  
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-600 via-primary-500 to-accent-500 py-20 text-white">
        <Container>
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center bg-white/20 rounded-full px-4 py-2 mb-6">
              <Sparkles className="w-4 h-4 mr-2" />
              <span className="text-sm font-medium">AI-Powered Digital Catalog Agent</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              {t('hero_title')}
            </h1>
            <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
              {t('hero_subtitle')}
            </p>
            
            {/* Language Selection */}
            <div className="mb-8">
              <p className="text-primary-200 text-sm mb-3">{t('choose_language')} / अपनी भाषा चुनें</p>
              <div className="flex justify-center">
                <LanguageSelector variant="buttons" />
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/signup">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                  {t('get_started')}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link to="/demo">
                <Button variant="outline" size="lg" className="w-full sm:w-auto border-white text-white hover:bg-white/10">
                  {t('try_demo')}
                </Button>
              </Link>
            </div>
            
            {/* Trust Badges */}
            <div className="mt-12 flex flex-wrap justify-center gap-6 text-primary-100">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                <span>{t('free_to_use')}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                <span>{t('indian_languages')}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                <span>{t('ai_powered')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                <span>{t('accessibility_ready')}</span>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Accessibility Feature Banner */}
      <section className="py-6 bg-primary-50 border-b border-primary-100">
        <Container>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-center md:text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center">
                <Volume2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{t('voice_commands_enabled')}</p>
                <p className="text-sm text-gray-600">{t('voice_commands_help')}</p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-white">
        <Container>
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t('powerful_features')}
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {t('features_subtitle')}
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Mic className="w-8 h-8" />}
              title="Voice Input"
              description="Simply speak to describe your products. Our AI understands Hindi, Tamil, Telugu, Kannada, Bengali, and English."
              color="primary"
            />
            <FeatureCard
              icon={<Camera className="w-8 h-8" />}
              title="Photo Capture"
              description="Take a photo of your product and let AI generate the description automatically."
              color="accent"
            />
            <FeatureCard
              icon={<Sparkles className="w-8 h-8" />}
              title="AI Descriptions"
              description="Get professional product descriptions, categories, and pricing suggestions instantly."
              color="primary"
            />
            <FeatureCard
              icon={<Languages className="w-8 h-8" />}
              title="Multi-Language"
              description="Create catalogs in your local language. Auto-translate to reach more customers."
              color="accent"
            />
            <FeatureCard
              icon={<Smartphone className="w-8 h-8" />}
              title="Mobile-First"
              description="Designed for smartphones. Easy to use even with basic phones and slow internet."
              color="primary"
            />
            <FeatureCard
              icon={<Globe className="w-8 h-8" />}
              title="Share Anywhere"
              description="Share your catalog link on WhatsApp, Facebook, or any platform to reach customers."
              color="accent"
            />
          </div>
        </Container>
      </section>

      {/* Problem Section */}
      <section className="py-20 bg-gray-50">
        <Container>
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Challenges We Solve
            </h2>
            <p className="text-xl text-gray-600">
              Small businesses face real barriers to going digital
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <ProblemCard
              icon={<Store className="w-10 h-10 text-red-500" />}
              title="Low Digital Skills"
              description="Many shopkeepers find technology confusing. Complex apps and forms are overwhelming."
              solution="Our voice-first approach needs no typing or technical knowledge."
            />
            <ProblemCard
              icon={<Languages className="w-10 h-10 text-red-500" />}
              title="Language Barriers"
              description="Most digital tools are in English, excluding millions who prefer local languages."
              solution="Full support for Hindi, Tamil, Telugu, Kannada, Bengali, and English."
            />
            <ProblemCard
              icon={<Globe className="w-10 h-10 text-red-500" />}
              title="No Online Presence"
              description="Without a catalog, businesses miss opportunities to reach new customers online."
              solution="Create shareable catalogs in minutes, not days."
            />
          </div>
        </Container>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <Container>
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600">
              Create your first product listing in under 2 minutes
            </p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-8">
            <StepCard
              number="1"
              title="Choose Language"
              description="Select your preferred language from 6 Indian languages"
            />
            <StepCard
              number="2"
              title="Describe Product"
              description="Speak, type, or take a photo of your product"
            />
            <StepCard
              number="3"
              title="AI Generates"
              description="AI creates professional name, description & category"
            />
            <StepCard
              number="4"
              title="Share Catalog"
              description="Share your catalog link with customers"
            />
          </div>
        </Container>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-primary-600 text-white">
        <Container>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <StatCard number="6" label="Languages Supported" />
            <StatCard number="3" label="Input Methods" />
            <StatCard number="5" label="Product Categories" />
            <StatCard number="∞" label="Products You Can Add" />
          </div>
        </Container>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-accent-500 to-accent-600">
        <Container>
          <div className="text-center text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Digitize Your Business?
            </h2>
            <p className="text-xl text-accent-100 mb-8 max-w-2xl mx-auto">
              Join thousands of small businesses already using Digital Catalog Agent. 
              It's free, easy, and works in your language.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/signup">
                <Button variant="secondary" size="lg">
                  Create Your Catalog Now
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
            <p className="mt-6 text-accent-200 text-sm">
              Supporting Digital India initiative • Made for Bharat 🇮🇳
            </p>
          </div>
        </Container>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, description, color }) {
  const colorClasses = color === 'primary' 
    ? 'bg-primary-100 text-primary-600' 
    : 'bg-accent-100 text-accent-600';
  
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-shadow border border-gray-100">
      <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl mb-4 ${colorClasses}`}>
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function ProblemCard({ icon, title, description, solution }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-red-50 rounded-full mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-4">{description}</p>
      <div className="bg-green-50 rounded-lg p-3 border border-green-100">
        <p className="text-green-700 text-sm">
          <CheckCircle className="w-4 h-4 inline mr-1" />
          {solution}
        </p>
      </div>
    </div>
  );
}

function StepCard({ number, title, description }) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-500 text-white rounded-full text-xl font-bold mb-4">
        {number}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  );
}

function StatCard({ number, label }) {
  return (
    <div>
      <div className="text-4xl md:text-5xl font-bold mb-2">{number}</div>
      <div className="text-primary-200">{label}</div>
    </div>
  );
}
