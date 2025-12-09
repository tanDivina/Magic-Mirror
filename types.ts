export interface AnalysisResult {
  objectName: string;
  creativeAngle: string;
}

export enum AppState {
  IDLE = 'IDLE',
  CAMERA_ACTIVE = 'CAMERA_ACTIVE',
  CAPTURING = 'CAPTURING',
  PROCESSING = 'PROCESSING',
  RESULT = 'RESULT',
}

export interface GenerationConfig {
  blackAndWhite: boolean;
  strictPose: boolean;
  keepFace: boolean;
  lockLocation: boolean;
  lockProduct: boolean;
}

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
  }
}