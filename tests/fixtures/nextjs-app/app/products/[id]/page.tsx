export default function ProductDetail({ params }: { params: { id: string } }) {
  return (
    <div>
      <h1>Product Detail</h1>
      <button>Add to cart</button>
      <button>Buy now</button>
      <a href="/products">Back to products</a>
    </div>
  );
}
