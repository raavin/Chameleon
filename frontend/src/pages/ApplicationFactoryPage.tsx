/**
 * Application Factory Page - Chameleon Protocol
 * 
 * Full autonomous application generation interface
 */

import React, { useState } from 'react';
import { generateApplication, downloadApplication, type FactoryEvent, type FactoryResult } from '../services/factoryService';

interface GenerationPhase {
  name: string;
  status: 'pending' | 'in-progress' | 'complete' | 'error';
  detail?: string;
  data?: any;
}

export default function ApplicationFactoryPage() {
  const [domain, setDomain] = useState('');
  const [region, setRegion] = useState('');
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [enableDeepResearch, setEnableDeepResearch] = useState(true);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [phases, setPhases] = useState<GenerationPhase[]>([
    { name: 'Deep Research', status: 'pending' },
    { name: 'Architecture Design', status: 'pending' },
    { name: 'Code Generation', status: 'pending' },
    { name: 'Packaging', status: 'pending' },
  ]);
  const [events, setEvents] = useState<FactoryEvent[]>([]);
  const [result, setResult] = useState<FactoryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!domain || !region) {
      setError('Domain and region are required');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResult(null);
    setEvents([]);
    setPhases([
      { name: 'Deep Research', status: 'pending' },
      { name: 'Architecture Design', status: 'pending' },
      { name: 'Code Generation', status: 'pending' },
      { name: 'Packaging', status: 'pending' },
    ]);

    try {
      const factoryResult = await generateApplication(
        {
          domain,
          region,
          projectName: projectName || undefined,
          description: description || undefined,
          enableDeepResearch,
        },
        (event: FactoryEvent) => {
          setEvents(prev => [...prev, event]);
          
          setPhases(prev => {
            const newPhases = [...prev];
            
            if (event.status.startsWith('research:')) {
              newPhases[0].status = 'in-progress';
              newPhases[0].detail = event.detail;
            } else if (event.status === 'factory:phase-1-complete') {
              newPhases[0].status = 'complete';
              newPhases[0].data = event;
            } else if (event.status.startsWith('architect:')) {
              newPhases[1].status = 'in-progress';
              newPhases[1].detail = event.detail;
            } else if (event.status === 'factory:phase-2-complete') {
              newPhases[1].status = 'complete';
              newPhases[1].data = event;
            } else if (event.status.startsWith('codegen:')) {
              newPhases[2].status = 'in-progress';
              newPhases[2].detail = event.detail;
            } else if (event.status === 'factory:phase-3-complete') {
              newPhases[2].status = 'complete';
              newPhases[2].data = event;
            } else if (event.status === 'factory:complete') {
              newPhases[3].status = 'complete';
              newPhases[3].data = event;
            }
            
            return newPhases;
          });
        }
      );

      setResult(factoryResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setPhases(prev => prev.map(p => 
        p.status === 'in-progress' ? { ...p, status: 'error' } : p
      ));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!result || !result.code?.files) return;

    try {
      const blob = await downloadApplication(
        result.code.files,
        projectName || domain.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      );

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName || 'chameleon-app'}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    }
  };

  const getPhaseIcon = (status: GenerationPhase['status']) => {
    switch (status) {
      case 'complete':
        return '✓';
      case 'in-progress':
        return '⟳';
      case 'error':
        return '✗';
      default:
        return '○';
    }
  };

  const getPhaseColor = (status: GenerationPhase['status']) => {
    switch (status) {
      case 'complete':
        return 'text-green-600';
      case 'in-progress':
        return 'text-blue-600 animate-spin';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
            Autonomous Application Factory
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            AI-powered system that researches, architects, and generates complete full-stack applications
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Application Configuration</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Domain / Industry *
              </label>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="e.g., Healthcare Compliance, Environmental Monitoring"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={isGenerating}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Region / Jurisdiction *
              </label>
              <input
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="e.g., California, European Union"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={isGenerating}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Name
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g., my-compliance-app"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={isGenerating}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of your application"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={isGenerating}
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={enableDeepResearch}
                onChange={(e) => setEnableDeepResearch(e.target.checked)}
                className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                disabled={isGenerating}
              />
              <span className="text-sm font-medium text-gray-700">
                Enable Deep Research (Recommended - uses Gemini 3 Pro + Google Search)
              </span>
            </label>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !domain || !region}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isGenerating ? 'Generating Application...' : 'Generate Application'}
          </button>
        </div>

        {(isGenerating || result) && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Generation Progress</h2>
            
            <div className="space-y-4 mb-8">
              {phases.map((phase, index) => (
                <div key={index} className="flex items-start space-x-4">
                  <div className={`text-2xl ${getPhaseColor(phase.status)}`}>
                    {getPhaseIcon(phase.status)}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{phase.name}</div>
                    {phase.detail && (
                      <div className="text-sm text-gray-600 mt-1">{phase.detail}</div>
                    )}
                    {phase.data && phase.data.modules && (
                      <div className="text-sm text-gray-500 mt-1">
                        Modules: {phase.data.modules.join(', ')}
                      </div>
                    )}
                    {phase.data && phase.data.filesByType && (
                      <div className="text-sm text-gray-500 mt-1">
                        Files: {Object.entries(phase.data.filesByType).map(([type, count]) => 
                          `${type}: ${count}`
                        ).join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {events.length > 0 && (
              <details className="mt-6">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                  View Detailed Logs ({events.length} events)
                </summary>
                <div className="mt-4 max-h-96 overflow-y-auto bg-gray-50 rounded-lg p-4 font-mono text-xs">
                  {events.map((event, index) => (
                    <div key={index} className="mb-2 text-gray-700">
                      <span className="text-purple-600">[{event.status}]</span> {event.detail}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}

        {result && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Application Generated!</h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-3xl font-bold text-purple-600">
                  {result.architecture?.modules?.length || 0}
                </div>
                <div className="text-sm text-gray-600">Modules</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-3xl font-bold text-blue-600">
                  {result.architecture?.database?.tables?.length || 0}
                </div>
                <div className="text-sm text-gray-600">Database Tables</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-3xl font-bold text-green-600">
                  {result.code?.summary?.totalFiles || 0}
                </div>
                <div className="text-sm text-gray-600">Files Generated</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="text-3xl font-bold text-orange-600">
                  {result.research?.sources?.length || 0}
                </div>
                <div className="text-sm text-gray-600">Research Sources</div>
              </div>
            </div>

            <button
              onClick={handleDownload}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:from-green-700 hover:to-emerald-700 transition-all"
            >
              Download Application (.zip)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
