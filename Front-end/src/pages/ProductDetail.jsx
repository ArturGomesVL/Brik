import { useParams } from 'react-router-dom'

function ProductDetail() {
  const { id } = useParams()

  return (
    <div className="p-4">
      <p>Produto: {id}</p>
    </div>
  )
}

export default ProductDetail
