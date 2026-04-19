/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Role = 'employee' | 'hr';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface SignalData {
  risk_level: number;
  primary_emotion: string;
  topic_tags: string[];
  escalation_recommended: boolean;
  mascot_mood: 'happy' | 'neutral' | 'stressed' | 'sad';
  session_summary_update: string;
}
