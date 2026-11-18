import { Box } from '@mui/material';
import type { CroprithmProduceListing } from '../api/fetchCroprithmProduce';

const artwork = [
  { crop: /\b(tomato|tomatoes)\b/i, symbol: '🍅', background: '#f7e7dc' },
  { crop: /\b(carrot|carrots)\b/i, symbol: '🥕', background: '#f7ead5' },
  { crop: /\b(spinach|lettuce|kale|chard|arugula|greens|cabbage)\b/i, symbol: '🥬', background: '#e7eddc' },
  { crop: /\b(onion|onions|shallot|shallots)\b/i, symbol: '🧅', background: '#f1e7eb' },
  { crop: /\b(potato|potatoes)\b/i, symbol: '🥔', background: '#f3eadb' },
  { crop: /\b(corn)\b/i, symbol: '🌽', background: '#f4edd4' },
  { crop: /\b(pepper|peppers)\b/i, symbol: '🫑', background: '#e6ecdb' },
  { crop: /\b(apple|apples)\b/i, symbol: '🍎', background: '#f7e4df' },
  { crop: /\b(strawberry|strawberries)\b/i, symbol: '🍓', background: '#f7e5e9' },
  { crop: /\b(broccoli)\b/i, symbol: '🥦', background: '#e4ebdf' },
  { crop: /\b(cucumber|cucumbers)\b/i, symbol: '🥒', background: '#e4ebdf' },
  { crop: /\b(mushroom|mushrooms)\b/i, symbol: '🍄', background: '#f4e7df' },
];

export default function ProduceArtwork({ produce, illustration }: { produce: string; illustration?: CroprithmProduceListing['illustration'] }) {
  const { symbol, background } = illustration ?? artwork.find(item => item.crop.test(produce))
    ?? { symbol: '🌱', background: '#e7eddc' };

  return <Box aria-hidden="true" sx={{
    aspectRatio: '4 / 3', display: 'grid', placeItems: 'center', overflow: 'hidden',
    bgcolor: background, backgroundImage: 'radial-gradient(circle at 50% 40%, #ffffffa6 0%, transparent 62%)',
  }}>
    <Box component="span" sx={{ fontSize: 'clamp(3rem, 8vw, 6rem)', lineHeight: 1, filter: 'drop-shadow(0 10px 12px #50361a26)' }}>
      {symbol}
    </Box>
  </Box>;
}
