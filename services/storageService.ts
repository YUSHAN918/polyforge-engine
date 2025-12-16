import { ProjectSaveData } from '../types';

const STORAGE_KEY = 'polyforge_project_data';
const CURRENT_VERSION = '1.0.0';

/**
 * StorageService - Handles project data persistence
 */

/**
 * Export project data as downloadable JSON file
 */
export function exportToFile(data: ProjectSaveData, filename: string): void {
  try {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.json') ? filename : `${filename}.json`;
    document.body.appendChild(link);
    link.click();
    
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to export file:', error);
    throw new Error('Failed to export project data');
  }
}

/**
 * Import project data from uploaded JSON file
 */
export async function importFromFile(file: File): Promise<ProjectSaveData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content) as ProjectSaveData;
        
        // Basic validation
        if (!data.metadata) {
          throw new Error('Invalid file format: missing metadata');
        }
        
        if (!data.metadata.version) {
          throw new Error('Invalid file format: missing version');
        }
        
        if (!data.hero) {
          throw new Error('Invalid file format: missing hero data');
        }
        
        // Version compatibility check (for future use)
        const fileVersion = data.metadata.version;
        if (fileVersion !== CURRENT_VERSION) {
          console.warn(`File version ${fileVersion} differs from current version ${CURRENT_VERSION}`);
          // Future: Add migration logic here if needed
        }
        
        resolve(data);
      } catch (error) {
        if (error instanceof Error) {
          reject(new Error(`Failed to parse file: ${error.message}`));
        } else {
          reject(new Error('Failed to parse file: unknown error'));
        }
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
}

/**
 * Save project data to LocalStorage
 */
export function saveToLocal(data: ProjectSaveData): void {
  try {
    const jsonString = JSON.stringify(data);
    localStorage.setItem(STORAGE_KEY, jsonString);
  } catch (error) {
    console.error('Failed to save to LocalStorage:', error);
    throw new Error('Failed to save project data locally');
  }
}

/**
 * Load project data from LocalStorage
 */
export function loadFromLocal(): ProjectSaveData | null {
  try {
    const jsonString = localStorage.getItem(STORAGE_KEY);
    
    if (!jsonString) {
      return null;
    }
    
    const data = JSON.parse(jsonString) as ProjectSaveData;
    
    // Basic validation
    if (!data.metadata || !data.hero) {
      console.warn('Invalid cached data format, clearing cache');
      clearLocal();
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Failed to load from LocalStorage:', error);
    clearLocal();
    return null;
  }
}

/**
 * Clear LocalStorage cache
 */
export function clearLocal(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear LocalStorage:', error);
  }
}

/**
 * Check if LocalStorage has cached data
 */
export function hasLocalCache(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null;
}
