import { IconType } from 'react-icons';
import { ComponentType } from 'react';

// 扩展 IconType 类型，使其可以作为 JSX 元素使用
declare module 'react-icons/fa' {
  export const FaBars: ComponentType;
  export const FaSun: ComponentType;
  export const FaMoon: ComponentType;
  export const FaRobot: ComponentType;
  export const FaUser: ComponentType;
  export const FaPlus: ComponentType;
  export const FaTrash: ComponentType;
  export const FaLightbulb: ComponentType;
  export const FaFileAlt: ComponentType;
  export const FaGlobe: ComponentType;
  export const FaSearch: ComponentType;
  export const FaTimes: ComponentType;
  export const FaPaperPlane: ComponentType;
  export const FaRegSmile: ComponentType;
  export const FaImage: ComponentType;
  export const FaMicrophone: ComponentType;
  export const FaSignInAlt: ComponentType;
  export const FaLock: ComponentType;
  export const FaEnvelope: ComponentType;
  export const FaUserPlus: ComponentType;
} 