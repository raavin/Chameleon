export interface FactoryEvent {
  status: string;
  detail?: string;
  data?: any;
}

export interface FactoryResult {
  success: boolean;
  projectId?: string;
  downloadUrl?: string;
  manifests?: any[];
  error?: string;
  architecture?: {
    modules: any[];
    database?: {
      tables?: any[];
    };
  };
  code?: {
    files: any[];
    summary: {
      totalFiles: number;
    };
  };
  research?: {
    sources: any[];
  };
}

export interface FactoryInput {
  domain: string;
  region: string;
  projectName?: string;
  description?: string;
  enableDeepResearch?: boolean;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export async function generateApplication(
  input: FactoryInput,
  onEvent: (event: FactoryEvent) => void
): Promise<FactoryResult> {
  const response = await fetch(`${API_BASE}/api/factory/generate-application`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`Factory generation failed: ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  let result: FactoryResult = { success: false };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const text = decoder.decode(value, { stream: true });
    const lines = text.split('\n').filter(line => line.startsWith('data: '));

    for (const line of lines) {
      try {
        const data = JSON.parse(line.slice(6));
        onEvent(data);
        
        if (data.status === 'factory:complete') {
          result = {
            success: true,
            projectId: data.projectId,
            downloadUrl: data.downloadUrl,
            manifests: data.manifests,
          };
        } else if (data.status === 'factory:error') {
          result = {
            success: false,
            error: data.error,
          };
        }
      } catch {
      }
    }
  }

  return result;
}

export async function downloadApplication(files: any[], projectName: string): Promise<Blob> {
  const response = await fetch(`${API_BASE}/api/factory/download-application`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files, projectName }),
  });
  if (!response.ok) {
    throw new Error(`Download failed: ${response.statusText}`);
  }
  return response.blob();
}
