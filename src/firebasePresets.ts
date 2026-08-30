export interface FirebasePreset {
  id: string;
  name: string;
  badge: string;
  badgeColor: string;
  description: string;
  config: {
    projectId: string;
    appId: string;
    apiKey: string;
    authDomain: string;
    firestoreDatabaseId: string;
    storageBucket: string;
    messagingSenderId: string;
    measurementId?: string;
    oAuthClientId?: string;
  };
}

export const FIREBASE_PRESETS: FirebasePreset[] = [
  {
    id: "banco-01",
    name: "Banco de Dados Principal (Banco 01)",
    badge: "Principal",
    badgeColor: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
    description: "banco-01-34be4 (Banco de Dados Principal 01)",
    config: {
      projectId: "banco-01-34be4",
      appId: "1:769319279792:web:0b1f64349b2a2b482aaf75",
      apiKey: "AIzaSyAxVFlljdf_QXhVgqoYbTjPJXnzLIhHCTw",
      authDomain: "banco-01-34be4.firebaseapp.com",
      firestoreDatabaseId: "(default)",
      storageBucket: "banco-01-34be4.firebasestorage.app",
      messagingSenderId: "769319279792",
      measurementId: "",
      oAuthClientId: ""
    }
  }
];

export function getActivePresetId(projectId?: string): string {
  return "banco-01";
}

