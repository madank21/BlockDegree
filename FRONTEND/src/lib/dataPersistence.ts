import { User, DegreeApplication, UploadedDocument } from '../types';

/**
 * Data Persistence Layer
 * Handles local and remote storage of user data, documents, and credentials
 * with backup and sync capabilities
 */

const DATA_STORE_PREFIX = 'blockdegree_';
const USER_DATA_KEY = `${DATA_STORE_PREFIX}users`;
const DOCUMENT_DATA_KEY = `${DATA_STORE_PREFIX}documents`;
const DEGREE_DATA_KEY = `${DATA_STORE_PREFIX}degrees`;
const BACKUP_KEY = `${DATA_STORE_PREFIX}backup`;
const LAST_SYNC_KEY = `${DATA_STORE_PREFIX}last_sync`;

interface StorageStats {
  totalSize: number;
  userDataSize: number;
  documentDataSize: number;
  degreeDataSize: number;
  lastBackup: string | null;
  lastSync: string | null;
}

/**
 * User Data Persistence Manager
 */
export const UserDataManager = {
  /**
   * Save user profile to storage
   */
  saveUser(user: User): void {
    try {
      const users = this.getAllUsers();
      const index = users.findIndex(u => u.id === user.id);
      
      if (index >= 0) {
        users[index] = user;
      } else {
        users.push(user);
      }
      
      localStorage.setItem(USER_DATA_KEY, JSON.stringify(users));
      this.updateLastSync();
    } catch (err) {
      console.error('Error saving user:', err);
      // ignore

    }
  },

  /**
   * Get user by ID
   */
  getUser(userId: string): User | null {
    try {
      const users = this.getAllUsers();
      return users.find(u => u.id === userId) || null;
    } catch (err) {
      console.error('Error getting user:', err);
      return null;
    }
  },

  /**
   * Get all users
   */
  getAllUsers(): User[] {
    try {
      const stored = localStorage.getItem(USER_DATA_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (err) {
      console.error('Error reading users:', err);
      return [];
    }
  },

  /**
   * Delete user data
   */
  deleteUser(userId: string): void {
    try {
      const users = this.getAllUsers().filter(u => u.id !== userId);
      localStorage.setItem(USER_DATA_KEY, JSON.stringify(users));
      
      // Also delete associated documents and degrees
      DocumentManager.deleteUserDocuments(userId);
      DegreeManager.deleteUserDegrees(userId);
    } catch (err) {
      console.error('Error deleting user:', err);
    }
  },

  updateLastSync(): void {
    localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
  },
};

/**
 * Document Data Persistence Manager
 */
export const DocumentManager = {
  /**
   * Save document for user
   */
  saveDocument(userId: string, doc: UploadedDocument): void {
    try {
      const docs = this.getUserDocuments(userId);
      const index = docs.findIndex(d => d.id === doc.id);
      
      if (index >= 0) {
        docs[index] = doc;
      } else {
        docs.push(doc);
      }
      
      const allDocs = this.getAllDocuments();
      allDocs[userId] = docs;
      
      localStorage.setItem(DOCUMENT_DATA_KEY, JSON.stringify(allDocs));
      UserDataManager.updateLastSync();
    } catch (err) {
      console.error('Error saving document:', err);
      this.handleStorageError(err);
    }
  },

  /**
   * Get documents for user
   */
  getUserDocuments(userId: string): UploadedDocument[] {
    try {
      const stored = localStorage.getItem(DOCUMENT_DATA_KEY);
      const allDocs = stored ? JSON.parse(stored) : {};
      return allDocs[userId] || [];
    } catch (err) {
      console.error('Error reading documents:', err);
      return [];
    }
  },

  /**
   * Get document by ID
   */
  getDocument(userId: string, docId: string): UploadedDocument | null {
    try {
      const docs = this.getUserDocuments(userId);
      return docs.find(d => d.id === docId) || null;
    } catch (err) {
      console.error('Error getting document:', err);
      return null;
    }
  },

  /**
   * Delete document
   */
  deleteDocument(userId: string, docId: string): void {
    try {
      const docs = this.getUserDocuments(userId).filter(d => d.id !== docId);
      const allDocs = this.getAllDocuments();
      allDocs[userId] = docs;
      
      localStorage.setItem(DOCUMENT_DATA_KEY, JSON.stringify(allDocs));
      UserDataManager.updateLastSync();
    } catch (err) {
      console.error('Error deleting document:', err);
    }
  },

  /**
   * Delete all documents for user
   */
  deleteUserDocuments(userId: string): void {
    try {
      const allDocs = this.getAllDocuments();
      delete allDocs[userId];
      localStorage.setItem(DOCUMENT_DATA_KEY, JSON.stringify(allDocs));
    } catch (err) {
      console.error('Error deleting user documents:', err);
    }
  },

  getAllDocuments(): Record<string, UploadedDocument[]> {
    try {
      const stored = localStorage.getItem(DOCUMENT_DATA_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (err) {
      console.error('Error reading all documents:', err);
      return {};
    }
  },

  handleStorageError(err: any): void {
    if (err.name === 'QuotaExceededError') {
      console.warn('Storage quota exceeded. Consider clearing old documents.');
    }
  },
};

/**
 * Degree Data Persistence Manager
 */
export const DegreeManager = {
  /**
   * Save degree application
   */
  saveDegree(degree: DegreeApplication): void {
    try {
      const degrees = this.getAllDegrees();
      const index = degrees.findIndex(d => d.id === degree.id);
      
      if (index >= 0) {
        degrees[index] = degree;
      } else {
        degrees.push(degree);
      }
      
      localStorage.setItem(DEGREE_DATA_KEY, JSON.stringify(degrees));
      UserDataManager.updateLastSync();
    } catch (err) {
      console.error('Error saving degree:', err);
      this.handleStorageError(err);
    }
  },

  /**
   * Get degree by ID
   */
  getDegree(degreeId: string): DegreeApplication | null {
    try {
      const degrees = this.getAllDegrees();
      return degrees.find(d => d.id === degreeId || d.degreeId === degreeId) || null;
    } catch (err) {
      console.error('Error getting degree:', err);
      return null;
    }
  },

  /**
   * Get user's degrees
   */
  getUserDegrees(userId: string): DegreeApplication[] {
    try {
      const degrees = this.getAllDegrees();
      return degrees.filter(d => d.studentId === userId);
    } catch (err) {
      console.error('Error getting user degrees:', err);
      return [];
    }
  },

  /**
   * Get all degrees
   */
  getAllDegrees(): DegreeApplication[] {
    try {
      const stored = localStorage.getItem(DEGREE_DATA_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (err) {
      console.error('Error reading degrees:', err);
      return [];
    }
  },

  /**
   * Delete degree
   */
  deleteDegree(degreeId: string): void {
    try {
      const degrees = this.getAllDegrees().filter(d => d.id !== degreeId);
      localStorage.setItem(DEGREE_DATA_KEY, JSON.stringify(degrees));
    } catch (err) {
      console.error('Error deleting degree:', err);
    }
  },

  /**
   * Delete all degrees for user
   */
  deleteUserDegrees(userId: string): void {
    try {
      const degrees = this.getAllDegrees().filter(d => d.studentId !== userId);
      localStorage.setItem(DEGREE_DATA_KEY, JSON.stringify(degrees));
    } catch (err) {
      console.error('Error deleting user degrees:', err);
    }
  },

  handleStorageError(err: any): void {
    if (err.name === 'QuotaExceededError') {
      console.warn('Storage quota exceeded for degrees.');
    }
  },
};

/**
 * Backup and Recovery Manager
 */
export const BackupManager = {
  /**
   * Create full backup of all data.
   * Note: The app state is primarily persisted by src/store.ts under STORAGE_KEY='blockdegree_store'.
   * This backup therefore serializes that same state to avoid persistence drift.
   */

  createBackup(): { success: boolean; timestamp: string; size: number } {
    try {
      const appStateRaw = localStorage.getItem('blockdegree_store');
      const backup = {
        timestamp: new Date().toISOString(),
        data: {
          // Preserve exact UI state used by the app
          appStoreState: appStateRaw ? JSON.parse(appStateRaw) : null,

          // Also include the normalized managers as extra fallback
          users: UserDataManager.getAllUsers(),
          documents: DocumentManager.getAllDocuments(),
          degrees: DegreeManager.getAllDegrees(),
        },
      };


      const backupStr = JSON.stringify(backup);
      localStorage.setItem(BACKUP_KEY, backupStr);
      
      console.log('✓ Backup created successfully');
      return {
        success: true,
        timestamp: backup.timestamp,
        size: backupStr.length,
      };
    } catch (err) {
      console.error('Error creating backup:', err);
      return { success: false, timestamp: '', size: 0 };
    }
  },

  /**
   * Restore from backup
   */
  restoreBackup(): boolean {
    try {
      const backupStr = localStorage.getItem(BACKUP_KEY);
      if (!backupStr) {
        console.warn('No backup found');
        return false;
      }

      const backup = JSON.parse(backupStr);
      
      localStorage.setItem(USER_DATA_KEY, JSON.stringify(backup.data.users));
      localStorage.setItem(DOCUMENT_DATA_KEY, JSON.stringify(backup.data.documents));
      localStorage.setItem(DEGREE_DATA_KEY, JSON.stringify(backup.data.degrees));
      
      console.log('✓ Data restored from backup');
      return true;
    } catch (err) {
      console.error('Error restoring backup:', err);
      return false;
    }
  },

  /**
   * Export all data as JSON file
   */
  exportAllData(): void {
    try {
      const exportData = {
        exportDate: new Date().toISOString(),
        version: '1.0',
        data: {
          users: UserDataManager.getAllUsers(),
          documents: DocumentManager.getAllDocuments(),
          degrees: DegreeManager.getAllDegrees(),
        },
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `blockdegree-backup-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting data:', err);
    }
  },

  /**
   * Import data from JSON file
   */
  importData(file: File): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const importedData = JSON.parse(e.target?.result as string);
            
            localStorage.setItem(USER_DATA_KEY, JSON.stringify(importedData.data.users));
            localStorage.setItem(DOCUMENT_DATA_KEY, JSON.stringify(importedData.data.documents));
            localStorage.setItem(DEGREE_DATA_KEY, JSON.stringify(importedData.data.degrees));
            
            UserDataManager.updateLastSync();
            console.log('✓ Data imported successfully');
            resolve(true);
          } catch (err) {
            console.error('Error parsing imported data:', err);
            resolve(false);
          }
        };
        reader.readAsText(file);
      } catch (err) {
        console.error('Error reading file:', err);
        resolve(false);
      }
    });
  },
};

/**
 * Storage Statistics and Management
 */
export const StorageManager = {
  /**
   * Get storage statistics
   */
  getStorageStats(): StorageStats {
    const getUserDataSize = () => {
      const data = localStorage.getItem(USER_DATA_KEY);
      return data ? new Blob([data]).size : 0;
    };

    const getDocumentDataSize = () => {
      const data = localStorage.getItem(DOCUMENT_DATA_KEY);
      return data ? new Blob([data]).size : 0;
    };

    const getDegreeDataSize = () => {
      const data = localStorage.getItem(DEGREE_DATA_KEY);
      return data ? new Blob([data]).size : 0;
    };

    const userDataSize = getUserDataSize();
    const documentDataSize = getDocumentDataSize();
    const degreeDataSize = getDegreeDataSize();

    return {
      totalSize: userDataSize + documentDataSize + degreeDataSize,
      userDataSize,
      documentDataSize,
      degreeDataSize,
      lastBackup: localStorage.getItem(BACKUP_KEY) ? 
        JSON.parse(localStorage.getItem(BACKUP_KEY)!).timestamp : null,
      lastSync: localStorage.getItem(LAST_SYNC_KEY),
    };
  },

  /**
   * Get estimated storage usage percentage
   */
  getStoragePercentage(): number {
    const stats = this.getStorageStats();
    // Typical browser localStorage limit is 5-10MB, use 5MB as estimate
    const limit = 5 * 1024 * 1024;
    return Math.round((stats.totalSize / limit) * 100);
  },

  /**
   * Clear old data (documents older than X days)
   */
  clearOldDocuments(daysOld: number = 90): number {
    try {
      const allDocs = DocumentManager.getAllDocuments();
      let deletedCount = 0;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      for (const userId in allDocs) {
        const filteredDocs = allDocs[userId].filter(doc => {
          const uploadDate = new Date(doc.uploadedAt);
          return uploadDate > cutoffDate;
        });
        
        if (filteredDocs.length < allDocs[userId].length) {
          deletedCount += allDocs[userId].length - filteredDocs.length;
          allDocs[userId] = filteredDocs;
        }
      }

      if (deletedCount > 0) {
        localStorage.setItem(DOCUMENT_DATA_KEY, JSON.stringify(allDocs));
        console.log(`✓ Deleted ${deletedCount} old documents`);
      }

      return deletedCount;
    } catch (err) {
      console.error('Error clearing old documents:', err);
      return 0;
    }
  },

  /**
   * Get storage warning
   */
  getStorageWarning(): string | null {
    const percentage = this.getStoragePercentage();
    
    if (percentage > 90) {
      return '⚠️  Storage nearly full (90%+). Please export and clear old data.';
    } else if (percentage > 70) {
      return '⚠️  Storage usage high (70%+). Consider backing up data.';
    }
    
    return null;
  },

  /**
   * Verify data integrity
   */
  verifyDataIntegrity(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      // Verify users
      const users = UserDataManager.getAllUsers();
      if (!Array.isArray(users)) {
        errors.push('Users data is not an array');
      }

      // Verify documents
      const docs = DocumentManager.getAllDocuments();
      if (typeof docs !== 'object') {
        errors.push('Documents data is not an object');
      }

      // Verify degrees
      const degrees = DegreeManager.getAllDegrees();
      if (!Array.isArray(degrees)) {
        errors.push('Degrees data is not an array');
      }

      return {
        isValid: errors.length === 0,
        errors,
      };
    } catch (err) {
      return {
        isValid: false,
        errors: [`Data integrity check failed: ${err}`],
      };
    }
  },
};
