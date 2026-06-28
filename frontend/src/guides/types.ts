import { LucideIcon } from 'lucide-react';

export interface GuideSection {
  icon: string;
  heading: string;
  content: string;
}

export interface Guide {
  title: string;
  icon: string;
  sections: GuideSection[];
}
