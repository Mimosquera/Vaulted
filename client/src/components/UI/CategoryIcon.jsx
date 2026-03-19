import { getCategoryIconComponent } from '../../utils/helpers';

export default function CategoryIcon({ category, size = 20, weight = 'duotone', ...props }) {
  const Icon = getCategoryIconComponent(category);
  return <Icon weight={weight} size={size} {...props} />;
}
