export interface CartItem {
  productId: string;
  name: string;
  price: number;
  currency: string;
  imageUrl: string | null;
  quantity: number;
}
