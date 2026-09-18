import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useOpportunitiesStore } from '../stores/useOpportunitiesStore'

function Home() {
  const items = useOpportunitiesStore((state) => state.items)
  const loading = useOpportunitiesStore((state) => state.loading)
  const fetchOpportunities = useOpportunitiesStore((state) => state.fetchOpportunities)

  useEffect(() => {
    fetchOpportunities()
  }, [fetchOpportunities])

  if (loading) {
    return <p className="p-4 text-center">carregando...</p>
  }

  if (items.length === 0) {
    return <p className="p-4 text-center">nenhuma oportunidade encontrada</p>
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Oportunidades</h1>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.id} className="border rounded p-3">
            <Link to={`/produto/${item.id}`}>
              <p className="font-semibold">{item.title}</p>
              <p>R$ {item.price}</p>
              <p className="text-sm text-gray-500">{item.opportunity_level}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default Home
