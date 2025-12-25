/**
 * Navigation types and parameters
 */

import { Tablature } from '@/types';

export type RootStackParamList = {
  Home: undefined;
  Library: undefined;
  Practice: {
    tab: Tablature;
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
