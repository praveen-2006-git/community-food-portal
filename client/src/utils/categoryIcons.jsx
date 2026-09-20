import React from 'react';
import {
  Carrot,
  Croissant,
  UtensilsCrossed,
  Package,
  Milk,
  Boxes,
  Coffee,
  ShoppingBag,
  Thermometer,
  Snowflake
} from 'lucide-react';

export function getCategoryIcon(category, size = 14) {
  const cat = (category || '').toLowerCase();
  switch (cat) {
    case 'produce':
      return <Carrot size={size} />;
    case 'bakery':
      return <Croissant size={size} />;
    case 'dairy':
      return <Milk size={size} />;
    case 'prepared':
      return <UtensilsCrossed size={size} />;
    case 'grains':
      return <Boxes size={size} />;
    case 'canned':
      return <Package size={size} />;
    case 'beverages':
      return <Coffee size={size} />;
    default:
      return <ShoppingBag size={size} />;
  }
}

export function CategoryChip({ category }) {
  if (!category) return null;
  return (
    <span className="food-category-chip">
      {getCategoryIcon(category, 12)}
      <span>{category}</span>
    </span>
  );
}

export function StorageChip({ condition }) {
  const cond = (condition || '').toLowerCase();
  const isChilled = cond === 'chilled' || cond === 'refrigerated' || cond === 'frozen';

  if (isChilled) {
    return (
      <span className="cold-chain-chip-chilled">
        <Snowflake size={12} />
        <span>Chilled</span>
      </span>
    );
  }

  return (
    <span className="cold-chain-chip-ambient">
      <Thermometer size={12} />
      <span>Ambient</span>
    </span>
  );
}
