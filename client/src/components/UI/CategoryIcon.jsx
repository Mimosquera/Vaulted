import { createElement } from 'react';
import { getCategoryIconComponent } from '../../utils/helpers';

export default function CategoryIcon({ category, size = 20, weight = 'duotone', ...props }) {
  const Icon = getCategoryIconComponent(category);
  return createElement(Icon, { weight, size, ...props });
}
