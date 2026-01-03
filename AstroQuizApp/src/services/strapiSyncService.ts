/**
 * Strapi Sync Service
 * Synchronizes user game data between Firebase Auth and Strapi backend
 */

import api from './api';
import { GameStats } from '@/types';

interface UserProfile {
  id: number;
  firebaseUid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  totalXP: number;
  phasesCompleted: number;
  perfectPhases: number;
  totalQuestionsAnswered: number;
  totalCorrectAnswers: number;
  maxStreak: number;
  currentStreak: number;
  fastAnswers: number;
  achievements: string[];
  phaseStats: Record<number, any>;
  lastSyncedAt: string;
}

class StrapiSyncService {
  /**
   * Sync user with Strapi after Firebase authentication
   * Creates profile if doesn't exist, updates if it does
   */
  async syncUser(
    firebaseUid: string,
    email: string | null,
    displayName: string | null,
    photoURL: string | null
  ): Promise<UserProfile> {
    try {
      const response = await api.post<{ success: boolean; data: UserProfile }>(
        '/user-profile/sync',
        {
          firebaseUid,
          email,
          displayName,
          photoURL,
        }
      );

      return response.data;
    } catch (error) {
      console.error('❌ Error syncing user with Strapi:', error);
      throw error;
    }
  }

  /**
   * Get user stats from Strapi
   */
  async getUserStats(firebaseUid: string): Promise<UserProfile> {
    try {
      const response = await api.get<{ success: boolean; data: UserProfile }>(
        `/user-profile/${firebaseUid}/stats`
      );

      return response.data;
    } catch (error) {
      console.error('❌ Error getting user stats:', error);
      throw error;
    }
  }

  /**
   * Update user stats in Strapi
   */
  async updateUserStats(
    firebaseUid: string,
    stats: Partial<GameStats>
  ): Promise<UserProfile> {
    try {
      const response = await api.put<{ success: boolean; data: UserProfile }>(
        `/user-profile/${firebaseUid}/stats`,
        stats
      );

      return response.data;
    } catch (error) {
      console.error('❌ Error updating user stats:', error);
      throw error;
    }
  }

  /**
   * Merge local stats with server stats (conflict resolution)
   * Strategy: Take the maximum values for most fields
   */
  mergeStats(localStats: GameStats, serverStats: Partial<GameStats>): GameStats {
    return {
      totalXP: Math.max(localStats.totalXP, serverStats.totalXP || 0),
      phasesCompleted: Math.max(localStats.phasesCompleted, serverStats.phasesCompleted || 0),
      perfectPhases: Math.max(localStats.perfectPhases, serverStats.perfectPhases || 0),
      totalQuestionsAnswered: Math.max(
        localStats.totalQuestionsAnswered,
        serverStats.totalQuestionsAnswered || 0
      ),
      totalCorrectAnswers: Math.max(
        localStats.totalCorrectAnswers,
        serverStats.totalCorrectAnswers || 0
      ),
      maxStreak: Math.max(localStats.maxStreak, serverStats.maxStreak || 0),
      currentStreak: localStats.currentStreak, // Use local (more recent)
      fastAnswers: Math.max(localStats.fastAnswers, serverStats.fastAnswers || 0),
      achievements: Array.from(
        new Set([...(localStats.achievements || []), ...(serverStats.achievements || [])])
      ),
      phaseStats: {
        ...serverStats.phaseStats,
        ...localStats.phaseStats, // Local wins for individual phase stats
      },
    };
  }
}

export default new StrapiSyncService();
