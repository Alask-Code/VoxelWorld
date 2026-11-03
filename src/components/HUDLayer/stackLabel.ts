import { itemName } from '../../domain/content';
import { ItemStack } from '../../domain/world';

export default function stackLabel(stack: ItemStack | null): string {
  if (!stack) return '';
  return itemName(stack.itemId);
}
