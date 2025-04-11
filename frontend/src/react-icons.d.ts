declare module 'react-icons/fa' {
  import { IconType } from 'react-icons';
  
  export const FaHeart: IconType;
  export const FaRegHeart: IconType;
  export const FaBookmark: IconType;
  export const FaRegBookmark: IconType;
  export const FaCheck: IconType;
  export const FaSearch: IconType;
  export const FaChevronDown: IconType;
}

declare module 'react-icons' {
  import { ComponentType, SVGAttributes } from 'react';
  
  export interface IconBaseProps extends SVGAttributes<SVGElement> {
    size?: string | number;
    color?: string;
    title?: string;
  }
  
  export type IconType = ComponentType<IconBaseProps>;
} 