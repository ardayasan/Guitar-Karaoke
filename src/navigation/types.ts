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
  TestScreen: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
