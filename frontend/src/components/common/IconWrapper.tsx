import React from 'react';
import { IconType } from 'react-icons';
import { IconBaseProps } from 'react-icons/lib';

interface IconWrapperProps {
  icon: IconType;
  className?: string;
}

// 这个组件用于包装 react-icons 图标，解决类型错误问题
const IconWrapper: React.FC<IconWrapperProps> = ({ icon: Icon, className }) => {
  return (
    <span className={className}>
      <Icon />
    </span>
  );
};

export default IconWrapper; 