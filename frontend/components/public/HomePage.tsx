import React from 'react';
const features = [
  {
    title: 'AI-Powered Form Generation',
    detail: 'Upload legislation PDFs or describe your program requirements. Our AI analyzes compliance documents and automatically generates structured data collection forms with proper validation rules, field types, and workflows.'
  },
  {
    title: 'Offline-First Architecture',
    detail: 'Built for field workers in low-connectivity environments. Collect data without internet using local storage, then sync automatically when connected. All data is stored locally first, ensuring zero data loss.'
  },
  {
    title: 'Open Source & Free',
    detail: 'Completely free and open source. Share custom templates through the marketplace. Deploy on your own infrastructure or use our hosted version. No vendor lock-in, no hidden costs.'
  },
  {
    title: 'Zero Code Required',
    detail: 'No developers needed. Upload documents, customize forms through a visual interface, and deploy instantly. Export data to Excel, PDF, or integrate with your existing systems via API.'
  }
];

const useCases = [
  {
    title: 'Health Clinics',
    example: 'Track maternal health visits against WHO standards, manage patient records, monitor vaccination schedules',
    icon: '🏥'
  },
  {
    title: 'Housing Services',
    example: 'Emergency shelter intake, case management workflows, housing assistance applications',
    icon: '🏠'
  },
  {
    title: 'Legal Aid',
    example: 'Family violence risk assessments (MARAM compliant), client intake, case tracking',
    icon: '⚖️'
  },
  {
    title: 'Education Programs',
    example: 'Student outcome tracking, program effectiveness monitoring, attendance management',
    icon: '📚'
  },
  {
    title: 'Relief Operations',
    example: 'Emergency response coordination, resource distribution tracking, beneficiary registration',
    icon: '🆘'
  },
  {
    title: 'Agriculture',
    example: 'Crop yield tracking, farmer support programs, agricultural extension services',
    icon: '🌾'
  }
];

const technicalFeatures = [
  {
    title: 'Smart Document Processing',
    description: 'Upload PDFs, Word docs, or text files. Our AI extracts requirements, identifies data fields, and understands compliance rules automatically.'
  },
  {
    title: 'Structured Data Models',
    description: 'Generates proper database schemas with relationships, validation rules, and business logic based on your requirements.'
  },
  {
    title: 'Progressive Web App',
    description: 'Works on any device—desktop, tablet, or mobile. Install as an app or use in browser. Automatic updates, no app store required.'
  },
  {
    title: 'Template Marketplace',
    description: 'Browse 26+ pre-built templates for common use cases. Share your custom templates with the community or keep them private.'
  }
];

interface HomePageProps {
  onNavigate: (path: string) => void;
}

const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  return (
    <div>
      <section className="bg-gradient-to-b from-white via-emerald-50/30 to-white">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-200 bg-white text-emerald-700 text-xs font-bold">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              Open Source • AI-Powered • Offline-First
            </div>

            <h1 className="text-5xl md:text-7xl font-black leading-tight text-slate-900">
              Turn legislation into working software
            </h1>

            <p className="text-xl md:text-2xl text-slate-600 leading-relaxed max-w-3xl mx-auto">
              Chameleon is an AI-powered platform that reads compliance documents and automatically generates
              complete data collection applications. Built for NGOs, government agencies, and social programs
              that need custom software without the cost or complexity.
            </p>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 text-left max-w-2xl mx-auto">
              <p className="text-sm text-slate-700 leading-relaxed">
                <strong className="text-slate-900">What it actually does:</strong> Upload a PDF of housing regulations,
                health protocols, or program requirements. Chameleon's AI analyzes the document, identifies required
                data fields, creates validation rules, and generates a complete web application with forms, workflows,
                and data management—ready to use in minutes.
              </p>
            </div>

            <div className="flex flex-wrap gap-4 justify-center pt-4">
              <button
                onClick={() => onNavigate('/app')}
                className="px-8 py-4 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg hover:shadow-xl"
              >
                Try It Now →
              </button>
              <a
                href="https://github.com/raavin/Chameleon"
                target="_blank"
                rel="noreferrer"
                className="px-8 py-4 rounded-xl border-2 border-slate-300 text-slate-700 text-sm font-bold hover:bg-white hover:border-slate-400 transition-all inline-flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/>
                </svg>
                View on GitHub
              </a>
            </div>

            <div className="pt-8 flex items-center justify-center gap-8 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
                No credit card
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
                Free forever
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
                Open source
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 md:px-12 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">
            How it works
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            From compliance documents to production-ready application in three steps
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto text-2xl font-black text-emerald-600">
              1
            </div>
            <h3 className="text-xl font-bold text-slate-900">Upload or Describe</h3>
            <p className="text-slate-600">
              Upload PDFs of regulations, legislation, or program guidelines. Or simply describe your needs:
              "Track maternal health visits in rural Kenya" or "Manage emergency housing applications."
            </p>
          </div>

          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto text-2xl font-black text-emerald-600">
              2
            </div>
            <h3 className="text-xl font-bold text-slate-900">AI Generates Application</h3>
            <p className="text-slate-600">
              Our AI analyzes requirements, extracts data fields, creates validation rules, designs workflows,
              and generates a complete application manifest with forms, logic, and database schema.
            </p>
          </div>

          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto text-2xl font-black text-emerald-600">
              3
            </div>
            <h3 className="text-xl font-bold text-slate-900">Deploy & Collect</h3>
            <p className="text-slate-600">
              Use immediately on any device. Works offline, syncs when connected. Export to Excel/PDF,
              integrate via API, or share templates with other organizations through the marketplace.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">
              Technical capabilities
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Enterprise features without enterprise complexity or cost
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {technicalFeatures.map(feature => (
              <div key={feature.title} className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-all">
                <h3 className="text-lg font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 md:px-12 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">
            Built for real programs
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            From health clinics to housing services, Chameleon adapts to your domain
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {useCases.map(useCase => (
            <div key={useCase.title} className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-all">
              <div className="text-4xl mb-4">{useCase.icon}</div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{useCase.title}</h3>
              <p className="text-sm text-slate-600">{useCase.example}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 md:px-12 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">
            Why Chameleon?
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Purpose-built for organizations that need custom software but lack resources
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {features.map(feature => (
            <div key={feature.title} className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{feature.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-emerald-600 text-white">
        <div className="max-w-4xl mx-auto px-6 md:px-12 py-20 text-center space-y-8">
          <h2 className="text-4xl md:text-5xl font-black">
            Ready to get started?
          </h2>
          <p className="text-xl text-emerald-100">
            Generate your first data collection application in minutes. No signup, no credit card, no installation required.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={() => onNavigate('/app')}
              className="px-8 py-4 rounded-xl bg-white text-emerald-600 text-sm font-bold hover:bg-emerald-50 transition-all shadow-lg"
            >
              Launch Chameleon →
            </button>
            <a
              href="https://github.com/raavin/Chameleon"
              target="_blank"
              rel="noreferrer"
              className="px-8 py-4 rounded-xl border-2 border-white text-white text-sm font-bold hover:bg-emerald-700 transition-all inline-flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/>
              </svg>
              Star on GitHub
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
