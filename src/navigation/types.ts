/**
 * Navigation types and parameters
 */

import { Tablature } from '@/types';
import { PracticeTab } from '@/types/practice/PracticeTab';

export type RootStackParamList = {
  Home: undefined;
  Library: undefined;
  Practice: {
    tab: PracticeTab;
  };
  Settings: undefined;
  Information: undefined;
  DetectionTest: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
