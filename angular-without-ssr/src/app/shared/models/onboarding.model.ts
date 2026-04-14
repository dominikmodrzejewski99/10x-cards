export interface TourStep {
  id: string;
  targetSelector: string;
  mobileTargetSelector: string;
  titleKey: string;
  descriptionKey: string;
  icon: string;
  iconColor: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  mobilePosition: 'top' | 'bottom' | 'left' | 'right';
  spotlightPadding?: number;
  route?: string;
}
